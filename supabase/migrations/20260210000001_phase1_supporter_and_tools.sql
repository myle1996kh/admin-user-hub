
-- ============================================================
-- MIGRATION: ITL AgentHub Phase 1 — Supporter Role + Tools
-- ============================================================

-- 1. Thêm supporter vào org_role enum
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'supporter';

-- 2. Thêm queued + assigned vào conversation_status enum
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'assigned';

-- 3. Mở rộng organizations table — Persona + Widget + Supporter config
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bot_name TEXT NOT NULL DEFAULT 'Trợ lý AI',
  ADD COLUMN IF NOT EXISTS bot_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'friendly'
    CHECK (tone IN ('formal', 'friendly', 'professional', 'casual')),
  ADD COLUMN IF NOT EXISTS response_language TEXT NOT NULL DEFAULT 'vi'
    CHECK (response_language IN ('vi', 'en', 'auto')),
  ADD COLUMN IF NOT EXISTS fallback_message TEXT NOT NULL
    DEFAULT 'Xin lỗi, tôi chưa có thông tin về vấn đề này. Bạn có muốn kết nối với nhân viên hỗ trợ không?',
  ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[]
    NOT NULL DEFAULT ARRAY['cần người hỗ trợ', 'gặp nhân viên', 'khiếu nại'],
  ADD COLUMN IF NOT EXISTS max_bot_turns INTEGER NOT NULL DEFAULT 10,
  -- Widget appearance
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS widget_position TEXT NOT NULL DEFAULT 'bottom-right'
    CHECK (widget_position IN ('bottom-right', 'bottom-left')),
  ADD COLUMN IF NOT EXISTS show_branding BOOLEAN NOT NULL DEFAULT true,
  -- Supporter assignment config
  ADD COLUMN IF NOT EXISTS supporter_scope_mode TEXT NOT NULL DEFAULT 'assigned_only'
    CHECK (supporter_scope_mode IN ('assigned_only', 'all_escalated', 'team_pool')),
  ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_assign_strategy TEXT NOT NULL DEFAULT 'least_busy'
    CHECK (auto_assign_strategy IN ('round_robin', 'least_busy', 'online_first', 'manual')),
  ADD COLUMN IF NOT EXISTS require_online_for_auto BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_if_no_online TEXT NOT NULL DEFAULT 'queue'
    CHECK (fallback_if_no_online IN ('queue', 'notify_all', 'assign_anyway')),
  ADD COLUMN IF NOT EXISTS max_concurrent_per_supporter INTEGER NOT NULL DEFAULT 5;

-- 4. Mở rộng conversations table
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_supporter_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS bot_turns_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT
    CHECK (escalation_reason IN ('keyword', 'max_turns', 'low_confidence', 'tool_error', 'manual'));

-- 5. Bảng conversation_assignments
CREATE TABLE IF NOT EXISTS public.conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),  -- NULL = auto-assigned
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  transfer_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'transferred', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Bảng supporter_presence
CREATE TABLE IF NOT EXISTS public.supporter_presence (
  supporter_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_conversation_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Bảng tenant_credentials (lưu encrypted API keys per tenant)
CREATE TABLE IF NOT EXISTS public.tenant_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  credential_key TEXT NOT NULL,        -- "itl_api_bearer", "webhook_secret"
  credential_value TEXT NOT NULL,      -- Encrypted tại application layer
  scope TEXT NOT NULL DEFAULT 'tool'
    CHECK (scope IN ('tool', 'mcp', 'webhook')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, credential_key)
);

