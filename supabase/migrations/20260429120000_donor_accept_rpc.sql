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
