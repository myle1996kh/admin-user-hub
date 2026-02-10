# PRD: ITL AgentHub — Multi-Tenant AI Chatbot Platform

**Version:** 1.1
**Date:** 2026-02-10
**Status:** In Review
**Domain:** Phần mềm vận chuyển logistics (ITL Software)

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Vision

ITL AgentHub là nền tảng chatbot AI đa tenant, tích hợp trực tiếp vào phần mềm vận chuyển ITL. Mục tiêu kép:

1. **Hướng dẫn sử dụng phần mềm** — trả lời câu hỏi về nghiệp vụ, tính năng, quy trình
2. **Tra cứu dữ liệu real-time** — kết nối API phần mềm ITL để query thông tin (đơn hàng, chuyến xe, tuyến đường, khách hàng, v.v.)

### 1.2 Core Insight

> Người dùng không chỉ cần chatbot biết "hệ thống có tính năng gì" mà cần chatbot **thực sự tra cứu được dữ liệu** trong hệ thống của họ. Entity extraction → API call → structured response là luồng cốt lõi.

### 1.3 Scope

- **Frontend:** React + TypeScript (Lovable/Vite) — đây là repo này
- **Backend:** Python/FastAPI + LangChain/LangGraph (repo riêng)
- **Database:** Supabase (PostgreSQL + pgvector + Realtime)
- **Widget:** Embeddable JS snippet cho phần mềm ITL

---

## 2. User Roles & Personas

### 2.1 Role Matrix

| Role | Scope | Truy cập | Mô tả |
|------|-------|----------|-------|
| `super_admin` | Platform | Tất cả tenants | Quản lý toàn bộ platform, tạo/xóa tenant |
| `admin` | Tenant | Org của mình | Setup KB, config chatbot, quản lý members |
| `supporter` | Tenant | Conversations được assign | Xử lý escalated conversations, live chat |
| `user` | End-user | Widget chat | Người dùng phần mềm ITL, chat trực tiếp |

### 2.2 Current State vs. Target

| Role | DB hiện tại | Target |
|------|------------|--------|
| super_admin | ✅ `platform_roles.role = 'super_admin'` | Giữ nguyên |
| admin | ✅ `organization_memberships.role = 'admin'` | Giữ nguyên |
| supporter | ❌ Chưa có | Thêm `'supporter'` vào `org_role` enum |
| user | ✅ Qua widget/contact_sessions | Giữ nguyên |

---

## 3. Kiến Trúc Hệ Thống

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ITL SOFTWARE (Host App)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Embeddable Widget                   │   │
│  │  (JS snippet → iframe → chat interface)         │   │
│  └──────────────────┬──────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                       │ tenant_id + user_context
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  AgentHub Backend (FastAPI)              │
│                                                         │
│  ┌──────────┐  ┌──────────────────────────────────┐   │
│  │  Router  │→ │     Agent Orchestration (ADK)    │   │
│  │  Agent   │  │  ┌──────────┐  ┌─────────────┐  │   │
│  └──────────┘  │  │  RAG     │  │  API Tool   │  │   │
│                │  │  Agent   │  │  Agent      │  │   │
│  ┌──────────┐  │  └──────────┘  └─────────────┘  │   │
│  │ Memory   │  │  ┌──────────┐  ┌─────────────┐  │   │
│  │ Manager  │  │  │ Guide    │  │ Escalation  │  │   │
│  └──────────┘  │  │ Agent   │  │ Agent       │  │   │
│                │  └──────────┘  └─────────────┘  │   │
│                └──────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Tenant Config Layer                             │  │
│  │  KB | Persona | Model | Skills | MCP | APIs     │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │     Supabase        │
              │  PostgreSQL + pgvec │
              │  + Realtime         │
              └────────────────────┘
```

### 3.2 Agent Architecture (ADK Pattern)

```
User Message
     │
     ▼
┌─────────────────────────────────────┐
│          Router Agent               │
│  - Intent classification            │
│  - Route to specialized agent       │
│  - Context: tenant_id, memory       │
└──────┬──────────┬──────────┬────────┘
       │          │          │
       ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────────┐
  │  RAG   │ │  API   │ │ Escalation │
  │ Agent  │ │ Agent  │ │   Agent    │
  │        │ │        │ │            │
  │KB docs │ │Entity  │ │Human hand- │
  │Semantic│ │Extract │ │off trigger │
  │search  │ │→ Tools │ │            │
  └────────┘ └────────┘ └────────────┘
       │          │
       ▼          ▼
  Response  Structured
  (text)    Data + text
