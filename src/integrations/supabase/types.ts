export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contact_sessions: {
        Row: {
          browser: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          location: string | null
          name: string
          organization_id: string
          os: string | null
          timezone: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          location?: string | null
          name: string
          organization_id: string
          os?: string | null
          timezone?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          os?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          conversation_id: string
          created_at: string
          id: string
          resolved_at: string | null
          status: string
          supporter_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          supporter_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          supporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_supporter_id: string | null
          assigned_to: string | null
          contact_session_id: string
          created_at: string
          id: string
          last_message: string | null
          organization_id: string
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
        }
        Insert: {
          assigned_supporter_id?: string | null
          assigned_to?: string | null
          contact_session_id: string
          created_at?: string
          id?: string
          last_message?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Update: {
          assigned_supporter_id?: string | null
          assigned_to?: string | null
          contact_session_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_session_id_fkey"
            columns: ["contact_session_id"]
            isOneToOne: false
            referencedRelation: "contact_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_documents: {
        Row: {
          content: string
          created_at: string
          file_url: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          content_type: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          content_type?: Database["public"]["Enums"]["message_content_type"]
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_model: string | null
          auto_assign_enabled: boolean
          auto_assign_strategy: string
          created_at: string
          fallback_if_no_online: string
          id: string
          max_concurrent_per_supporter: number
          name: string
          require_online_for_auto: boolean
          supporter_scope_mode: string
          updated_at: string
          widget_greeting: string | null
        }
        Insert: {
          ai_model?: string | null
          auto_assign_enabled?: boolean
          auto_assign_strategy?: string
          created_at?: string
          fallback_if_no_online?: string
          id?: string
          max_concurrent_per_supporter?: number
          name: string
          require_online_for_auto?: boolean
          supporter_scope_mode?: string
          updated_at?: string
          widget_greeting?: string | null
        }
        Update: {
          ai_model?: string | null
          auto_assign_enabled?: boolean
          auto_assign_strategy?: string
          created_at?: string
          fallback_if_no_online?: string
          id?: string
          max_concurrent_per_supporter?: number
          name?: string
          require_online_for_auto?: boolean
          supporter_scope_mode?: string
          updated_at?: string
          widget_greeting?: string | null
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supporter_presence: {
        Row: {
          active_conversation_count: number
          created_at: string
          id: string
          last_heartbeat: string
          organization_id: string
          status: string
          supporter_id: string
          updated_at: string
        }
        Insert: {
          active_conversation_count?: number
          created_at?: string
          id?: string
          last_heartbeat?: string
          organization_id: string
          status?: string
          supporter_id: string
          updated_at?: string
        }
        Update: {
          active_conversation_count?: number
          created_at?: string
          id?: string
          last_heartbeat?: string
          organization_id?: string
          status?: string
          supporter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supporter_presence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_credentials: {
        Row: {
          created_at: string
          credential_key: string
          credential_value: string
          description: string | null
          id: string
          organization_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_key: string
          credential_value: string
          description?: string | null
          id?: string
          organization_id: string
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_key?: string
          credential_value?: string
          description?: string | null
          id?: string
          organization_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_tools: {
        Row: {
          auth_header_name: string | null
          auth_type: string
          created_at: string
          credential_key: string | null
          description: string
          display_name: string
          enabled: boolean
          endpoint_url: string
          entity_extraction_strategy: string
          http_method: string
          id: string
          input_schema: Json
          organization_id: string
          output_template: string | null
          response_type: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          auth_header_name?: string | null
          auth_type?: string
          created_at?: string
          credential_key?: string | null
          description?: string
          display_name: string
          enabled?: boolean
          endpoint_url: string
          entity_extraction_strategy?: string
          http_method?: string
          id?: string
          input_schema?: Json
          organization_id: string
          output_template?: string | null
          response_type?: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          auth_header_name?: string | null
          auth_type?: string
          created_at?: string
          credential_key?: string | null
          description?: string
          display_name?: string
          enabled?: boolean
          endpoint_url?: string
          entity_extraction_strategy?: string
          http_method?: string
          id?: string
          input_schema?: Json
          organization_id?: string
          output_template?: string | null
          response_type?: string
          tool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_active_conversations: {
        Args: { p_supporter_id: string }
        Returns: undefined
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      conversation_status:
        | "unresolved"
        | "escalated"
        | "resolved"
        | "queued"
        | "assigned"
      message_content_type: "text" | "tool_call"
      message_role: "user" | "assistant" | "system"
      org_role: "admin" | "member" | "supporter"
      platform_role: "super_admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      conversation_status: [
        "unresolved",
        "escalated",
        "resolved",
        "queued",
        "assigned",
      ],
      message_content_type: ["text", "tool_call"],
      message_role: ["user", "assistant", "system"],
      org_role: ["admin", "member", "supporter"],
      platform_role: ["super_admin", "user"],
    },
  },
} as const
