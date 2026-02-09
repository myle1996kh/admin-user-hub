import { Conversation, Message, ContactSession } from "./types";

export const mockSessions: ContactSession[] = [
  {
    id: "s1",
    name: "Nguyễn Văn A",
    email: "nguyenvana@gmail.com",
    organizationId: "org1",
    metadata: { os: "Windows 11", browser: "Chrome 120", location: "Hà Nội, VN", timezone: "Asia/Ho_Chi_Minh" },
    expiresAt: Date.now() + 86400000,
  },
  {
    id: "s2",
    name: "Trần Thị B",
    email: "tranthib@company.vn",
    organizationId: "org1",
    metadata: { os: "macOS 14", browser: "Safari 17", location: "TP.HCM, VN", timezone: "Asia/Ho_Chi_Minh" },
    expiresAt: Date.now() + 86400000,
  },
  {
    id: "s3",
    name: "John Smith",
    email: "john@startup.io",
    organizationId: "org1",
    metadata: { os: "macOS 14", browser: "Chrome 120", location: "San Francisco, US", timezone: "America/Los_Angeles" },
    expiresAt: Date.now() + 86400000,
  },
  {
    id: "s4",
    name: "Maria Garcia",
    email: "maria@enterprise.com",
    organizationId: "org1",
    metadata: { os: "Windows 11", browser: "Edge 120", location: "Madrid, ES", timezone: "Europe/Madrid" },
    expiresAt: Date.now() + 86400000,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    threadId: "t1",
    contactSessionId: "s1",
    organizationId: "org1",
    status: "escalated",
    lastMessage: "Tôi muốn nói chuyện với nhân viên hỗ trợ",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 120000,
  },
  {
    id: "c2",
    threadId: "t2",
    contactSessionId: "s2",
    organizationId: "org1",
    status: "unresolved",
    lastMessage: "Làm sao để tích hợp API vào website?",
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 300000,
  },
  {
    id: "c3",
    threadId: "t3",
    contactSessionId: "s3",
    organizationId: "org1",
    status: "unresolved",
    lastMessage: "How do I set up webhooks for my account?",
    createdAt: Date.now() - 14400000,
    updatedAt: Date.now() - 600000,
  },
  {
    id: "c4",
    threadId: "t4",
    contactSessionId: "s4",
    organizationId: "org1",
    status: "resolved",
    lastMessage: "Thank you! That solved my problem.",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
];

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", conversationId: "c1", role: "user", content: "Xin chào, tôi cần hỗ trợ về thanh toán", contentType: "text", createdAt: Date.now() - 3600000 },
    { id: "m2", conversationId: "c1", role: "assistant", content: "Xin chào! Tôi là trợ lý AI của Echo. Tôi có thể giúp gì cho bạn về thanh toán?", contentType: "text", createdAt: Date.now() - 3550000 },
    { id: "m3", conversationId: "c1", role: "user", content: "Tôi bị trừ tiền 2 lần cho cùng một giao dịch", contentType: "text", createdAt: Date.now() - 3500000 },
    { id: "m4", conversationId: "c1", role: "assistant", content: "Tôi hiểu bạn gặp vấn đề về trùng giao dịch. Để xử lý chính xác, tôi sẽ chuyển bạn đến nhân viên hỗ trợ trực tiếp.", contentType: "text", createdAt: Date.now() - 3450000 },
    { id: "m5", conversationId: "c1", role: "user", content: "Tôi muốn nói chuyện với nhân viên hỗ trợ", contentType: "text", createdAt: Date.now() - 120000 },
  ],
  c2: [
    { id: "m6", conversationId: "c2", role: "user", content: "Làm sao để tích hợp API vào website?", contentType: "text", createdAt: Date.now() - 300000 },
    { id: "m7", conversationId: "c2", role: "assistant", content: "Bạn có thể tích hợp Echo Widget bằng cách thêm đoạn script sau vào website:\n\n```html\n<script src=\"https://echo.ai/widget.js\" data-org-id=\"YOUR_ORG_ID\"></script>\n```\n\nBạn cần thêm thông tin gì nữa không?", contentType: "text", createdAt: Date.now() - 280000 },
  ],
  c3: [
    { id: "m8", conversationId: "c3", role: "user", content: "How do I set up webhooks for my account?", contentType: "text", createdAt: Date.now() - 600000 },
    { id: "m9", conversationId: "c3", role: "assistant", content: "To set up webhooks, go to Settings → Integrations → Webhooks. Click 'Add Endpoint' and provide your URL. You can choose which events to subscribe to.", contentType: "text", createdAt: Date.now() - 580000 },
  ],
  c4: [
    { id: "m10", conversationId: "c4", role: "user", content: "I can't find the export button for my data", contentType: "text", createdAt: Date.now() - 86400000 },
    { id: "m11", conversationId: "c4", role: "assistant", content: "The export feature is available in Settings → Data → Export. You can export your data in CSV or JSON format.", contentType: "text", createdAt: Date.now() - 86380000 },
    { id: "m12", conversationId: "c4", role: "user", content: "Thank you! That solved my problem.", contentType: "text", createdAt: Date.now() - 3600000 },
  ],
};