```

---

## 4. Tenant Configuration System

### 4.1 Chatbot Persona & Style

Mỗi tenant cấu hình riêng cách chatbot phản hồi:

```typescript
interface ChatbotPersonaConfig {
  // Identity
  bot_name: string                    // "Trợ lý ITL", "ChatBot Vận Chuyển"
  bot_avatar_url?: string             // URL avatar
  greeting_message: string            // Tin nhắn chào đầu tiên

  // Behavior
  tone: "formal" | "friendly" | "professional" | "casual"
  response_language: "vi" | "en" | "auto"

  // AI Config
  ai_model: string                    // "gemini-2.0-flash", "gpt-4o", etc.
  system_prompt: string               // Prompt chính định nghĩa vai trò bot

  // Escalation
  fallback_message: string            // Khi bot không biết trả lời
  escalation_trigger_keywords: string[] // ["cần người hỗ trợ", "gặp nhân viên"]
  max_bot_turns_before_suggest: number  // Sau N turns suggest escalate
}
```

**System Prompt Template mặc định cho ITL:**
```
Bạn là trợ lý AI của phần mềm vận chuyển ITL. Nhiệm vụ:
1. Hướng dẫn người dùng sử dụng các tính năng của phần mềm
2. Tra cứu thông tin đơn hàng, chuyến xe, tuyến đường khi được yêu cầu
3. Trả lời bằng tiếng Việt, ngắn gọn và chính xác
4. Nếu không chắc chắn, đề nghị kết nối với nhân viên hỗ trợ
```

### 4.2 Knowledge Domain (Per-Tenant KB)

Mỗi tenant upload tài liệu riêng:

```typescript
interface KnowledgeBaseDocument {
  id: string
  organization_id: string       // Tenant isolation
  title: string
  content: string               // Raw text hoặc extracted từ PDF/DOCX
  document_type: "manual" | "faq" | "api_schema" | "workflow"
  embedding: vector(384)        // pgvector - all-MiniLM-L6-v2
  metadata: {
    source_file?: string
    version?: string
    tags?: string[]
    domain?: string             // "booking" | "tracking" | "billing" | ...
  }
  created_at: string
}
```

**Loại tài liệu cho ITL:**
- Hướng dẫn sử dụng phần mềm (PDF/DOCX)
- FAQ nghiệp vụ vận chuyển
- API schema mô tả các endpoint của ITL software
- Quy trình xử lý đơn hàng, tra cứu chuyến xe

### 4.3 API Tools / Skills Configuration

```typescript
interface TenantTool {
  id: string
  organization_id: string
  tool_name: string              // "get_shipment", "get_routes", "get_customer"
  display_name: string           // "Tra cứu đơn hàng"
  description: string            // Mô tả cho LLM biết khi nào dùng tool này

  // API config
  endpoint_url: string           // https://api.itl-software.com/shipments/{id}
  method: "GET" | "POST"
  auth_type: "bearer" | "api_key" | "basic"
  auth_config: Record<string, string>  // Encrypted

  // Input schema - LLM dùng để extract entities
  input_schema: JSONSchema       // {shipment_code: string, date_from?: string}

  // Output mapping
  output_template: string        // "Đơn hàng {{shipment_code}}: {{status}}, dự kiến giao {{eta}}"

  // Response type hint
  response_type: "text" | "table" | "card" | "list"
}
```

**Built-in Tools mặc định cho ITL domain:**
| Tool | Entity cần extract | API |
|------|-------------------|-----|
| `track_shipment` | mã đơn hàng | GET /shipments/{code} |
| `get_route_info` | tuyến đường | GET /routes?from=&to= |
| `check_vehicle` | số xe / chuyến | GET /vehicles/{id} |
| `get_customer` | tên/mã KH | GET /customers/{id} |
| `list_pending_orders` | ngày, trạng thái | GET /orders?status=pending |

---

## 5. Entity Extraction & API Flow

### 5.1 Entity Extraction Strategy — Dynamic

**Quyết định:** Extraction strategy là **linh động**, configurable per-tool hoặc per-tenant.

```typescript
interface EntityExtractionConfig {
  // Per-tool hoặc fallback tenant-level
  strategy:
    | "llm_only"        // Dùng LLM function calling để extract
    | "regex_only"      // Pattern matching (nhanh, chính xác với format cố định)
    | "ner_only"        // Named Entity Recognition model riêng
    | "hybrid_llm_regex" // Regex trước, LLM fallback nếu regex miss
    | "hybrid_ner_llm"   // NER trước, LLM confirm/enrich

