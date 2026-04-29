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
REVOKE EXECUTE ON FUNCTION public.match_donors(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_matched_donors(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.respond_to_notification(UUID, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.match_donors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_matched_donors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_notification(UUID, BOOLEAN) TO authenticated;
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_insert_own" ON public.badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  donation_id UUID,
  certificate_code TEXT NOT NULL UNIQUE DEFAULT ('LL-' || upper(substring(md5(random()::text), 1, 10))),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select_own" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cert_select_public" ON public.certificates FOR SELECT TO anon USING (true);
CREATE POLICY "cert_insert_own" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DO $$ BEGIN CREATE TYPE organ_type AS ENUM ('kidney','liver','heart','lungs','pancreas','cornea','bone_marrow','skin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE organ_status AS ENUM ('registered','pending_approval','approved','matched','transplanted','withdrawn'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.organ_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organs organ_type[] NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  medical_notes TEXT,
  status organ_status NOT NULL DEFAULT 'registered',
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organ_pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pledge_select_own" ON public.organ_pledges FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'hospital') OR has_role(auth.uid(),'admin'));
CREATE POLICY "pledge_insert_own" ON public.organ_pledges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pledge_update_own" ON public.organ_pledges FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.organ_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL,
  organ organ_type NOT NULL,
  patient_info TEXT,
  urgency_level urgency_level NOT NULL DEFAULT 'high',
  status organ_status NOT NULL DEFAULT 'pending_approval',
  approved_by UUID,
  matched_pledge_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organ_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgreq_select_all_auth" ON public.organ_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgreq_insert_hospital" ON public.organ_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id AND has_role(auth.uid(),'hospital'));
CREATE POLICY "orgreq_update_hospital_admin" ON public.organ_requests FOR UPDATE TO authenticated USING (auth.uid() = hospital_id OR has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_pledge_upd ON public.organ_pledges;
CREATE TRIGGER trg_pledge_upd BEFORE UPDATE ON public.organ_pledges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orgreq_upd ON public.organ_requests;
CREATE TRIGGER trg_orgreq_upd BEFORE UPDATE ON public.organ_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.award_badges_on_donation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM public.donations WHERE donor_id = NEW.donor_id;
  IF total = 1 THEN INSERT INTO public.badges(user_id,name,tier) VALUES (NEW.donor_id,'First Drop','bronze') ON CONFLICT DO NOTHING; END IF;
  IF total = 5 THEN INSERT INTO public.badges(user_id,name,tier) VALUES (NEW.donor_id,'Lifesaver','silver') ON CONFLICT DO NOTHING; END IF;
  IF total = 10 THEN INSERT INTO public.badges(user_id,name,tier) VALUES (NEW.donor_id,'Hero','gold') ON CONFLICT DO NOTHING; END IF;
  IF total = 25 THEN INSERT INTO public.badges(user_id,name,tier) VALUES (NEW.donor_id,'Legend','platinum') ON CONFLICT DO NOTHING; END IF;
  INSERT INTO public.certificates(user_id, donation_id, metadata)
  VALUES (NEW.donor_id, NEW.id, jsonb_build_object('donation_number', total));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_badges ON public.donations;
CREATE TRIGGER trg_award_badges AFTER INSERT ON public.donations FOR EACH ROW EXECUTE FUNCTION public.award_badges_on_donation();

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.organ_requests; EXCEPTION WHEN duplicate_object THEN null; END $$;
-- Add hospital_id to organ_pledges
ALTER TABLE public.organ_pledges 
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_organ_pledges_hospital_id ON public.organ_pledges(hospital_id);

-- Update RLS policies so hospitals can view pledges assigned to them
DROP POLICY IF EXISTS "pledge_select_own" ON public.organ_pledges;

CREATE POLICY "pledge_select_own_or_hospital" ON public.organ_pledges 
FOR SELECT TO authenticated 
USING (
  auth.uid() = user_id 
  OR auth.uid() = hospital_id 
  OR has_role(auth.uid(), 'admin')
);

-- Allow hospitals to update the status of organ pledges assigned to them
CREATE POLICY "pledge_update_hospital" ON public.organ_pledges
FOR UPDATE TO authenticated
USING (auth.uid() = hospital_id)
WITH CHECK (auth.uid() = hospital_id);
-- Allow donors to create notifications when they accept public emergencies
CREATE POLICY "notif_insert_donor" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
-- Create RPC to handle public emergency acceptance securely
CREATE OR REPLACE FUNCTION public.accept_public_emergency(_emergency_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n_id UUID;
BEGIN
  -- Insert notification as accepted
  INSERT INTO public.notifications (user_id, emergency_id, message, type, status)
  VALUES (auth.uid(), _emergency_id, 'Donor accepted public emergency match', 'emergency', 'accepted')
  RETURNING id INTO n_id;

  -- Update emergency status
  UPDATE public.emergency_requests SET status = 'in_progress' WHERE id = _emergency_id AND status = 'open';
  
  -- Update donor profile
  UPDATE public.donor_profiles SET is_available = false, last_donation_date = CURRENT_DATE,
    reward_points = reward_points + 50 WHERE user_id = auth.uid();
    
  -- Insert donation record
  INSERT INTO public.donations (donor_id, hospital_id, emergency_id, reward_given)
  SELECT auth.uid(), er.hospital_id, er.id, 50 FROM public.emergency_requests er WHERE er.id = _emergency_id;
END;
$$;
-- 1. Create a function to securely confirm donations by Hospital
CREATE OR REPLACE FUNCTION public.confirm_hospital_donation(
  _emergency_id UUID,
  _donor_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to allow hospital to record donations
SET search_path = public
AS $$
DECLARE
  _hospital_id UUID := auth.uid();
  _donor_id UUID;
  _total_points INT;
BEGIN
  -- Verify the hospital owns this emergency
  IF NOT EXISTS (
    SELECT 1 FROM public.emergency_requests 
    WHERE id = _emergency_id AND hospital_id = _hospital_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this emergency request';
  END IF;

  -- 1. Close the emergency
  UPDATE public.emergency_requests 
  SET status = 'closed', updated_at = now() 
  WHERE id = _emergency_id;

  -- 2. Process each donor
  FOREACH _donor_id IN ARRAY _donor_ids
  LOOP
    -- Insert donation record (This triggers badge/cert generation)
    INSERT INTO public.donations (donor_id, hospital_id, emergency_id, reward_given)
    VALUES (_donor_id, _hospital_id, _emergency_id, 50);

    -- Update donor profile: Points + Availability Cooldown
    UPDATE public.donor_profiles
    SET 
      reward_points = reward_points + 50,
      last_donation_date = CURRENT_DATE,
      is_available = false,
      updated_at = now()
    WHERE user_id = _donor_id;

    -- Update notification status to ensure it's synced
    UPDATE public.notifications 
    SET status = 'accepted' -- Ensure it stays accepted
    WHERE emergency_id = _emergency_id AND user_id = _donor_id;
  END LOOP;
END;
$$;

-- 2. Remove the "auto-point" logic from respond_to_notification
-- This prevents the "breach" where points are given just for clicking Accept
CREATE OR REPLACE FUNCTION public.respond_to_notification(_notification_id UUID, _accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n RECORD;
BEGIN
  SELECT * INTO n FROM public.notifications WHERE id = _notification_id AND user_id = auth.uid();
  IF n IS NULL THEN RAISE EXCEPTION 'Notification not found'; END IF;

  UPDATE public.notifications 
  SET 
    status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END::notification_status,
    responded_at = now() 
  WHERE id = _notification_id;

  -- Just mark emergency as in_progress, NO points given yet
  IF _accept THEN
    UPDATE public.emergency_requests 
    SET status = 'in_progress' 
    WHERE id = n.emergency_id AND status = 'open';
  END IF;
END;
$$;

-- 3. Ensure Donations RLS allows hospitals to SEE what they confirmed
DROP POLICY IF EXISTS "donations_select_hospital" ON public.donations;
CREATE POLICY "donations_select_hospital" ON public.donations 
FOR SELECT TO authenticated USING (auth.uid() = hospital_id);

-- 4. Ensure Certificates RLS allows donors to see their certs
DROP POLICY IF EXISTS "cert_select_own" ON public.certificates;
CREATE POLICY "cert_select_own" ON public.certificates 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Award Points and Badge for Organ Pledge
CREATE OR REPLACE FUNCTION public.award_organ_pledge_rewards()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 100 points for pledging organs
  UPDATE public.donor_profiles 
  SET reward_points = reward_points + 100 
  WHERE user_id = NEW.user_id;

  -- "Guardian" badge
  INSERT INTO public.badges(user_id, name, tier) 
  VALUES (NEW.user_id, 'Guardian Angel', 'silver') 
  ON CONFLICT DO NOTHING;

  -- Create a special certificate for pledging
  INSERT INTO public.certificates(user_id, metadata)
  VALUES (NEW.user_id, jsonb_build_object('type', 'organ_pledge', 'pledge_id', NEW.id));

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_organ_pledge_rewards ON public.organ_pledges;
CREATE TRIGGER trg_organ_pledge_rewards 
AFTER INSERT ON public.organ_pledges 
FOR EACH ROW EXECUTE FUNCTION public.award_organ_pledge_rewards();

-- ============ INTER-HOSPITAL NOTIFICATION INSERT ============
-- Allow hospitals to create info notifications for other hospitals (inter-hospital offers)
CREATE POLICY "notif_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow hospitals to also see notifications sent TO them (not just own emergency notifications)
-- This extends the existing policies
CREATE POLICY "notif_select_own_direct" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ DONATIONS INSERT POLICY ============
-- Allow hospitals to create donation records when closing emergencies
CREATE POLICY "donations_insert_hospital" ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hospital') AND auth.uid() = hospital_id
  );

-- ============ DONOR PROFILE UPDATE BY HOSPITAL ============
-- Allow hospitals to update donor profiles (reward_points, availability) when confirming donations
CREATE POLICY "donor_update_hospital" ON public.donor_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hospital'));

-- ============ BADGES INSERT FOR SYSTEM ============
-- The existing trigger runs as SECURITY DEFINER so badges insert works.
-- But ensure certificates can also be inserted by the system trigger.
-- These already exist but adding explicit policies for manual insert if needed.

-- ============ REALTIME FOR DONATIONS ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.badges;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
