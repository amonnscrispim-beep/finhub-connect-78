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
      clients: {
        Row: {
          age: number | null
          already_invests: boolean | null
          birth_date: string | null
          children: Json | null
          city: string | null
          consulting_finished: boolean | null
          consulting_reason: string | null
          consulting_result: Json | null
          contract_end: string
          contract_start: string
          contracted_meetings: number | null
          country: string
          created_at: string
          current_wealth_notes: string | null
          debts: Json | null
          debts_comments: string | null
          email: string | null
          emergency_contributions_count: number | null
          emergency_coverage_months: number | null
          emergency_reserve: number | null
          emergency_reserve_note: string | null
          emergency_reserve_status: string | null
          emergency_start_month: number | null
          emergency_start_year: number | null
          files: Json | null
          financial_assets: number | null
          financial_institutions: string | null
          funnel_stage: string | null
          has_children: boolean | null
          id: string
          investing_origin: string | null
          investment_term: string | null
          investor_profile: string | null
          is_renewed_client: boolean | null
          last_activity_at: string | null
          long_term_goals: string | null
          married: boolean | null
          material_assets: number | null
          medium_term_goals: string | null
          meeting_notes: Json | null
          monthly_contribution: number | null
          monthly_living_cost: number | null
          monthly_revenue: number | null
          name: string
          objective: string | null
          observations: string | null
          organized_finances: string | null
          partner: Json | null
          partner_monthly_revenue: number | null
          pending_schedule: boolean | null
          phone: string | null
          portfolio_distribution: Json | null
          private_pension_status: string | null
          private_pension_type: string | null
          profession: string | null
          professional_profile: string | null
          renewal_date: string | null
          renewal_potential: boolean | null
          renewal_status: string | null
          renewed: boolean | null
          residence: string | null
          retirement_goal: Json | null
          scheduled_meeting: Json | null
          short_term_goals: string | null
          state: string | null
          updated_at: string
          user_id: string
          work_done: string | null
        }
        Insert: {
          age?: number | null
          already_invests?: boolean | null
          birth_date?: string | null
          children?: Json | null
          city?: string | null
          consulting_finished?: boolean | null
          consulting_reason?: string | null
          consulting_result?: Json | null
          contract_end?: string
          contract_start?: string
          contracted_meetings?: number | null
          country?: string
          created_at?: string
          current_wealth_notes?: string | null
          debts?: Json | null
          debts_comments?: string | null
          email?: string | null
          emergency_contributions_count?: number | null
          emergency_coverage_months?: number | null
          emergency_reserve?: number | null
          emergency_reserve_note?: string | null
          emergency_reserve_status?: string | null
          emergency_start_month?: number | null
          emergency_start_year?: number | null
          files?: Json | null
          financial_assets?: number | null
          financial_institutions?: string | null
          funnel_stage?: string | null
          has_children?: boolean | null
          id?: string
          investing_origin?: string | null
          investment_term?: string | null
          investor_profile?: string | null
          is_renewed_client?: boolean | null
          last_activity_at?: string | null
          long_term_goals?: string | null
          married?: boolean | null
          material_assets?: number | null
          medium_term_goals?: string | null
          meeting_notes?: Json | null
          monthly_contribution?: number | null
          monthly_living_cost?: number | null
          monthly_revenue?: number | null
          name: string
          objective?: string | null
          observations?: string | null
          organized_finances?: string | null
          partner?: Json | null
          partner_monthly_revenue?: number | null
          pending_schedule?: boolean | null
          phone?: string | null
          portfolio_distribution?: Json | null
          private_pension_status?: string | null
          private_pension_type?: string | null
          profession?: string | null
          professional_profile?: string | null
          renewal_date?: string | null
          renewal_potential?: boolean | null
          renewal_status?: string | null
          renewed?: boolean | null
          residence?: string | null
          retirement_goal?: Json | null
          scheduled_meeting?: Json | null
          short_term_goals?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          work_done?: string | null
        }
        Update: {
          age?: number | null
          already_invests?: boolean | null
          birth_date?: string | null
          children?: Json | null
          city?: string | null
          consulting_finished?: boolean | null
          consulting_reason?: string | null
          consulting_result?: Json | null
          contract_end?: string
          contract_start?: string
          contracted_meetings?: number | null
          country?: string
          created_at?: string
          current_wealth_notes?: string | null
          debts?: Json | null
          debts_comments?: string | null
          email?: string | null
          emergency_contributions_count?: number | null
          emergency_coverage_months?: number | null
          emergency_reserve?: number | null
          emergency_reserve_note?: string | null
          emergency_reserve_status?: string | null
          emergency_start_month?: number | null
          emergency_start_year?: number | null
          files?: Json | null
          financial_assets?: number | null
          financial_institutions?: string | null
          funnel_stage?: string | null
          has_children?: boolean | null
          id?: string
          investing_origin?: string | null
          investment_term?: string | null
          investor_profile?: string | null
          is_renewed_client?: boolean | null
          last_activity_at?: string | null
          long_term_goals?: string | null
          married?: boolean | null
          material_assets?: number | null
          medium_term_goals?: string | null
          meeting_notes?: Json | null
          monthly_contribution?: number | null
          monthly_living_cost?: number | null
          monthly_revenue?: number | null
          name?: string
          objective?: string | null
          observations?: string | null
          organized_finances?: string | null
          partner?: Json | null
          partner_monthly_revenue?: number | null
          pending_schedule?: boolean | null
          phone?: string | null
          portfolio_distribution?: Json | null
          private_pension_status?: string | null
          private_pension_type?: string | null
          profession?: string | null
          professional_profile?: string | null
          renewal_date?: string | null
          renewal_potential?: boolean | null
          renewal_status?: string | null
          renewed?: boolean | null
          residence?: string | null
          retirement_goal?: Json | null
          scheduled_meeting?: Json | null
          short_term_goals?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          work_done?: string | null
        }
        Relationships: []
      }
      crm_meetings: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          created_at: string
          description: string | null
          end_at: string
          google_event_id: string | null
          id: string
          start_at: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          description?: string | null
          end_at: string
          google_event_id?: string | null
          id?: string
          start_at: string
          timezone?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          description?: string | null
          end_at?: string
          google_event_id?: string | null
          id?: string
          start_at?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          annual_interest_rate: number | null
          client_id: string
          created_at: string
          current_amount: number | null
          deadline_months: number | null
          goal_type: string | null
          id: string
          monthly_contribution: number | null
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_interest_rate?: number | null
          client_id: string
          created_at?: string
          current_amount?: number | null
          deadline_months?: number | null
          goal_type?: string | null
          id?: string
          monthly_contribution?: number | null
          name?: string
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_interest_rate?: number | null
          client_id?: string
          created_at?: string
          current_amount?: number | null
          deadline_months?: number | null
          goal_type?: string | null
          id?: string
          monthly_contribution?: number | null
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          client_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_oauth: {
        Row: {
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