  // Regex patterns (nếu dùng regex)
  regex_patterns?: {
    entity_name: string
    pattern: string          // VD: "ITL-\d{4}-\d{3}" cho shipment code
    transform?: string       // Normalize sau khi match
  }[]

  // Confidence threshold
  min_confidence: number     // 0.0 - 1.0, dưới này → hỏi lại user

  // Fallback behavior khi extract thất bại
  on_extract_fail: "ask_user" | "skip_tool" | "escalate"
}
```

**Lý do hybrid tốt nhất cho ITL:**

| Strategy | Tốc độ | Accuracy | Use case |
|----------|--------|----------|----------|
| `regex_only` | Nhanh nhất | Cao với format cố định | Mã đơn hàng `ITL-YYYY-NNN`, số xe `51B-12345` |
| `llm_only` | Chậm hơn | Tốt với ngôn ngữ tự nhiên | "đơn của tôi", "chuyến hôm qua" |
| `hybrid_llm_regex` | Trung bình | Tốt nhất | **Default recommend** — regex first, LLM fallback |
| `ner_only` | Nhanh | Tốt với entities phổ biến | Địa danh, tên người |

**Ví dụ per-tool config:**
```json
{
  "tool": "track_shipment",
  "extraction": {
    "strategy": "hybrid_llm_regex",
    "regex_patterns": [
      {"entity_name": "shipment_code", "pattern": "ITL-\\d{4}-\\d{3,6}"}
    ],
    "min_confidence": 0.8,
    "on_extract_fail": "ask_user"
  }
}
```

### 5.2 Flow Chi Tiết

```
User: "Đơn hàng ITL-2024-001 của tôi đang ở đâu?"
         │
         ▼
   Router Agent
   Intent: "track_shipment" (confidence: 0.95)
         │
         ▼
   Entity Extractor (strategy: hybrid_llm_regex)
   Step 1: Regex → match "ITL-2024-001" ✓
   Result: {shipment_code: "ITL-2024-001", confidence: 1.0}
         │
         ▼
   Tool: track_shipment.call({shipment_code: "ITL-2024-001"})
   Auth: Bearer token từ tenant_tools.auth_config (decrypted)
         │
         ▼
   API Response:
   {status: "in_transit", current_location: "Đà Nẵng",
    eta: "2024-12-15", driver: "Nguyễn Văn A"}
         │
         ▼
   Response Formatter (response_type: "card")
         │
         ▼
   Bot: "Đơn hàng ITL-2024-001 đang trên đường vận chuyển.
         📍 Vị trí hiện tại: Đà Nẵng
         🚚 Tài xế: Nguyễn Văn A
         📅 Dự kiến giao: 15/12/2024"
```

**Trường hợp entity không rõ:**
```
User: "Đơn hàng của tôi đâu rồi?"
         │
         ▼
   Regex miss → LLM extract → confidence: 0.3 (quá thấp)
         │
         ▼
   on_extract_fail: "ask_user"
         │
         ▼
   Bot: "Bạn có thể cho tôi biết mã đơn hàng không?
         (VD: ITL-2024-001)"
```

### 5.3 Response Types

| Type | Khi dùng | Render trong Widget |
|------|----------|---------------------|
| `text` | Hướng dẫn, FAQ, câu trả lời tự do | Markdown text |
| `card` | Chi tiết 1 entity (1 đơn hàng) | Card có icon + key-value pairs |
| `table` | Danh sách (nhiều đơn hàng, tuyến đường) | Scrollable table |
| `list` | Danh sách ngắn, options | Bullet list |
| `action_buttons` | Cần user chọn tiếp | Clickable button row |
| `status_badge` | Trạng thái với màu | Colored badge (xanh/vàng/đỏ) |

### 5.4 Fallback Logic

```
1. Có tool phù hợp + extract được entity + confidence >= threshold
   → gọi API → format response

2. Có tool phù hợp + extract THẤT BẠI + on_extract_fail = "ask_user"
   → hỏi lại user cung cấp thêm thông tin

3. API call thất bại (error/timeout)
   → retry 1 lần → nếu vẫn fail → thông báo lỗi + suggest escalate

4. Không có tool phù hợp + có KB docs matching
   → RAG answer (semantic search)

5. Không có KB docs matching
   → fallback_message + suggest escalation

6. Router confidence thấp (không rõ intent)
   → clarifying question
```

---

## 6. Memory & Context Management

### 6.1 Conversation Memory

```typescript
interface ConversationMemory {
  conversation_id: string

