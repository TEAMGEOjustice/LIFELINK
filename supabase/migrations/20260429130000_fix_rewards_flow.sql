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

-- 6. Administrative User Management
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Required to touch auth.users
SET search_path = public
AS $$
BEGIN
  -- Security check: only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can delete users';
  END IF;

  -- Delete from auth.users (cascades to profiles and roles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


