export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          floor_area_sqft: number | null
          id: string
          notes: string | null
          owner_id: string
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          floor_area_sqft?: number | null
          id?: string
          notes?: string | null
          owner_id: string
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          floor_area_sqft?: number | null
          id?: string
          notes?: string | null
          owner_id?: string
          postal_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          external_message_id: string | null
          id: string
          rent_cycle_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          template_key: string
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          external_message_id?: string | null
          id?: string
          rent_cycle_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          template_key: string
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          external_message_id?: string | null
          id?: string
          rent_cycle_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          template_key?: string
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_rent_cycle_id_fkey"
            columns: ["rent_cycle_id"]
            isOneToOne: false
            referencedRelation: "rent_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_cycles: {
        Row: {
          amount_sgd: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["rent_cycle_status"]
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          amount_sgd: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["rent_cycle_status"]
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          amount_sgd?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["rent_cycle_status"]
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_cycles_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          created_at: string
          deposit_sgd: number
          end_date: string
          id: string
          monthly_rent_sgd: number
          payment_day: number
          property_id: string
          prospective_tenant: Json | null
          start_date: string
          status: Database["public"]["Enums"]["tenancy_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_sgd?: number
          end_date: string
          id?: string
          monthly_rent_sgd: number
          payment_day: number
          property_id: string
          prospective_tenant?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_sgd?: number
          end_date?: string
          id?: string
          monthly_rent_sgd?: number
          payment_day?: number
          property_id?: string
          prospective_tenant?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_agreements: {
        Row: {
          clauses: Json
          created_at: string
          generated_at: string
          id: string
          pdf_storage_path: string | null
          signature_method:
            | Database["public"]["Enums"]["signature_method"]
            | null
          signed_at: string | null
          status: Database["public"]["Enums"]["agreement_status"]
          tenancy_id: string
          updated_at: string
          version: number
        }
        Insert: {
          clauses?: Json
          created_at?: string
          generated_at?: string
          id?: string
          pdf_storage_path?: string | null
          signature_method?:
            | Database["public"]["Enums"]["signature_method"]
            | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          tenancy_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          clauses?: Json
          created_at?: string
          generated_at?: string
          id?: string
          pdf_storage_path?: string | null
          signature_method?:
            | Database["public"]["Enums"]["signature_method"]
            | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          tenancy_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_agreements_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json
          author_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_triage_data: Json | null
          created_at: string
          description: string
          id: string
          reporter_id: string
          responsibility: Database["public"]["Enums"]["ticket_responsibility"]
          severity: Database["public"]["Enums"]["ticket_severity"]
          status: Database["public"]["Enums"]["ticket_status"]
          tenancy_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_triage_data?: Json | null
          created_at?: string
          description?: string
          id?: string
          reporter_id: string
          responsibility?: Database["public"]["Enums"]["ticket_responsibility"]
          severity?: Database["public"]["Enums"]["ticket_severity"]
          status?: Database["public"]["Enums"]["ticket_status"]
          tenancy_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_triage_data?: Json | null
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          responsibility?: Database["public"]["Enums"]["ticket_responsibility"]
          severity?: Database["public"]["Enums"]["ticket_severity"]
          status?: Database["public"]["Enums"]["ticket_status"]
          tenancy_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      users_profile: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          singpass_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          singpass_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          singpass_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agreement_status: "draft" | "sent" | "signed" | "expired"
      property_type: "hdb" | "condo" | "landed"
      reminder_channel: "whatsapp" | "email" | "sms"
      reminder_status: "scheduled" | "sent" | "failed" | "cancelled"
      rent_cycle_status: "pending" | "paid" | "late" | "waived"
      signature_method: "manual" | "singpass" | "esign_partner"
      tenancy_status: "draft" | "active" | "ended" | "terminated"
      ticket_responsibility: "landlord" | "tenant" | "disputed" | "undetermined"
      ticket_severity: "low" | "medium" | "high" | "urgent"
      ticket_status: "new" | "triaged" | "in_progress" | "resolved" | "closed"
      user_role: "landlord" | "tenant" | "both"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agreement_status: ["draft", "sent", "signed", "expired"],
      property_type: ["hdb", "condo", "landed"],
      reminder_channel: ["whatsapp", "email", "sms"],
      reminder_status: ["scheduled", "sent", "failed", "cancelled"],
      rent_cycle_status: ["pending", "paid", "late", "waived"],
      signature_method: ["manual", "singpass", "esign_partner"],
      tenancy_status: ["draft", "active", "ended", "terminated"],
      ticket_responsibility: ["landlord", "tenant", "disputed", "undetermined"],
      ticket_severity: ["low", "medium", "high", "urgent"],
      ticket_status: ["new", "triaged", "in_progress", "resolved", "closed"],
      user_role: ["landlord", "tenant", "both"],
    },
  },
} as const