  // Short-term: current session
  recent_messages: Message[]    // Last N messages (sliding window)
  extracted_entities: Record<string, string>  // {shipment_code: "ITL-001"}

  // Long-term: per user (optional, if user is logged in)
  user_preferences?: {
    preferred_language: string
    frequent_queries: string[]
  }
}
```

### 6.2 Context Window Strategy

- **Short-term memory:** Last 10 messages trong conversation
- **Entity carry-over:** Entities extracted vẫn nhớ trong session
  - Ví dụ: User hỏi về "đơn ITL-001" rồi hỏi "tài xế đó là ai?" → biết tài xế của ITL-001
- **Tenant context:** system_prompt + relevant KB docs luôn trong context

---

## 7. Human Escalation & Supporter Flow

### 7.1 Trigger Conditions

| Condition | Ví dụ |
|-----------|-------|
| Keyword trigger | "cần gặp nhân viên", "khiếu nại", "tôi muốn phản ánh" |
| Max turns | Bot trả lời >5 turns không giải quyết được |
| Low confidence | AI confidence < threshold |
| User request | Bấm nút "Kết nối nhân viên" |
| Tool error | API call thất bại liên tiếp |

### 7.2 Supporter Scope — Dynamic Assignment Model

**Quyết định:** Supporter scope là **linh động**, cấu hình per-tenant.

```typescript
interface SupporterScopeConfig {
  // Cấu hình bởi Admin trong SettingsPanel
  scope_mode: "assigned_only" | "all_escalated" | "team_pool"

  auto_assign_enabled: boolean       // Bật/tắt tự động assign
  auto_assign_strategy:
    | "round_robin"                  // Lần lượt theo thứ tự
    | "least_busy"                   // Supporter ít conv nhất
    | "online_first"                 // Ưu tiên supporter đang online
    | "manual"                       // Admin assign tay hoàn toàn

  require_online_for_auto: boolean   // Chỉ auto-assign khi online
  fallback_if_no_online: "queue" | "notify_all" | "assign_anyway"
  max_concurrent_per_supporter: number  // Giới hạn conv đồng thời / người
}
```

**Scope modes:**

| Mode | Mô tả | Use case |
|------|-------|----------|
| `assigned_only` | Supporter chỉ thấy conv được assign cho mình | Team lớn, chuyên biệt hóa |
| `all_escalated` | Tất cả supporter thấy toàn bộ escalated queue, ai nhận thì nhận | Team nhỏ, linh hoạt |
| `team_pool` | Admin tạo nhóm supporter, pool theo nhóm | Hỗ trợ theo ca/bộ phận |

### 7.3 Online Presence & Auto-Assignment

```typescript
// Bảng supporter_presence (mới)
interface SupporterPresence {
  supporter_id: string              // FK profiles
  organization_id: string
  status: "online" | "away" | "offline" | "busy"
  last_heartbeat: timestamp         // Ping mỗi 30s từ browser
  active_conversation_count: number // Số conv đang handle
  max_capacity: number              // Từ SupporterScopeConfig
}
```

**Auto-assign logic (khi `auto_assign_enabled = true`):**

```
[Conversation escalated]
        │
        ▼
Query: supporters online + capacity < max_capacity
        │
        ├─ Có supporters online?
        │         │
        │    Apply strategy:
        │    - round_robin: next in rotation
        │    - least_busy: min(active_conversation_count)
        │    - online_first: prefer status="online" over "away"
        │         │
        │         ▼
        │    Auto-assign → notify supporter (Realtime)
        │
        └─ Không ai online?
                  │
             fallback_if_no_online:
             - "queue": để trong queue, notify khi có người online
             - "notify_all": push notify tất cả supporter dù offline
             - "assign_anyway": assign cho least_busy dù offline
```

### 7.4 Escalation & Assignment Full Flow

```
[Bot detect trigger]
        │
        ▼
Bot: "Tôi sẽ kết nối bạn với nhân viên hỗ trợ.
      Vui lòng chờ trong giây lát..."
        │
        ▼
conversation.status = "escalated"
conversation.escalation_reason = "keyword|max_turns|confidence|manual"
        │
        ▼
Auto-assign check (if enabled)
  ├─ Online supporter available?
  │     → assign ngay → conversation.status = "assigned"
  └─ Nobody online?
        → conversation.status = "queued" (mới)
        → fallback strategy apply
        │
        ▼
[Supabase Realtime → notify assigned supporter]
        │
        ▼
