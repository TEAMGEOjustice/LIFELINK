-- Allow donors to create notifications when they accept public emergencies
CREATE POLICY "notif_insert_donor" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
