# Implementation Plan: ITL AgentHub

**Based on:** PRD v1.1
**Codebase:** React + TypeScript + Supabase (Lovable scaffold)
**Date:** 2026-02-10

---

## Tổng Quan Codebase Hiện Tại

### Những gì đã có (working):
| File | Trạng thái | Ghi chú |
|------|-----------|---------|
| `AdminDashboard.tsx` | ✅ Working | 3 tabs: inbox / knowledge / settings. Realtime conversations. |
| `AdminSidebar.tsx` | ✅ Working | Icons + labels. adminOnly filter. isSuperAdmin link. |
| `InboxList.tsx` | ✅ Working | Filter by status. Hiển thị assigned_to member. |
| `ChatPanel.tsx` | ✅ Working | Send message qua `agent-chat` edge function. Assign member. Enhance AI. |
| `ContextPanel.tsx` | ✅ Working | Session info: device, email, timezone. |
| `KnowledgeBase.tsx` | ✅ Working | CRUD docs. |
| `SettingsPanel.tsx` | ✅ Working | org name, widget_greeting, ai_model. |
| `useAuth.tsx` | ✅ Working | user/org/membership/isSuperAdmin. refreshOrgData. |

### Gap so với PRD:
- ❌ Không có `supporter` role — chỉ `admin | member`
- ❌ Không có conversation status `queued | assigned`
- ❌ Không có supporter presence (online/offline)
- ❌ Không có auto-assignment logic
- ❌ Không có tenant_tools / tenant_credentials / mcp_servers tables
- ❌ ChatPanel không phân biệt supporter view vs admin view
- ❌ InboxList không có `queued` filter tab
- ❌ SettingsPanel không có supporter config section
- ❌ AdminDashboard không có "Hỗ trợ" tab cho supporter

---

## Phase 1: DB Foundation + Supporter Role
**Mục tiêu:** Schema đúng → role supporter hoạt động → routing đúng

### 1.1 Supabase Migration

**File:** `supabase/migrations/20260210_v1_1_supporter_and_tools.sql`

Thực hiện toàn bộ migration trong PRD Section 10.1:
- `ALTER TYPE org_role ADD VALUE 'supporter'`
- `ALTER TYPE conversation_status ADD VALUE 'queued'`
- `ALTER TYPE conversation_status ADD VALUE 'assigned'`
- Thêm columns vào `organizations` (bot_name, system_prompt, tone, supporter config...)
- Tạo `conversation_assignments`
- Tạo `supporter_presence`
- Tạo `tenant_tools`
- Tạo `tenant_credentials`
- Tạo `mcp_servers`
- Mở rộng `conversations` (assigned_supporter_id, bot_turns_count, escalation_reason)
- Mở rộng `knowledge_base_documents` (document_type, domain_tags, metadata)

Sau migration: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`

### 1.2 useAuth — Supporter Detection

**File:** `src/hooks/useAuth.tsx`

**Thay đổi:**
```typescript
// Thêm vào AuthContextType
isSupporter: boolean;
isAdminOrSupporter: boolean;

// Trong fetchUserData, membership check:
const role = mem?.role; // "admin" | "member" | "supporter"
setIsSupporter(role === "supporter");
setIsAdminOrSupporter(role === "admin" || role === "supporter");
```

**Tại sao:** Cần phân quyền routing — supporter không vào được Knowledge/Settings, nhưng được vào Inbox + Hỗ trợ tab.

### 1.3 AdminSidebar — Thêm Tab Hỗ Trợ

**File:** `src/components/admin/AdminSidebar.tsx`

**Thay đổi:**
```typescript
// Thêm tab type
type AdminTab = "inbox" | "support" | "knowledge" | "settings";

// Thêm nav item
{ id: "support", icon: Headphones, label: "Hỗ trợ", adminOnly: false, supporterVisible: true }

// adminOnly: false → supporter thấy được
// Visibility logic:
// - inbox: tất cả thấy
// - support: admin + supporter thấy
// - knowledge: adminOnly
// - settings: adminOnly
```

**Props update:**
```typescript
interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isAdmin?: boolean;
  isSupporter?: boolean;
}
```

### 1.4 AdminDashboard — Tab Routing

**File:** `src/pages/AdminDashboard.tsx`

**Thay đổi:**
- `activeTab` type: thêm `"support"`
- Supporter redirect: nếu role = supporter và activeTab = knowledge/settings → redirect về inbox
- Thêm render: `{activeTab === "support" && <SupporterPanel organizationId={organization.id} />}`
- Pass `isSupporter` xuống AdminSidebar

---

## Phase 2: Escalation Flow + Assignment

### 2.1 Conversation Status Update

**File:** `src/components/admin/InboxList.tsx`

**Thay đổi:**
```typescript
// Thêm status tabs
const statusTabs = [
  { id: "all", label: "Tất cả" },
  { id: "unresolved", label: "Chờ xử lý" },
  { id: "escalated", label: "Cần hỗ trợ" },
  { id: "queued", label: "Đang chờ" },       // mới
  { id: "assigned", label: "Đang xử lý" },   // mới
  { id: "resolved", label: "Đã xong" },
];

