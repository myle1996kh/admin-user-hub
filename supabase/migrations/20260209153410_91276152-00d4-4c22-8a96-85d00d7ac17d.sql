
-- Fix all RESTRICTIVE policies to be PERMISSIVE
-- Drop and recreate all policies

-- organizations
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update org" ON public.organizations;
DROP POLICY IF EXISTS "Org members can view org" ON public.organizations;

CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Org admins can update org" ON public.organizations FOR UPDATE TO authenticated USING (is_org_admin(id));
CREATE POLICY "Org members can view org" ON public.organizations FOR SELECT TO authenticated USING (is_org_member(id));

-- organization_memberships
DROP POLICY IF EXISTS "Org admins can delete memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Org admins can manage memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Org members can view memberships" ON public.organization_memberships;

CREATE POLICY "Org admins can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (is_org_admin(organization_id));
CREATE POLICY "Org admins can manage memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id) OR user_id = auth.uid());
CREATE POLICY "Org members can view memberships" ON public.organization_memberships FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- contact_sessions
DROP POLICY IF EXISTS "Org members can view sessions" ON public.contact_sessions;
CREATE POLICY "Org members can view sessions" ON public.contact_sessions FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- conversations
DROP POLICY IF EXISTS "Org members can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Org members can view conversations" ON public.conversations;

CREATE POLICY "Org members can update conversations" ON public.conversations FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "Org members can view conversations" ON public.conversations FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- messages
DROP POLICY IF EXISTS "Org members can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can view messages" ON public.messages;

CREATE POLICY "Org members can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND is_org_member(c.organization_id)));
CREATE POLICY "Org members can view messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND is_org_member(c.organization_id)));

-- knowledge_base_documents
DROP POLICY IF EXISTS "Org admins can delete kb docs" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Org admins can insert kb docs" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Org admins can update kb docs" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Org members can view kb docs" ON public.knowledge_base_documents;

CREATE POLICY "Org admins can delete kb docs" ON public.knowledge_base_documents FOR DELETE TO authenticated USING (is_org_admin(organization_id));
CREATE POLICY "Org admins can insert kb docs" ON public.knowledge_base_documents FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id));
CREATE POLICY "Org admins can update kb docs" ON public.knowledge_base_documents FOR UPDATE TO authenticated USING (is_org_admin(organization_id));
CREATE POLICY "Org members can view kb docs" ON public.knowledge_base_documents FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Add super_admin role for platform-wide management
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'user');

CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role platform_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform role
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Only super admins can view platform_roles
CREATE POLICY "Super admins can view all roles" ON public.platform_roles FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage roles" ON public.platform_roles FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete roles" ON public.platform_roles FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can view ALL organizations (not just their own)
CREATE POLICY "Super admins can view all orgs" ON public.organizations FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update all orgs" ON public.organizations FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete orgs" ON public.organizations FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can view all memberships
CREATE POLICY "Super admins can view all memberships" ON public.organization_memberships FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