Supporter mở ChatPanel
  → thấy full conversation history (bot + user)
  → thấy user context (device, location, session info)
  → type message → gửi trực tiếp
        │
        ▼
Supporter actions:
  "Đã giải quyết" → status = "resolved"
  "Chuyển người khác" → re-assign (manual pick hoặc auto)
  "Gọi bot hỗ trợ" → bot tiếp tục, supporter observe
```

**Conversation status state machine (updated):**

```
unresolved → escalated → queued → assigned → resolved
                    └──────────────────────────────→ resolved (nếu không có supporter)
```

### 7.5 Supporter Dashboard

**View phụ thuộc `scope_mode`:**

```
Supporter Dashboard (Tab "Hỗ trợ")
├── [scope=assigned_only]  Conversations của tôi
│     ├── Đang chờ (queued, chưa nhận)
│     ├── Đang xử lý (assigned to me)
│     └── Đã hoàn thành hôm nay
│
├── [scope=all_escalated]  Queue chung
│     ├── Tất cả escalated (ai cũng thấy)
│     ├── Button "Nhận conversation này"
│     └── Conversations tôi đang handle
│
└── [scope=team_pool]  Pool của nhóm
      ├── Queue nhóm
      └── Conversations đang xử lý trong nhóm

Common actions:
  - Conversation detail: lịch sử bot + user
  - Live chat input
  - "Đã giải quyết" / "Chuyển" / "Gọi bot"
  - Trạng thái online của mình (toggle)
```

---

## 8. MCP (Model Context Protocol) Integration

### 8.1 Mục đích

MCP cho phép Admin register các "MCP Servers" — external data sources mà bot có thể query theo chuẩn protocol. Thay vì hardcode API calls, MCP server expose tools theo chuẩn.

### 8.2 MCP Config per Tenant

```typescript
interface MCPServerConfig {
  id: string
  organization_id: string
  server_name: string               // "ITL Logistics API"
  server_url: string                // ws://... hoặc https://...
  transport: "stdio" | "sse" | "websocket"
  auth_config?: Record<string, string>

  // Tools exposed by this MCP server
  available_tools: {
    name: string
    description: string
    input_schema: JSONSchema
  }[]

  enabled: boolean
}
```

### 8.3 Skills System

Skills = pre-built workflows phức tạp hơn single tool:

```typescript
interface Skill {
  id: string
  skill_name: string                // "complete_booking_flow"
  trigger_intents: string[]         // Intent nào trigger skill này

  steps: SkillStep[]                // Multi-step workflow
}

interface SkillStep {
  step_name: string
  action: "llm" | "tool" | "ask_user" | "condition"
  config: Record<string, any>
}
```

**Ví dụ Skill "Tạo đơn hàng mới":**
```
Step 1: ask_user → "Địa chỉ lấy hàng?"
Step 2: ask_user → "Địa chỉ giao hàng?"
Step 3: tool → get_route_info(from, to)
Step 4: llm → "Tuyến đường này có phù hợp không?"
Step 5: tool → create_shipment(from, to, details)
Step 6: text → "Đơn hàng {id} đã được tạo thành công!"
```

---

## 9. Widget Configuration

### 9.1 Embed Code

```html
<!-- Tenant nhúng vào phần mềm ITL -->
<script>
  window.AgentHubConfig = {
    tenantId: "org_xxx",
    apiKey: "widget_key_xxx",
    userContext: {
      userId: "user_123",        // Optional: logged-in user
      userName: "Nguyễn Văn A",
      userRole: "dispatcher"
    }
  };
</script>
<script src="https://agenthub.itl.vn/widget.js" async></script>
```

### 9.2 Widget Settings per Tenant

```typescript
interface WidgetConfig {
  // Appearance
  primary_color: string          // Brand color
  position: "bottom-right" | "bottom-left"
  initial_state: "open" | "closed"

  // Behavior
  show_branding: boolean         // "Powered by AgentHub"
  enable_file_upload: boolean    // User có thể upload file
  enable_voice: boolean          // Voice input (future)

  // Context
  page_context_enabled: boolean  // Widget nhận context từ page (route hiện tại)

  // Persona (inherit từ ChatbotPersonaConfig)
}
```

---

## 10. Data Model Changes Required

### 10.1 Thay Đổi DB Schema

```sql
-- ============================================================
-- MIGRATION: ITL AgentHub v1.1
-- ============================================================

-- 1. Thêm supporter role vào enum
ALTER TYPE org_role ADD VALUE 'supporter';

