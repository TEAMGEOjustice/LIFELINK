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