// Thêm statusConfig entries cho queued + assigned
queued: { icon: Timer, className: "text-echo-warning" },
assigned: { icon: UserCheck, className: "text-blue-500" },
```

### 2.2 ChatPanel — Supporter Actions

**File:** `src/components/admin/ChatPanel.tsx`

**Thay đổi:**
- Thêm prop: `currentUserRole: "admin" | "member" | "supporter"`
- Thêm button "Nhận hội thoại này" khi status = `queued` và là supporter
- Thêm button "Chuyển cho người khác" khi status = `assigned`
- `updateStatus` mở rộng: accept `"queued" | "assigned"`
- Assign flow: ghi vào `conversation_assignments` (không chỉ `conversations.assigned_to`)
- Header: hiển thị "đang xử lý bởi [tên supporter]" khi assigned

```typescript
// Thêm hàm
const acceptConversation = async () => {
  // INSERT conversation_assignments
  // UPDATE conversations SET status = 'assigned', assigned_supporter_id = currentUserId
};

const transferConversation = async (newSupporterId: string) => {
  // UPDATE conversation_assignments SET status = 'transferred'
  // INSERT new conversation_assignments
  // UPDATE conversations SET assigned_supporter_id = newSupporterId
};
```

### 2.3 Supporter Presence Hook

**File mới:** `src/hooks/usePresence.tsx`

```typescript
// Heartbeat mỗi 30s → upsert supporter_presence
// Set online khi mount, offline khi unmount
// Expose: presenceStatus, setPresenceStatus

export const usePresence = (organizationId: string) => {
  const [status, setStatus] = useState<"online" | "away" | "busy" | "offline">("online");

  useEffect(() => {
    // upsert on mount
    // heartbeat interval 30s
    // set offline on beforeunload
    // cleanup on unmount
  }, []);

  return { status, setStatus };
};
```

### 2.4 SupporterPanel Component

**File mới:** `src/components/admin/SupporterPanel.tsx`

```typescript
// View thay đổi theo organization.supporter_scope_mode:
// - "assigned_only": chỉ hiện conv assigned cho mình
// - "all_escalated": hiện toàn bộ escalated queue
// - "team_pool": hiện pool của nhóm (Phase 3)

interface SupporterPanelProps {
  organizationId: string;
  currentUserId: string;
  scopeMode: "assigned_only" | "all_escalated" | "team_pool";
}

// Layout: 3 cột giống inbox tab
// Cột 1: SupporterInboxList (filter đặc biệt cho supporter)
// Cột 2: ChatPanel (reuse, với supporter actions)
// Cột 3: ContextPanel (reuse)
```

---

## Phase 3: Auto-Assignment Engine

### 3.1 Edge Function: assign-conversation

**File:** `supabase/functions/assign-conversation/index.ts`

```typescript
// Input: { conversation_id, organization_id, strategy? }
// Logic:
//   1. Fetch org config (auto_assign_strategy, require_online_for_auto, etc.)
//   2. Query supporters online + capacity
//   3. Apply strategy: round_robin | least_busy | online_first
//   4. If no supporter available → apply fallback_if_no_online
//   5. INSERT conversation_assignments
//   6. UPDATE conversations.assigned_supporter_id + status

