-- =====================================================
-- LIFELINK COMPLETE DATABASE SETUP (Idempotent)
-- Run this on a fresh or partially-set-up Supabase DB
-- =====================================================

-- ============ ENUMS (safe re-run) ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('donor', 'hospital', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.blood_group AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.urgency_level AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.request_status AS ENUM ('open','in_progress','closed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.notification_status AS ENUM ('sent','accepted','rejected','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.notification_type AS ENUM ('emergency','info'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.organ_type AS ENUM ('kidney','liver','heart','lungs','pancreas','cornea','bone_marrow','skin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.organ_status AS ENUM ('registered','pending_approval','approved','matched','transplanted','withdrawn'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- ============ DONOR PROFILES ============
CREATE TABLE IF NOT EXISTS public.donor_profiles (
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
CREATE TABLE IF NOT EXISTS public.emergency_requests (
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
CREATE INDEX IF NOT EXISTS idx_emergency_status ON public.emergency_requests(status);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
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
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============ DONATIONS ============
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  donation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_given INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- ============ BADGES ============
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- ============ CERTIFICATES ============
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  donation_id UUID,
  certificate_code TEXT NOT NULL UNIQUE DEFAULT ('LL-' || upper(substring(md5(random()::text), 1, 10))),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- ============ ORGAN PLEDGES ============
CREATE TABLE IF NOT EXISTS public.organ_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organs organ_type[] NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  medical_notes TEXT,
  hospital_id UUID,
  status organ_status NOT NULL DEFAULT 'registered',
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organ_pledges ENABLE ROW LEVEL SECURITY;

-- ============ ORGAN REQUESTS ============
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

-- ============ HOSPITAL PATIENTS (New) ============
CREATE TABLE IF NOT EXISTS public.hospital_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  blood_group blood_group NOT NULL,
  last_donation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_patients ENABLE ROW LEVEL SECURITY;

-- ============ BLOOD INVENTORY (New) ============
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group blood_group NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, blood_group)
);
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_donor_profiles_updated ON public.donor_profiles;
CREATE TRIGGER trg_donor_profiles_updated BEFORE UPDATE ON public.donor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_emergency_updated ON public.emergency_requests;
CREATE TRIGGER trg_emergency_updated BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pledge_upd ON public.organ_pledges;
CREATE TRIGGER trg_pledge_upd BEFORE UPDATE ON public.organ_pledges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orgreq_upd ON public.organ_requests;
CREATE TRIGGER trg_orgreq_upd BEFORE UPDATE ON public.organ_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_hosp_patients_upd ON public.hospital_patients;
CREATE TRIGGER trg_hosp_patients_upd BEFORE UPDATE ON public.hospital_patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_blood_inv_upd ON public.blood_inventory;
CREATE TRIGGER trg_blood_inv_upd BEFORE UPDATE ON public.blood_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role app_role; v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'donor');
  INSERT INTO public.profiles (id, name, phone, latitude, longitude, hospital_name)
  VALUES (NEW.id, v_name, NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'latitude','')::DOUBLE PRECISION,
    NULLIF(NEW.raw_user_meta_data->>'longitude','')::DOUBLE PRECISION,
    NEW.raw_user_meta_data->>'hospital_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  IF v_role = 'donor' AND NEW.raw_user_meta_data->>'blood_group' IS NOT NULL THEN
    INSERT INTO public.donor_profiles (user_id, blood_group)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'blood_group')::blood_group);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MATCH DONORS (Haversine) ============
CREATE OR REPLACE FUNCTION public.match_donors(_emergency_id UUID)
RETURNS TABLE (user_id UUID, name TEXT, phone TEXT, blood_group blood_group, last_donation_date DATE, distance_km DOUBLE PRECISION)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH e AS (SELECT blood_group, latitude, longitude FROM public.emergency_requests WHERE id = _emergency_id)
  SELECT p.id, p.name, p.phone, dp.blood_group, dp.last_donation_date,
    (6371 * acos(cos(radians((SELECT latitude FROM e))) * cos(radians(p.latitude)) *
    cos(radians(p.longitude) - radians((SELECT longitude FROM e))) +
    sin(radians((SELECT latitude FROM e))) * sin(radians(p.latitude)))) AS distance_km
  FROM public.donor_profiles dp JOIN public.profiles p ON p.id = dp.user_id
  WHERE dp.blood_group = (SELECT blood_group FROM e) AND dp.is_available = true
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (dp.last_donation_date IS NULL OR dp.last_donation_date < CURRENT_DATE - INTERVAL '90 days')
  ORDER BY distance_km ASC, dp.last_donation_date ASC NULLS FIRST LIMIT 5;
$$;

-- ============ NOTIFY MATCHED DONORS ============
CREATE OR REPLACE FUNCTION public.notify_matched_donors(_emergency_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE rec RECORD; cnt INTEGER := 0; e_msg TEXT;
BEGIN
  SELECT 'Urgent: ' || urgency_level || ' need for ' || blood_group || ' blood (' || units_required || ' units)'
  INTO e_msg FROM public.emergency_requests WHERE id = _emergency_id;
  FOR rec IN SELECT * FROM public.match_donors(_emergency_id) LOOP
    INSERT INTO public.notifications (user_id, emergency_id, message, type, distance_km)
    VALUES (rec.user_id, _emergency_id, e_msg, 'emergency', rec.distance_km);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END; $$;

-- ============ RESPOND TO NOTIFICATION (NO points — hospital confirms later) ============
CREATE OR REPLACE FUNCTION public.respond_to_notification(_notification_id UUID, _accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n RECORD;
BEGIN
  SELECT * INTO n FROM public.notifications WHERE id = _notification_id AND user_id = auth.uid();
  IF n IS NULL THEN RAISE EXCEPTION 'Notification not found'; END IF;
  UPDATE public.notifications SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END::notification_status,
    responded_at = now() WHERE id = _notification_id;
  IF _accept THEN
    UPDATE public.emergency_requests SET status = 'in_progress' WHERE id = n.emergency_id AND status = 'open';
  END IF;
END; $$;

-- ============ CONFIRM HOSPITAL DONATION (fixes RLS error) ============
CREATE OR REPLACE FUNCTION public.confirm_hospital_donation(_emergency_id UUID, _donor_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _hospital_id UUID := auth.uid(); _donor_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.emergency_requests WHERE id = _emergency_id AND hospital_id = _hospital_id)
  THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.emergency_requests SET status = 'closed', updated_at = now() WHERE id = _emergency_id;
  FOREACH _donor_id IN ARRAY _donor_ids LOOP
    INSERT INTO public.donations (donor_id, hospital_id, emergency_id, reward_given)
    VALUES (_donor_id, _hospital_id, _emergency_id, 50);
    UPDATE public.donor_profiles SET reward_points = reward_points + 50,
      last_donation_date = CURRENT_DATE, is_available = false, updated_at = now()
    WHERE user_id = _donor_id;
  END LOOP;
END; $$;

-- ============ AWARD BADGES ON DONATION (trigger) ============
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

-- ============ ORGAN PLEDGE REWARDS (trigger) ============
CREATE OR REPLACE FUNCTION public.award_organ_pledge_rewards()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.donor_profiles SET reward_points = reward_points + 100 WHERE user_id = NEW.user_id;
  INSERT INTO public.badges(user_id, name, tier) VALUES (NEW.user_id, 'Guardian Angel', 'silver') ON CONFLICT DO NOTHING;
  INSERT INTO public.certificates(user_id, metadata) VALUES (NEW.user_id, jsonb_build_object('type', 'organ_pledge', 'pledge_id', NEW.id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_organ_pledge_rewards ON public.organ_pledges;
CREATE TRIGGER trg_organ_pledge_rewards AFTER INSERT ON public.organ_pledges FOR EACH ROW EXECUTE FUNCTION public.award_organ_pledge_rewards();

-- ============ ADMIN DELETE USER ============
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END; $$;

-- ============ RLS POLICIES ============
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "roles_select_own" ON public.user_roles;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "roles_admin_all" ON public.user_roles;
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "donor_select_all" ON public.donor_profiles;
CREATE POLICY "donor_select_all" ON public.donor_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "donor_update_own" ON public.donor_profiles;
CREATE POLICY "donor_update_own" ON public.donor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "donor_insert_own" ON public.donor_profiles;
CREATE POLICY "donor_insert_own" ON public.donor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "emergency_select_authenticated" ON public.emergency_requests;
CREATE POLICY "emergency_select_authenticated" ON public.emergency_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "emergency_insert_hospital" ON public.emergency_requests;
CREATE POLICY "emergency_insert_hospital" ON public.emergency_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = hospital_id AND public.has_role(auth.uid(),'hospital'));
DROP POLICY IF EXISTS "emergency_update_hospital" ON public.emergency_requests;
CREATE POLICY "emergency_update_hospital" ON public.emergency_requests FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_select_hospital" ON public.notifications;
CREATE POLICY "notif_select_hospital" ON public.notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.emergency_requests er WHERE er.id = notifications.emergency_id AND er.hospital_id = auth.uid()));

DROP POLICY IF EXISTS "donations_select_donor" ON public.donations;
CREATE POLICY "donations_select_donor" ON public.donations FOR SELECT TO authenticated USING (auth.uid() = donor_id);
DROP POLICY IF EXISTS "donations_select_hospital" ON public.donations;
CREATE POLICY "donations_select_hospital" ON public.donations FOR SELECT TO authenticated USING (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "badges_insert_own" ON public.badges;
CREATE POLICY "badges_insert_own" ON public.badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cert_select_own" ON public.certificates;
CREATE POLICY "cert_select_own" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cert_select_public" ON public.certificates;
CREATE POLICY "cert_select_public" ON public.certificates FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "cert_insert_own" ON public.certificates;
CREATE POLICY "cert_insert_own" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pledge_select_own" ON public.organ_pledges;
CREATE POLICY "pledge_select_own" ON public.organ_pledges FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'hospital') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "pledge_insert_own" ON public.organ_pledges;
CREATE POLICY "pledge_insert_own" ON public.organ_pledges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pledge_update_own" ON public.organ_pledges;
CREATE POLICY "pledge_update_own" ON public.organ_pledges FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'hospital'));