-- 2. Thêm trạng thái conversation mới
ALTER TYPE conversation_status ADD VALUE 'queued';
ALTER TYPE conversation_status ADD VALUE 'assigned';

-- 3. Mở rộng organizations table (Persona + Escalation config)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bot_name TEXT DEFAULT 'Trợ lý AI',
  ADD COLUMN IF NOT EXISTS bot_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'friendly'
    CHECK (tone IN ('formal', 'friendly', 'professional', 'casual')),
  ADD COLUMN IF NOT EXISTS response_language TEXT DEFAULT 'vi'
    CHECK (response_language IN ('vi', 'en', 'auto')),
  ADD COLUMN IF NOT EXISTS fallback_message TEXT
    DEFAULT 'Xin lỗi, tôi chưa có thông tin về vấn đề này.',
  ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[]
    DEFAULT ARRAY['cần người hỗ trợ', 'gặp nhân viên'],
  ADD COLUMN IF NOT EXISTS max_bot_turns INTEGER DEFAULT 10,
  -- Widget appearance
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS widget_position TEXT DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS show_branding BOOLEAN DEFAULT true,
  -- Supporter assignment config
  ADD COLUMN IF NOT EXISTS supporter_scope_mode TEXT DEFAULT 'assigned_only'
    CHECK (supporter_scope_mode IN ('assigned_only', 'all_escalated', 'team_pool')),
  ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_assign_strategy TEXT DEFAULT 'least_busy'
    CHECK (auto_assign_strategy IN ('round_robin', 'least_busy', 'online_first', 'manual')),
  ADD COLUMN IF NOT EXISTS require_online_for_auto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_if_no_online TEXT DEFAULT 'queue'
    CHECK (fallback_if_no_online IN ('queue', 'notify_all', 'assign_anyway')),
  ADD COLUMN IF NOT EXISTS max_concurrent_per_supporter INTEGER DEFAULT 5;

-- 4. Bảng conversation_assignments (mới)
CREATE TABLE IF NOT EXISTS conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),     -- NULL nếu auto-assigned
  assigned_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  transfer_reason TEXT,                          -- Nếu chuyển từ supporter khác
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'transferred', 'resolved'))
);

-- 5. Bảng supporter_presence (mới)
CREATE TABLE IF NOT EXISTS supporter_presence (
  supporter_id UUID PRIMARY KEY REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'offline'
    CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  active_conversation_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Bảng tenant_tools (mới)
CREATE TABLE IF NOT EXISTS tenant_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,           -- LLM sử dụng để quyết định dùng tool
  endpoint_url TEXT NOT NULL,
  method TEXT DEFAULT 'GET'
    CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  auth_type TEXT DEFAULT 'bearer'
    CHECK (auth_type IN ('bearer', 'api_key', 'basic', 'none')),
  auth_credential_key TEXT,            -- FK tới tenant_credentials.credential_key
  input_schema JSONB NOT NULL,         -- JSON Schema của entities cần extract
  extraction_config JSONB,             -- EntityExtractionConfig per tool
  output_template TEXT,                -- Handlebars template
  response_type TEXT DEFAULT 'text'
    CHECK (response_type IN ('text', 'card', 'table', 'list', 'action_buttons', 'status_badge')),
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Bảng tenant_credentials (mới, thay auth_config trực tiếp)
CREATE TABLE IF NOT EXISTS tenant_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  credential_key TEXT NOT NULL,        -- "itl_api_bearer", "webhook_secret"
  credential_value TEXT NOT NULL,      -- Encrypted (AES-256-GCM)
  scope TEXT DEFAULT 'tool'
    CHECK (scope IN ('tool', 'mcp', 'webhook')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, credential_key)
);

-- 8. Bảng mcp_servers (mới)
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  transport TEXT DEFAULT 'sse'
    CHECK (transport IN ('stdio', 'sse', 'websocket')),
  auth_credential_key TEXT,            -- FK tới tenant_credentials
  available_tools JSONB,               -- Cached từ MCP handshake
  enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Mở rộng conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS assigned_supporter_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS bot_turns_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT
    CHECK (escalation_reason IN ('keyword', 'max_turns', 'low_confidence', 'tool_error', 'manual', NULL));