// Gọi sau khi conversation.status → "escalated"
// Trigger: database webhook hoặc gọi thủ công từ bot flow
```

### 3.2 SettingsPanel — Supporter Config Section

**File:** `src/components/admin/SettingsPanel.tsx`

**Thêm section mới (chỉ admin thấy):**
```tsx
{/* Cấu hình Supporter */}
<div className="rounded-xl border border-border bg-card p-6 space-y-4">
  <h3>Cấu hình Hỗ trợ</h3>

  {/* Scope mode */}
  <Select value={scopeMode} onValueChange={setScopeMode}>
    <SelectItem value="assigned_only">Chỉ hội thoại được gán</SelectItem>
    <SelectItem value="all_escalated">Queue chung (ai nhận thì nhận)</SelectItem>
    <SelectItem value="team_pool">Pool theo nhóm</SelectItem>
  </Select>

  {/* Auto-assign toggle */}
  <Switch checked={autoAssignEnabled} onCheckedChange={setAutoAssignEnabled} />

  {/* Strategy (visible khi auto_assign = true) */}
  {autoAssignEnabled && (
    <Select value={autoAssignStrategy} onValueChange={setAutoAssignStrategy}>
      <SelectItem value="round_robin">Luân phiên</SelectItem>
      <SelectItem value="least_busy">Ít bận nhất</SelectItem>
      <SelectItem value="online_first">Ưu tiên online</SelectItem>
    </Select>
  )}

  {/* Max concurrent */}
  <Input type="number" value={maxConcurrent} ... />

  {/* Fallback */}
  <Select value={fallbackMode} ...>
    <SelectItem value="queue">Để trong hàng chờ</SelectItem>
    <SelectItem value="notify_all">Thông báo tất cả</SelectItem>
    <SelectItem value="assign_anyway">Gán dù offline</SelectItem>
  </Select>
</div>
```

**Save:** Thêm các fields mới vào `supabase.update(organizations)`

---

## Phase 4: Tenant Tools (API Tool Builder)

### 4.1 ToolsPanel Component

**File mới:** `src/components/admin/ToolsPanel.tsx`

```
Layout:
├── Danh sách tools (bảng với enabled toggle)
├── Button "Thêm Tool"
└── Tool Form (drawer/dialog):
    ├── display_name, tool_name (auto-slug)
    ├── description (textarea — quan trọng cho LLM)
    ├── endpoint_url, method (GET/POST/PUT/PATCH)
    ├── Auth section:
    │   ├── auth_type (bearer/api_key/basic/none)
    │   └── Credential picker (từ tenant_credentials)
    ├── Input Schema Builder:
    │   ├── Add field: name, type, required, description
    │   └── Extraction config per field:
    │       ├── strategy (hybrid_llm_regex/llm_only/regex_only)
    │       └── regex_pattern (nếu dùng regex)
    ├── Response type (text/card/table/list/action_buttons)
    ├── Output template (textarea với variable hints)
    └── Test panel (input sample text → simulate extraction)
```

**CRUD operations:**
```typescript
// CREATE: INSERT tenant_tools
// READ: SELECT tenant_tools WHERE organization_id = org.id
// UPDATE: UPDATE tenant_tools
// DELETE: DELETE tenant_tools
// TOGGLE: UPDATE enabled = !enabled
```

### 4.2 CredentialsPanel Component

**File mới:** `src/components/admin/CredentialsPanel.tsx`

```
Layout:
├── Danh sách credentials (masked value)
├── Button "Thêm Credential"
└── Form:
    ├── credential_key (label)
    ├── credential_value (password input — never show after save)
    ├── scope (tool/mcp/webhook)
    └── description
```

**Security:** credential_value gửi lên → backend/edge function encrypt → lưu. Frontend không bao giờ nhận lại giá trị đã lưu.

### 4.3 AdminSidebar + AdminDashboard Update

Thêm tab "Công cụ" (`tools` tab):
- Hiển thị ToolsPanel với 2 sub-sections: Tools + Credentials
- `adminOnly: true`

---

## Phase 5: MCP Servers

### 5.1 MCPPanel Component

**File mới:** `src/components/admin/MCPPanel.tsx`

```
Layout:
├── Danh sách MCP servers (enabled badge, last_synced)
├── Button "Thêm MCP Server"
└── Form:
    ├── server_name
    ├── server_url
    ├── transport (SSE/WebSocket/stdio)
    ├── auth_credential_key
    ├── Button "Sync tools" → gọi backend để fetch available_tools
    └── Preview: list tools từ available_tools JSONB
```

**Tích hợp:** MCPPanel nằm trong ToolsPanel như tab thứ 2 ("MCP Servers").

---

## Phase 6: KB Enhancement

### 6.1 KnowledgeBase — Document Type + Tags

**File:** `src/components/admin/KnowledgeBase.tsx`

**Thêm fields vào form thêm doc:**
```tsx
// document_type selector
<Select value={docType}>
  <SelectItem value="manual">Hướng dẫn sử dụng</SelectItem>
  <SelectItem value="faq">FAQ</SelectItem>
  <SelectItem value="api_schema">API Schema</SelectItem>
  <SelectItem value="workflow">Quy trình</SelectItem>
</Select>

