
-- Create enum types
CREATE TYPE public.conversation_status AS ENUM ('unresolved', 'escalated', 'resolved');
CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.message_content_type AS ENUM ('text', 'tool_call');
CREATE TYPE public.org_role AS ENUM ('admin', 'member');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  widget_greeting TEXT DEFAULT 'Xin chào! Tôi có thể giúp gì cho bạn?',
  ai_model TEXT DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization memberships (links users to orgs with roles)
CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Contact sessions (anonymous widget users)
CREATE TABLE public.contact_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  os TEXT,
  browser TEXT,
  location TEXT,
  timezone TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_session_id UUID NOT NULL REFERENCES public.contact_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status conversation_status NOT NULL DEFAULT 'unresolved',
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  content_type message_content_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge base documents
CREATE TABLE public.knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- Helper function: check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid() AND organization_id = _org_id
  )
$$;

-- Helper function: check org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid() AND organization_id = _org_id AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Org members can view org" ON public.organizations FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Org admins can update org" ON public.organizations FOR UPDATE USING (public.is_org_admin(id));

-- Organization memberships policies
CREATE POLICY "Org members can view memberships" ON public.organization_memberships FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins can manage memberships" ON public.organization_memberships FOR INSERT WITH CHECK (public.is_org_admin(organization_id) OR user_id = auth.uid());
CREATE POLICY "Org admins can delete memberships" ON public.organization_memberships FOR DELETE USING (public.is_org_admin(organization_id));

-- Contact sessions policies (org members can view, edge function handles anonymous creation)
CREATE POLICY "Org members can view sessions" ON public.contact_sessions FOR SELECT USING (public.is_org_member(organization_id));

-- Conversations policies
CREATE POLICY "Org members can view conversations" ON public.conversations FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can update conversations" ON public.conversations FOR UPDATE USING (public.is_org_member(organization_id));

-- Messages policies
CREATE POLICY "Org members can view messages" ON public.messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)
  ));
CREATE POLICY "Org members can insert messages" ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)
  ));

-- Knowledge base policies
CREATE POLICY "Org members can view kb docs" ON public.knowledge_base_documents FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins can insert kb docs" ON public.knowledge_base_documents FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Org admins can update kb docs" ON public.knowledge_base_documents FOR UPDATE USING (public.is_org_admin(organization_id));
CREATE POLICY "Org admins can delete kb docs" ON public.knowledge_base_documents FOR DELETE USING (public.is_org_admin(organization_id));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update last_message in conversations when new message added
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = NEW.content, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_kb_docs_updated_at BEFORE UPDATE ON public.knowledge_base_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