-- 10. Mở rộng knowledge_base_documents
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'manual'
    CHECK (document_type IN ('manual', 'faq', 'api_schema', 'workflow')),
  ADD COLUMN IF NOT EXISTS domain_tags TEXT[],
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS file_version TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conversation
  ON conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_supporter
  ON conversation_assignments(supporter_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_supporter_presence_org_status
  ON supporter_presence(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_tools_org
  ON tenant_tools(organization_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_mcp_servers_org
  ON mcp_servers(organization_id) WHERE enabled = true;
```

### 10.2 Conversation Status State Machine (Updated)

```
unresolved
    │
    ├─ [trigger] → escalated
    │                  │
    │                  ├─ [auto-assign success] → assigned
    │                  ├─ [no supporter] → queued
    │                  │                      │
    │                  │                  [supporter online] → assigned
    │                  │
    │                  └─ [manual assign] → assigned
    │                                           │
    │                                      [transfer] → assigned (new supporter)
    │                                           │
    │                                      [resolve] → resolved
    │
    └─ [resolved directly] → resolved
```

### 10.3 Supabase Types Update

Sau khi migrate, regenerate: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`

---

## 11. Frontend Feature Roadmap

### Phase 1 — Foundation (Admin Config)

**Mục tiêu:** Admin có thể fully configure chatbot persona và KB

| Feature | Component | Priority |
|---------|-----------|----------|
| Chatbot persona form (name, tone, system_prompt) | `SettingsPanel.tsx` mở rộng | P0 |
| Escalation config (keywords, max turns) | `SettingsPanel.tsx` | P0 |
| Widget appearance config (color, position) | `SettingsPanel.tsx` | P1 |
| KB document type tagging | `KnowledgeBase.tsx` | P1 |
| Supporter role assignment | `AdminDashboard.tsx` / `OrgMembers.tsx` | P0 |

### Phase 2 — Supporter Flow

| Feature | Component | Priority |
|---------|-----------|----------|
| Supporter dashboard tab | `AdminDashboard.tsx` | P0 |
| Escalated conversations queue | `InboxList.tsx` filter | P0 |
| Assign conversation to supporter | `ChatPanel.tsx` | P0 |
| Live chat interface cho supporter | `ChatPanel.tsx` | P0 |
| Realtime notifications | Supabase Realtime | P0 |

### Phase 3 — API Tools & Skills

| Feature | Component | Priority |
|---------|-----------|----------|
| Tool builder UI | `ToolsPanel.tsx` (mới) | P0 |
| Tool testing interface | `ToolsPanel.tsx` | P1 |
| MCP server config | `MCPPanel.tsx` (mới) | P1 |
| Skill builder | `SkillsPanel.tsx` (mới) | P2 |
| Response type preview | `ChatPanel.tsx` | P1 |

### Phase 4 — Analytics & Polish

| Feature | Component | Priority |
|---------|-----------|----------|
| Conversation analytics | `AnalyticsPanel.tsx` (mới) | P2 |
| Bot performance metrics | `AnalyticsPanel.tsx` | P2 |
| Export conversations | `AdminDashboard.tsx` | P2 |
| Widget customization preview | `SettingsPanel.tsx` | P1 |

---

## 12. Admin Dashboard Navigation (Target)

```
AdminDashboard
├── Hộp thư (Inbox)                   ← hiện có
│   ├── Tất cả
│   ├── Chưa giải quyết
│   ├── Đang leo thang (Escalated)    ← highlight
│   └── Đã giải quyết
│
├── Hỗ trợ (Supporter View)           ← mới
│   ├── Cần assign
│   └── Đang xử lý
│
├── Knowledge Base                     ← hiện có, mở rộng
│   ├── Tài liệu hướng dẫn
│   ├── FAQ
│   └── API Schema
│
├── Công cụ (Tools)                   ← mới
│   ├── Danh sách tools
│   ├── Thêm API tool
│   └── MCP Servers
│
├── Cấu hình Chatbot                  ← mở rộng từ Settings
│   ├── Persona & Style
│   ├── System Prompt
│   ├── Ngôn ngữ & Tone
│   └── Escalation Rules
│
└── Cài đặt                           ← hiện có
    ├── Widget & Embed code
    ├── AI Model
    ├── Thành viên
    └── Tài khoản
```

---

## 13. Backend Integration Points

### 13.1 Supabase Edge Functions (hiện tại)

- `send-message` — gửi message, trigger AI response
- `enhance-message` — AI enhance supporter draft

### 13.2 Edge Functions cần thêm

| Function | Mô tả |
|----------|-------|
| `process-tool-call` | Execute tenant tool với entity params |
| `extract-entities` | NLP extract entities từ message |
| `escalate-conversation` | Trigger escalation workflow |
| `assign-conversation` | Assign conversation to supporter |
| `sync-kb-embeddings` | Re-embed KB docs khi thêm mới |

### 13.3 Backend API (FastAPI) — Key Endpoints

```
POST /api/v1/chat/{tenant_id}
  → Router Agent → Intent → RAG/Tool/Escalate

POST /api/v1/tools/{tenant_id}/test
  → Test a tool config với sample entities

POST /api/v1/kb/{tenant_id}/ingest
  → Ingest document → chunking → embedding → pgvector

GET  /api/v1/mcp/{tenant_id}/tools
  → List available MCP tools for tenant
```

---

## 14. Security & Multi-Tenancy

### 14.1 Tenant Isolation

- Tất cả queries có `WHERE organization_id = :tenant_id`
- Supabase RLS policies enforce tenant isolation
- KB embeddings filtered by `metadata.organization_id`
- Tool credentials encrypted (AES-256) trước khi lưu DB

### 14.2 Widget Security

- Widget API key scope chỉ cho write messages + read own conversation
- User context từ widget không được trust hoàn toàn (validate server-side)
- Rate limiting per tenant per IP

### 14.3 API Tool Credentials — Per-Tenant

**Quyết định:** Mỗi tenant có credentials riêng biệt hoàn toàn.

```typescript
interface TenantCredential {
  organization_id: string       // Strict per-tenant isolation
  credential_key: string        // "itl_api_bearer", "itl_webhook_secret"
  credential_value: string      // Encrypted (AES-256-GCM, key từ env)
  scope: "tool" | "mcp" | "webhook"
  tool_id?: string              // Nếu scope = "tool", link tới tenant_tools
}
```

- Tenant A và Tenant B hoàn toàn độc lập — không chia sẻ API key
- Credentials không bao giờ expose ra frontend (chỉ backend decrypt)
- Admin nhập credentials qua form bảo mật → lưu encrypted
- Rotation: Admin có thể update credentials bất kỳ lúc nào
- Audit log: mọi lần credential được dùng → log (không log giá trị)

---

## 15. Decisions Log

| # | Câu hỏi | Quyết định | Rationale |
|---|---------|-----------|-----------|
| 1 | Supporter scope | **Dynamic** — configurable per-tenant: `assigned_only`, `all_escalated`, `team_pool` | Linh hoạt cho mọi quy mô team |
| 2 | Auto-assign strategy | **Configurable**: round_robin / least_busy / online_first / manual | Admin chọn phù hợp với quy trình |
| 3 | Entity extraction | **Dynamic hybrid**: regex_only / llm_only / hybrid_llm_regex / hybrid_ner_llm — configurable per-tool | Tốc độ + accuracy tùy trường hợp |
| 4 | ITL API credentials | **Per-tenant riêng**, bảng `tenant_credentials` encrypted | Isolation hoàn toàn giữa tenants |
| 5 | Tool auth storage | **Encrypted column** (`tenant_credentials` table, AES-256-GCM) | Đơn giản hơn Vault, đủ bảo mật |
| 6 | Widget realtime | **Supabase Realtime** | Đã có infrastructure, không cần thêm WebSocket server |
| 7 | Memory | **Supabase** cho persistence + **Redis** (backend) cho session cache | Best of both worlds |
| 8 | Skills builder | **YAML/JSON config trước**, visual builder là Phase 4+ | Avoid over-engineering |
| 9 | Chatbot persona UI | **Chưa ưu tiên** — component sẽ có nhưng không block các phase khác | Backend có thể test qua API |

## 16. Open Questions

| # | Câu hỏi | Priority |
|---|---------|----------|
| 1 | Multi-language KB: cần embedding model tiếng Việt riêng hay multilingual (e.g. `paraphrase-multilingual-MiniLM-L12-v2`)? | Medium |
| 2 | Supporter presence heartbeat: browser ping mỗi 30s đủ không, hay cần WebSocket persistent connection? | Medium |
| 3 | Team pool: khi `scope=team_pool`, ai tạo và quản lý nhóm — admin hay tự supporter? | Low |
| 4 | Tool test sandbox: khi admin test tool, có gọi API thật không hay cần mock mode? | Medium |

---

## 16. Success Metrics

| Metric | Target |
|--------|--------|
| Bot resolution rate (không cần escalate) | > 70% |
| API tool call success rate | > 95% |
| P50 response time | < 2s |
| Entity extraction accuracy | > 90% |
| Escalation → supporter response time | < 5 phút |
| KB search relevance | > 85% top-3 accuracy |

---

*Tài liệu này là living document — cập nhật khi có quyết định mới.*