// domain_tags input (comma-separated hoặc tag input)
<TagInput value={tags} onChange={setTags} placeholder="tracking, billing, booking..." />
```

**Cập nhật INSERT:** thêm `document_type`, `domain_tags` vào INSERT.

---

## File Changes Summary

### Files cần SỬA:
| File | Phase | Thay đổi |
|------|-------|---------|
| `src/hooks/useAuth.tsx` | 1 | Thêm `isSupporter`, `isAdminOrSupporter` |
| `src/components/admin/AdminSidebar.tsx` | 1 | Tab "Hỗ trợ", supporter visibility |
| `src/pages/AdminDashboard.tsx` | 1 | Tab support routing, SupporterPanel render |
| `src/components/admin/InboxList.tsx` | 2 | Status tabs: queued + assigned |
| `src/components/admin/ChatPanel.tsx` | 2 | Supporter actions, acceptConversation, transfer |
| `src/components/admin/SettingsPanel.tsx` | 3 | Supporter config section |
| `src/components/admin/KnowledgeBase.tsx` | 6 | document_type, domain_tags |
| `src/integrations/supabase/types.ts` | 1 | Regenerate sau migration |

### Files cần TẠO MỚI:
| File | Phase | Mô tả |
|------|-------|-------|
| `src/hooks/usePresence.tsx` | 2 | Heartbeat + presence management |
| `src/components/admin/SupporterPanel.tsx` | 2 | Supporter dashboard (3-col layout) |
| `src/components/admin/ToolsPanel.tsx` | 4 | Tool builder + credentials UI |
| `src/components/admin/CredentialsPanel.tsx` | 4 | API credentials management |
| `src/components/admin/MCPPanel.tsx` | 5 | MCP server config |
| `supabase/migrations/20260210_v1_1.sql` | 1 | Full DB migration |
| `supabase/functions/assign-conversation/index.ts` | 3 | Auto-assignment edge function |

---

## Execution Order

```
Phase 1: DB + Auth + Routing          (Foundation — unblock mọi thứ)
    ↓
Phase 2: Escalation + Supporter UI    (Core supporter flow)
    ↓
Phase 3: Auto-Assignment              (Smart routing)
    ↓
Phase 4: Tool Builder                 (API integration UI)
    ↓
Phase 5: MCP                          (Advanced integration)
    ↓
Phase 6: KB Enhancement               (Polish)
```

**Phase 1 là prerequisite bắt buộc** — migration schema trước, mọi phase sau đều depend vào đó.

---

## Dependency Graph (chi tiết)

```
[Migration SQL]
    ├── useAuth (isSupporter)
    │       ├── AdminSidebar (tab support)
    │       │       └── AdminDashboard (SupporterPanel route)
    │       └── AdminDashboard (role-based guards)
    │
    ├── InboxList (queued/assigned tabs)
    │
    ├── ChatPanel (acceptConversation, transfer)
    │       └── usePresence
    │
    ├── SupporterPanel (new)
    │       ├── InboxList (reuse)
    │       ├── ChatPanel (reuse with supporter actions)
    │       └── ContextPanel (reuse)
    │
    ├── SettingsPanel (supporter config)
    │       └── [assign-conversation edge function]
    │
    ├── ToolsPanel (new)
    │       └── CredentialsPanel (new)
    │
    └── MCPPanel (new)
```

---

## Conventions & Notes

### State management trong AdminDashboard
- Hiện tại: local useState + Supabase realtime subscription
- **Giữ nguyên pattern này** — không introduce Redux/Zustand
- SupporterPanel sẽ có state riêng, không share qua AdminDashboard

### Role checks pattern
```typescript
// Pattern nhất quán:
const isAdmin = membership?.role === "admin";
const isSupporter = membership?.role === "supporter";
const canViewSupport = isAdmin || isSupporter;
const canViewKB = isAdmin;
const canViewSettings = isAdmin;
```

### Supabase realtime pattern
```typescript
// Cần add realtime subscription cho:
// 1. supporter_presence (presence indicator)
// 2. conversation_assignments (khi có assign mới)
// Giống pattern đang dùng trong AdminDashboard.tsx:
const channel = supabase.channel("...")
  .on("postgres_changes", { event: "*", ... }, callback)
  .subscribe();
// cleanup: supabase.removeChannel(channel)
```

### Edge function pattern
```typescript
// Hiện tại dùng: VITE_SUPABASE_URL/functions/v1/agent-chat
// Pattern mới: VITE_SUPABASE_URL/functions/v1/assign-conversation
// Auth header: Bearer token từ supabase.auth.getSession()
```

---

*Tài liệu này là living document — cập nhật khi bắt đầu mỗi phase.*
