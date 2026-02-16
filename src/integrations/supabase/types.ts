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
      client_performance_reports: {
        Row: {
          alerts: Json | null
          broker: string | null
          client_id: string
          commercial_summary: string | null
          consultant_conclusion: string | null
          created_at: string
          extracted_data: Json | null
          id: string
          manual_overrides: Json | null
          pdf_filename: string | null
          pdf_url: string | null
          report_date: string | null
          report_type: string | null
          technical_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: Json | null
          broker?: string | null
          client_id: string
          commercial_summary?: string | null
          consultant_conclusion?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          manual_overrides?: Json | null
          pdf_filename?: string | null
          pdf_url?: string | null
          report_date?: string | null
          report_type?: string | null
          technical_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: Json | null
          broker?: string | null
          client_id?: string
          commercial_summary?: string | null
          consultant_conclusion?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          manual_overrides?: Json | null
          pdf_filename?: string | null
          pdf_url?: string | null
          report_date?: string | null
          report_type?: string | null
          technical_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_performance_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_assets: {
        Row: {
          asset_class: string
          client_id: string
          created_at: string
          current_price: number | null
          display_order: number
          fair_price: number | null
          id: string
          liquidity_days: number | null
          maturity_date: string | null
          name: string
          notes: string | null
          recommendation: string
          recommendation_date: string | null
          target_weight: number
          ticker: string
          tir_pct: number | null
          updated_at: string
          upside_pct: number | null
          user_id: string
        }
        Insert: {
          asset_class?: string
          client_id: string
          created_at?: string
          current_price?: number | null
          display_order?: number
          fair_price?: number | null
          id?: string
          liquidity_days?: number | null
          maturity_date?: string | null
          name?: string
          notes?: string | null
          recommendation?: string
          recommendation_date?: string | null
          target_weight?: number
          ticker: string
          tir_pct?: number | null
          updated_at?: string
          upside_pct?: number | null
          user_id: string
        }
        Update: {
          asset_class?: string
          client_id?: string
          created_at?: string
          current_price?: number | null
          display_order?: number
          fair_price?: number | null
          id?: string
          liquidity_days?: number | null
          maturity_date?: string | null
          name?: string
          notes?: string | null
          recommendation?: string
          recommendation_date?: string | null
          target_weight?: number
          ticker?: string
          tir_pct?: number | null
          updated_at?: string
          upside_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_performance: {
        Row: {
          client_id: string
          created_at: string
          deposits: number
          final_value: number
          id: string
          initial_value: number
          month: string
          return_pct: number | null
          updated_at: string
          user_id: string
          withdrawals: number
        }
        Insert: {
          client_id: string
          created_at?: string
          deposits?: number
          final_value?: number
          id?: string
          initial_value?: number
          month: string
          return_pct?: number | null
          updated_at?: string
          user_id: string
          withdrawals?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          deposits?: number
          final_value?: number
          id?: string
          initial_value?: number
          month?: string
          return_pct?: number | null
          updated_at?: string
          user_id?: string
          withdrawals?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_previous_values: {
        Row: {
          client_id: string
          created_at: string
          id: string
          previous_value: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          previous_value?: number
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          previous_value?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_previous_values_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_reports: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_simulations: {
        Row: {
          aporte: number
          client_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aporte?: number
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aporte?: number
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          age: number | null
          already_invests: boolean | null
          birth_date: string | null
          business_assets: number | null
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
          kanban_order: number | null
          last_activity_at: string | null
          long_term_goals: string | null
          married: boolean | null
          material_assets: number | null
          medium_term_goals: string | null
          meeting_notes: Json | null
          module_notes: Json | null
          monthly_contribution: number | null
          monthly_living_cost: number | null
          monthly_revenue: number | null
          name: string
          objective: string | null
          observations: string | null
          organized_finances: string | null
          partner: Json | null
          partner_monthly_revenue: number | null
          passive_income: number | null
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
          strategic_diagnostic: Json | null
          succession_planning: string | null
          updated_at: string
          user_id: string
          work_done: string | null
        }
        Insert: {
          age?: number | null
          already_invests?: boolean | null
          birth_date?: string | null
          business_assets?: number | null
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
          kanban_order?: number | null
          last_activity_at?: string | null
          long_term_goals?: string | null
          married?: boolean | null
          material_assets?: number | null
          medium_term_goals?: string | null
          meeting_notes?: Json | null
          module_notes?: Json | null
          monthly_contribution?: number | null
          monthly_living_cost?: number | null
          monthly_revenue?: number | null
          name: string
          objective?: string | null
          observations?: string | null
          organized_finances?: string | null
          partner?: Json | null
          partner_monthly_revenue?: number | null
          passive_income?: number | null
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
          strategic_diagnostic?: Json | null
          succession_planning?: string | null
          updated_at?: string
          user_id: string
          work_done?: string | null
        }
        Update: {
          age?: number | null
          already_invests?: boolean | null
          birth_date?: string | null
          business_assets?: number | null
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
          kanban_order?: number | null
          last_activity_at?: string | null
          long_term_goals?: string | null
          married?: boolean | null
          material_assets?: number | null
          medium_term_goals?: string | null
          meeting_notes?: Json | null
          module_notes?: Json | null
          monthly_contribution?: number | null
          monthly_living_cost?: number | null
          monthly_revenue?: number | null
          name?: string
          objective?: string | null
          observations?: string | null
          organized_finances?: string | null
          partner?: Json | null
          partner_monthly_revenue?: number | null
          passive_income?: number | null
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
          strategic_diagnostic?: Json | null
          succession_planning?: string | null
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
      performance_positions: {
        Row: {
          ativo: string | null
          created_at: string
          id: string
          indexador: string | null
          percentual: number | null
          report_id: string
          taxa: number | null
          tipo: string | null
          user_id: string
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          ativo?: string | null
          created_at?: string
          id?: string
          indexador?: string | null
          percentual?: number | null
          report_id: string
          taxa?: number | null
          tipo?: string | null
          user_id: string
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          ativo?: string | null
          created_at?: string
          id?: string
          indexador?: string | null
          percentual?: number | null
          report_id?: string
          taxa?: number | null
          tipo?: string | null
          user_id?: string
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_positions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "performance_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reports: {
        Row: {
          alerts: Json | null
          broker: string | null
          client_id: string
          commercial_summary: string | null
          consultant_conclusion: string | null
          corretora: string | null
          created_at: string
          data_relatorio: string | null
          extracted_data: Json | null
          id: string
          manual_overrides: Json | null
          nome_arquivo: string | null
          patrimonio_bruto: number | null
          patrimonio_liquido: number | null
          pdf_filename: string | null
          pdf_url: string | null
          rent_12m: number | null
          rent_acumulada: number | null
          rent_ano: number | null
          rent_mes: number | null
          status: string
          technical_summary: string | null
          tipo_relatorio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: Json | null
          broker?: string | null
          client_id: string
          commercial_summary?: string | null
          consultant_conclusion?: string | null
          corretora?: string | null
          created_at?: string
          data_relatorio?: string | null
          extracted_data?: Json | null
          id?: string
          manual_overrides?: Json | null
          nome_arquivo?: string | null
          patrimonio_bruto?: number | null
          patrimonio_liquido?: number | null
          pdf_filename?: string | null
          pdf_url?: string | null
          rent_12m?: number | null
          rent_acumulada?: number | null
          rent_ano?: number | null
          rent_mes?: number | null
          status?: string
          technical_summary?: string | null
          tipo_relatorio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: Json | null
          broker?: string | null
          client_id?: string
          commercial_summary?: string | null
          consultant_conclusion?: string | null
          corretora?: string | null
          created_at?: string
          data_relatorio?: string | null
          extracted_data?: Json | null
          id?: string
          manual_overrides?: Json | null
          nome_arquivo?: string | null
          patrimonio_bruto?: number | null
          patrimonio_liquido?: number | null
          pdf_filename?: string | null
          pdf_url?: string | null
          rent_12m?: number | null
          rent_acumulada?: number | null
          rent_ano?: number | null
          rent_mes?: number | null
          status?: string
          technical_summary?: string | null
          tipo_relatorio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reports_client_id_fkey"
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
      study_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_slides: {
        Row: {
          content: string | null
          created_at: string
          display_order: number
          file_name: string | null
          file_type: string | null
          id: string
          image_url: string | null
          submodule_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          display_order?: number
          file_name?: string | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          submodule_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          display_order?: number
          file_name?: string | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          submodule_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_slides_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "study_submodules"
            referencedColumns: ["id"]
          },
        ]
      }
      study_submodules: {
        Row: {
          created_at: string
          display_order: number
          id: string
          module_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          module_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          module_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "study_modules"
            referencedColumns: ["id"]
          },
        ]
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
      normalize_kanban_order: {
        Args: { p_stage: string; p_user_id: string }
        Returns: Json
      }
      swap_kanban_order: {
        Args: { p_client_a: string; p_client_b: string }
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