DROP POLICY IF EXISTS "orgreq_select_all_auth" ON public.organ_requests;
CREATE POLICY "orgreq_select_all_auth" ON public.organ_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "orgreq_insert_hospital" ON public.organ_requests;
CREATE POLICY "orgreq_insert_hospital" ON public.organ_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id AND has_role(auth.uid(),'hospital'));
DROP POLICY IF EXISTS "orgreq_update_hospital_admin" ON public.organ_requests;
CREATE POLICY "orgreq_update_hospital_admin" ON public.organ_requests FOR UPDATE TO authenticated USING (auth.uid() = hospital_id OR has_role(auth.uid(),'admin'));

-- Hospital Patients RLS
DROP POLICY IF EXISTS "hosp_patients_select_own" ON public.hospital_patients;
CREATE POLICY "hosp_patients_select_own" ON public.hospital_patients FOR SELECT TO authenticated USING (auth.uid() = hospital_id);
DROP POLICY IF EXISTS "hosp_patients_insert_own" ON public.hospital_patients;
CREATE POLICY "hosp_patients_insert_own" ON public.hospital_patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);
DROP POLICY IF EXISTS "hosp_patients_update_own" ON public.hospital_patients;
CREATE POLICY "hosp_patients_update_own" ON public.hospital_patients FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);
DROP POLICY IF EXISTS "hosp_patients_delete_own" ON public.hospital_patients;
CREATE POLICY "hosp_patients_delete_own" ON public.hospital_patients FOR DELETE TO authenticated USING (auth.uid() = hospital_id);

-- Blood Inventory RLS
DROP POLICY IF EXISTS "blood_inv_select_own" ON public.blood_inventory;
CREATE POLICY "blood_inv_select_own" ON public.blood_inventory FOR SELECT TO authenticated USING (auth.uid() = hospital_id);
DROP POLICY IF EXISTS "blood_inv_insert_own" ON public.blood_inventory;
CREATE POLICY "blood_inv_insert_own" ON public.blood_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);
DROP POLICY IF EXISTS "blood_inv_update_own" ON public.blood_inventory;
CREATE POLICY "blood_inv_update_own" ON public.blood_inventory FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);

-- ============ REALTIME ============
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.organ_requests; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.badges; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.donor_profiles; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_patients; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_inventory; EXCEPTION WHEN duplicate_object THEN null; END $$;
