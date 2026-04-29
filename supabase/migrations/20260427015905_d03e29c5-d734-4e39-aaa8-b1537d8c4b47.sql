-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('donor', 'hospital', 'admin');
CREATE TYPE public.blood_group AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
CREATE TYPE public.urgency_level AS ENUM ('low','medium','high','critical');
CREATE TYPE public.request_status AS ENUM ('open','in_progress','closed','cancelled');
CREATE TYPE public.notification_status AS ENUM ('sent','accepted','rejected','expired');
CREATE TYPE public.notification_type AS ENUM ('emergency','info');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  hospital_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ============ DONOR PROFILES ============
CREATE TABLE public.donor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group blood_group NOT NULL,
  last_donation_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  health_status TEXT DEFAULT 'good',
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;

-- ============ EMERGENCY REQUESTS ============
CREATE TABLE public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group blood_group NOT NULL,
  units_required INTEGER NOT NULL DEFAULT 1,
  urgency_level urgency_level NOT NULL DEFAULT 'high',
  patient_info TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status request_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_emergency_status ON public.emergency_requests(status);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_id UUID REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'emergency',
  status notification_status NOT NULL DEFAULT 'sent',
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============ DONATIONS ============
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  donation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_given INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS: updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_donor_profiles_updated BEFORE UPDATE ON public.donor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_emergency_updated BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'donor');

  INSERT INTO public.profiles (id, name, phone, latitude, longitude, hospital_name)
  VALUES (
    NEW.id,
    v_name,
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'latitude','')::DOUBLE PRECISION,
    NULLIF(NEW.raw_user_meta_data->>'longitude','')::DOUBLE PRECISION,
    NEW.raw_user_meta_data->>'hospital_name'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  IF v_role = 'donor' AND NEW.raw_user_meta_data->>'blood_group' IS NOT NULL THEN
    INSERT INTO public.donor_profiles (user_id, blood_group)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'blood_group')::blood_group);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MATCHING FUNCTION (Haversine) ============
CREATE OR REPLACE FUNCTION public.match_donors(_emergency_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone TEXT,
  blood_group blood_group,
  last_donation_date DATE,
  distance_km DOUBLE PRECISION
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH e AS (
    SELECT blood_group, latitude, longitude FROM public.emergency_requests WHERE id = _emergency_id
  )
  SELECT
    p.id AS user_id,
    p.name,
    p.phone,
    dp.blood_group,
    dp.last_donation_date,
    (6371 * acos(
      cos(radians((SELECT latitude FROM e))) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians((SELECT longitude FROM e))) +
      sin(radians((SELECT latitude FROM e))) * sin(radians(p.latitude))
    )) AS distance_km
  FROM public.donor_profiles dp
  JOIN public.profiles p ON p.id = dp.user_id
  WHERE dp.blood_group = (SELECT blood_group FROM e)
    AND dp.is_available = true
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (dp.last_donation_date IS NULL OR dp.last_donation_date < CURRENT_DATE - INTERVAL '90 days')
  ORDER BY distance_km ASC, dp.last_donation_date ASC NULLS FIRST
  LIMIT 5;
$$;

-- ============ NOTIFY-MATCHED-DONORS RPC (creates notifications) ============
CREATE OR REPLACE FUNCTION public.notify_matched_donors(_emergency_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec RECORD;
  cnt INTEGER := 0;
  e_msg TEXT;
BEGIN
  SELECT 'Urgent: ' || urgency_level || ' need for ' || blood_group || ' blood (' || units_required || ' units)'
  INTO e_msg FROM public.emergency_requests WHERE id = _emergency_id;

  FOR rec IN SELECT * FROM public.match_donors(_emergency_id) LOOP
    INSERT INTO public.notifications (user_id, emergency_id, message, type, distance_km)
    VALUES (rec.user_id, _emergency_id, e_msg, 'emergency', rec.distance_km);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- ============ RESPOND TO NOTIFICATION RPC ============
CREATE OR REPLACE FUNCTION public.respond_to_notification(_notification_id UUID, _accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n RECORD;
BEGIN
  SELECT * INTO n FROM public.notifications WHERE id = _notification_id AND user_id = auth.uid();
  IF n IS NULL THEN RAISE EXCEPTION 'Notification not found'; END IF;

  UPDATE public.notifications SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END::notification_status,
    responded_at = now() WHERE id = _notification_id;

  IF _accept THEN
    UPDATE public.emergency_requests SET status = 'in_progress' WHERE id = n.emergency_id AND status = 'open';
    UPDATE public.donor_profiles SET is_available = false, last_donation_date = CURRENT_DATE,
      reward_points = reward_points + 50 WHERE user_id = auth.uid();
    INSERT INTO public.donations (donor_id, hospital_id, emergency_id, reward_given)
    SELECT auth.uid(), er.hospital_id, er.id, 50 FROM public.emergency_requests er WHERE er.id = n.emergency_id;
  END IF;
END;
$$;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- donor_profiles
CREATE POLICY "donor_select_all" ON public.donor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "donor_update_own" ON public.donor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "donor_insert_own" ON public.donor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- emergency_requests
CREATE POLICY "emergency_select_authenticated" ON public.emergency_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "emergency_insert_hospital" ON public.emergency_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = hospital_id AND public.has_role(auth.uid(),'hospital'));
CREATE POLICY "emergency_update_hospital" ON public.emergency_requests FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);

-- notifications
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_select_hospital" ON public.notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.emergency_requests er WHERE er.id = notifications.emergency_id AND er.hospital_id = auth.uid()));

-- donations
CREATE POLICY "donations_select_donor" ON public.donations FOR SELECT TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "donations_select_hospital" ON public.donations FOR SELECT TO authenticated USING (auth.uid() = hospital_id);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;