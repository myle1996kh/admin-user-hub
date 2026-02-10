
-- 1. Add missing enum values to conversation_status
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'assigned';

-- 2. Add 'supporter' to org_role
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'supporter';

-- 3. Add assigned_supporter_id column to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_supporter_id uuid REFERENCES auth.users(id);

-- 4. Add org config columns for auto-assignment
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_assign_strategy text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS require_online_for_auto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_if_no_online text NOT NULL DEFAULT 'queue',
  ADD COLUMN IF NOT EXISTS max_concurrent_per_supporter integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS supporter_scope_mode text NOT NULL DEFAULT 'assigned_only';

-- 5. Create supporter_presence table
CREATE TABLE IF NOT EXISTS public.supporter_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supporter_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  active_conversation_count integer NOT NULL DEFAULT 0,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supporter_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view presence"
  ON public.supporter_presence FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Supporters can upsert own presence"
  ON public.supporter_presence FOR INSERT
  WITH CHECK (supporter_id = auth.uid());

CREATE POLICY "Supporters can update own presence"
  ON public.supporter_presence FOR UPDATE
  USING (supporter_id = auth.uid());

-- 6. Create conversation_assignments table
CREATE TABLE IF NOT EXISTS public.conversation_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  supporter_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assignments"
  ON public.conversation_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_assignments.conversation_id
    AND public.is_org_member(c.organization_id)
  ));

CREATE POLICY "Org members can insert assignments"
  ON public.conversation_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_assignments.conversation_id
    AND public.is_org_member(c.organization_id)
  ));

CREATE POLICY "Org members can update assignments"
  ON public.conversation_assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_assignments.conversation_id
    AND public.is_org_member(c.organization_id)
  ));

-- 7. Create tenant_credentials table
CREATE TABLE IF NOT EXISTS public.tenant_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  credential_key text NOT NULL,
  credential_value text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, credential_key)
);

ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage credentials"
  ON public.tenant_credentials FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- 8. Create tenant_tools table
CREATE TABLE IF NOT EXISTS public.tenant_tools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  endpoint_url text NOT NULL,
  http_method text NOT NULL DEFAULT 'GET',
  auth_type text NOT NULL DEFAULT 'none',
  auth_header_name text,
  credential_key text,
  input_schema jsonb NOT NULL DEFAULT '{}',
  response_type text NOT NULL DEFAULT 'text',
  output_template text,
  entity_extraction_strategy text NOT NULL DEFAULT 'hybrid_llm_regex',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tool_name)
);

ALTER TABLE public.tenant_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage tools"
  ON public.tenant_tools FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org members can view tools"
  ON public.tenant_tools FOR SELECT
  USING (public.is_org_member(organization_id));

-- 9. Create increment_active_conversations RPC function
CREATE OR REPLACE FUNCTION public.increment_active_conversations(p_supporter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.supporter_presence
  SET active_conversation_count = active_conversation_count + 1,
      updated_at = now()
  WHERE supporter_id = p_supporter_id;
END;
$$;

-- 10. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.supporter_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_assignments;