-- 8. Bảng tenant_tools
CREATE TABLE IF NOT EXISTS public.tenant_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,             -- slug, LLM dùng để match intent
  display_name TEXT NOT NULL,          -- tên hiển thị cho admin
  description TEXT NOT NULL,           -- LLM dùng để quyết định khi nào gọi tool
  endpoint_url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET'
    CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  auth_type TEXT NOT NULL DEFAULT 'bearer'
    CHECK (auth_type IN ('bearer', 'api_key', 'basic', 'none')),
  auth_credential_key TEXT,            -- ref tới tenant_credentials.credential_key
  input_schema JSONB NOT NULL DEFAULT '{}',   -- JSON Schema entities cần extract
  extraction_config JSONB,             -- EntityExtractionConfig per tool
  output_template TEXT,                -- Handlebars template cho response
  response_type TEXT NOT NULL DEFAULT 'text'
    CHECK (response_type IN ('text', 'card', 'table', 'list', 'action_buttons', 'status_badge')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tool_name)
);

-- 9. Bảng mcp_servers
CREATE TABLE IF NOT EXISTS public.mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  transport TEXT NOT NULL DEFAULT 'sse'
    CHECK (transport IN ('stdio', 'sse', 'websocket')),
  auth_credential_key TEXT,            -- ref tới tenant_credentials
  available_tools JSONB,               -- Cached từ MCP handshake
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Mở rộng knowledge_base_documents
ALTER TABLE public.knowledge_base_documents
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (document_type IN ('manual', 'faq', 'api_schema', 'workflow')),
  ADD COLUMN IF NOT EXISTS domain_tags TEXT[],
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS file_version TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conv_id
  ON public.conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_active
  ON public.conversation_assignments(supporter_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_supporter_presence_org
  ON public.supporter_presence(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_tools_org_enabled
  ON public.tenant_tools(organization_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_mcp_servers_org_enabled
  ON public.mcp_servers(organization_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_tenant_credentials_org
  ON public.tenant_credentials(organization_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporter_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is org admin or supporter
CREATE OR REPLACE FUNCTION public.is_org_admin_or_supporter(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role IN ('admin', 'supporter')
  )
$$;

-- Helper: check if user is supporter in org
CREATE OR REPLACE FUNCTION public.is_org_supporter(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role = 'supporter'
  )
$$;

-- conversation_assignments policies
CREATE POLICY "Org members can view assignments"
  ON public.conversation_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND public.is_org_member(c.organization_id)
    )
  );

CREATE POLICY "Org admin or supporter can insert assignments"
  ON public.conversation_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND public.is_org_admin_or_supporter(c.organization_id)
    )
  );

CREATE POLICY "Org admin or supporter can update assignments"
  ON public.conversation_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND public.is_org_admin_or_supporter(c.organization_id)
    )
  );

-- supporter_presence policies
CREATE POLICY "Org members can view presence"
  ON public.supporter_presence FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Supporters can upsert own presence"
  ON public.supporter_presence FOR INSERT
  WITH CHECK (supporter_id = auth.uid());

CREATE POLICY "Supporters can update own presence"
  ON public.supporter_presence FOR UPDATE
  USING (supporter_id = auth.uid());

-- tenant_credentials policies (admin only, value never directly exposed)
CREATE POLICY "Org admins can manage credentials"
  ON public.tenant_credentials FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- tenant_tools policies
CREATE POLICY "Org members can view tools"
  ON public.tenant_tools FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage tools"
  ON public.tenant_tools FOR INSERT
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can update tools"
  ON public.tenant_tools FOR UPDATE
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can delete tools"
  ON public.tenant_tools FOR DELETE
  USING (public.is_org_admin(organization_id));

-- mcp_servers policies
CREATE POLICY "Org members can view mcp servers"
  ON public.mcp_servers FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage mcp servers"
  ON public.mcp_servers FOR INSERT
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can update mcp servers"
  ON public.mcp_servers FOR UPDATE
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can delete mcp servers"
  ON public.mcp_servers FOR DELETE
  USING (public.is_org_admin(organization_id));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supporter_presence;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at trigger for new tables
CREATE TRIGGER update_supporter_presence_updated_at
  BEFORE UPDATE ON public.supporter_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_credentials_updated_at
  BEFORE UPDATE ON public.tenant_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_tools_updated_at
  BEFORE UPDATE ON public.tenant_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mcp_servers_updated_at
  BEFORE UPDATE ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
