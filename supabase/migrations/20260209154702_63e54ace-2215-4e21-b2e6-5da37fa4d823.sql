
-- Grant table permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_memberships TO authenticated;
GRANT SELECT ON public.contact_sessions TO authenticated;
GRANT SELECT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_base_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.platform_roles TO authenticated;

-- Anon needs no access to most tables, but contact_sessions/conversations/messages 
-- are accessed via edge functions with service_role key
