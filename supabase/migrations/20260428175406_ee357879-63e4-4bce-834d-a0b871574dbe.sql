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