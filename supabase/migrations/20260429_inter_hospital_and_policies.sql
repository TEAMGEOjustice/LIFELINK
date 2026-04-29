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
