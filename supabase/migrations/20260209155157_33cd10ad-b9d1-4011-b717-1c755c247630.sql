
-- Allow users to read their OWN platform_roles entry
CREATE POLICY "Users can view own platform role" ON public.platform_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
