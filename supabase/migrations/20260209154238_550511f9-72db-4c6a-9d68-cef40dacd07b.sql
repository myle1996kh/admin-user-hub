
-- Super admins can update memberships (role changes)
CREATE POLICY "Super admins can update memberships" ON public.organization_memberships FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can insert memberships (add members)
CREATE POLICY "Super admins can insert memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can delete memberships
CREATE POLICY "Super admins can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can view all conversations
CREATE POLICY "Super admins can view all conversations" ON public.conversations FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can view all sessions
CREATE POLICY "Super admins can view all sessions" ON public.contact_sessions FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
