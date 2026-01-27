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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          affiliation: string | null
          championship_id: string
          created_at: string | null
          email: string
          gender: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          affiliation?: string | null
          championship_id: string
          created_at?: string | null
          email: string
          gender: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliation?: string | null
          championship_id?: string
          created_at?: string | null
          email?: string
          gender?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          championship_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          championship_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          championship_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          athletes_per_heat: number | null
          batches: Json | null
          capacity: number
          championship_id: string
          created_at: string | null
          format: string
          gender: string
          gender_composition: string | null
          has_batches: boolean | null
          id: string
          max_age: number | null
          min_age: number | null
          name: string
          order_index: number | null
          price_cents: number
          rules: string | null
          team_config: Json | null
          team_size: number | null
          updated_at: string | null
        }
        Insert: {
          athletes_per_heat?: number | null
          batches?: Json | null
          capacity?: number
          championship_id: string
          created_at?: string | null
          format: string
          gender: string
          gender_composition?: string | null
          has_batches?: boolean | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
          order_index?: number | null
          price_cents?: number
          rules?: string | null
          team_config?: Json | null
          team_size?: number | null
          updated_at?: string | null
        }
        Update: {
          athletes_per_heat?: number | null
          batches?: Json | null
          capacity?: number
          championship_id?: string
          created_at?: string | null
          format?: string
          gender?: string
          gender_composition?: string | null
          has_batches?: boolean | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string
          order_index?: number | null
          price_cents?: number
          rules?: string | null
          team_config?: Json | null
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_day_wods: {
        Row: {
          championship_day_id: string
          created_at: string | null
          id: string
          order_num: number
          wod_id: string
        }
        Insert: {
          championship_day_id: string
          created_at?: string | null
          id?: string
          order_num: number
          wod_id: string
        }
        Update: {
          championship_day_id?: string
          created_at?: string | null
          id?: string
          order_num?: number
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_day_wods_championship_day_id_fkey"
            columns: ["championship_day_id"]
            isOneToOne: false
            referencedRelation: "championship_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_day_wods_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_days: {
        Row: {
          break_after_wod_number: number | null
          break_duration_minutes: number | null
          break_interval_minutes: number | null
          championship_id: string
          created_at: string | null
          date: string
          day_number: number
          enable_break: boolean | null
          id: string
          start_time: string | null
          updated_at: string | null
          wod_interval_minutes: number | null
        }
        Insert: {
          break_after_wod_number?: number | null
          break_duration_minutes?: number | null
          break_interval_minutes?: number | null
          championship_id: string
          created_at?: string | null
          date: string
          day_number: number
          enable_break?: boolean | null
          id?: string
          start_time?: string | null
          updated_at?: string | null
          wod_interval_minutes?: number | null
        }
        Update: {
          break_after_wod_number?: number | null
          break_duration_minutes?: number | null
          break_interval_minutes?: number | null
          championship_id?: string
          created_at?: string | null
          date?: string
          day_number?: number
          enable_break?: boolean | null
          id?: string
          start_time?: string | null
          updated_at?: string | null
          wod_interval_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "championship_days_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          asaas_wallet_id: string | null
          banner_url: string | null
          break_after_wod_number: number | null
          break_duration_minutes: number | null
          break_interval_minutes: number | null
          category_interval_minutes: number | null
          created_at: string | null
          date: string
          description: string | null
          enable_break: boolean | null
          id: string
          is_indexable: boolean | null
          is_published: boolean | null
          location: string
          logo_url: string | null
          name: string
          organizer_id: string
          pin_code: string | null
          pix_payload: string | null
          platform_fee_configuration: Json | null
          registration_end_date: string | null
          regulation: string | null
          slug: string
          start_time: string | null
          total_days: number | null
          transition_time_minutes: number | null
          updated_at: string | null
          wod_interval_minutes: number | null
        }
        Insert: {
          asaas_wallet_id?: string | null
          banner_url?: string | null
          break_after_wod_number?: number | null
          break_duration_minutes?: number | null
          break_interval_minutes?: number | null
          category_interval_minutes?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          enable_break?: boolean | null
          id?: string
          is_indexable?: boolean | null
          is_published?: boolean | null
          location: string
          logo_url?: string | null
          name: string
          organizer_id: string
          pin_code?: string | null
          pix_payload?: string | null
          platform_fee_configuration?: Json | null
          registration_end_date?: string | null
          regulation?: string | null
          slug: string
          start_time?: string | null
          total_days?: number | null
          transition_time_minutes?: number | null
          updated_at?: string | null
          wod_interval_minutes?: number | null
        }
        Update: {
          asaas_wallet_id?: string | null
          banner_url?: string | null
          break_after_wod_number?: number | null
          break_duration_minutes?: number | null
          break_interval_minutes?: number | null
          category_interval_minutes?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          enable_break?: boolean | null
          id?: string
          is_indexable?: boolean | null
          is_published?: boolean | null
          location?: string
          logo_url?: string | null
          name?: string
          organizer_id?: string
          pin_code?: string | null
          pix_payload?: string | null
          platform_fee_configuration?: Json | null
          registration_end_date?: string | null
          regulation?: string | null
          slug?: string
          start_time?: string | null
          total_days?: number | null
          transition_time_minutes?: number | null
          updated_at?: string | null
          wod_interval_minutes?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          championship_id: string | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          championship_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          championship_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_entries: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          heat_id: string
          id: string
          lane_number: number | null
          registration_id: string | null
          team_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          heat_id: string
          id?: string
          lane_number?: number | null
          registration_id?: string | null
          team_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          heat_id?: string
          id?: string
          lane_number?: number | null
          registration_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_entries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_entries_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_entries_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heats_view"
            referencedColumns: ["heat_id"]
          },
          {
            foreignKeyName: "heat_entries_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      heats: {
        Row: {
          athletes_per_heat: number
          category_id: string | null
          championship_id: string
          created_at: string | null
          custom_name: string | null
          heat_number: number
          id: string
          scheduled_time: string | null
          updated_at: string | null
          wod_id: string
        }
        Insert: {
          athletes_per_heat?: number
          category_id?: string | null
          championship_id: string
          created_at?: string | null
          custom_name?: string | null
          heat_number: number
          id?: string
          scheduled_time?: string | null
          updated_at?: string | null
          wod_id: string
        }
        Update: {
          athletes_per_heat?: number
          category_id?: string | null
          championship_id?: string
          created_at?: string | null
          custom_name?: string | null
          heat_number?: number
          id?: string
          scheduled_time?: string | null
          updated_at?: string | null
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heats_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heats_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      link_buttons: {
        Row: {
          button_type: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          link_page_id: string
          order_index: number
          updated_at: string | null
          url: string
        }
        Insert: {
          button_type?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          link_page_id: string
          order_index?: number
          updated_at?: string | null
          url: string
        }
        Update: {
          button_type?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          link_page_id?: string
          order_index?: number
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_buttons_link_page_id_fkey"
            columns: ["link_page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_pages: {
        Row: {
          banner_alt: string | null
          banner_url: string | null
          championship_id: string
          created_at: string | null
          id: string
          slug: string
          theme_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_alt?: string | null
          banner_url?: string | null
          championship_id: string
          created_at?: string | null
          id?: string
          slug: string
          theme_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          banner_alt?: string | null
          banner_url?: string | null
          championship_id?: string
          created_at?: string | null
          id?: string
          slug?: string
          theme_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_pages_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      mural: {
        Row: {
          ativo: boolean
          box_id: string
          created_at: string | null
          dias_semana: string[]
          id: string
          mensagem: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          box_id: string
          created_at?: string | null
          dias_semana?: string[]
          id?: string
          mensagem: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          box_id?: string
          created_at?: string | null
          dias_semana?: string[]
          id?: string
          mensagem?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organizer_asaas_integrations: {
        Row: {
          asaas_account_id: string | null
          asaas_api_key: string
          asaas_wallet_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          organizer_cnpj: string | null
          organizer_id: string
          updated_at: string | null
        }
        Insert: {
          asaas_account_id?: string | null
          asaas_api_key: string
          asaas_wallet_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          organizer_cnpj?: string | null
          organizer_id: string
          updated_at?: string | null
        }
        Update: {
          asaas_account_id?: string | null
          asaas_api_key?: string
          asaas_wallet_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          organizer_cnpj?: string | null
          organizer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          approved_at: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          boleto_url: string | null
          cancelled_at: string | null
          created_at: string | null
          id: string
          installments: number | null
          metadata: Json | null
          net_amount_cents: number
          payment_method: string
          payment_url: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          platform_fee_cents: number
          refunded_at: string | null
          registration_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          boleto_url?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          installments?: number | null
          metadata?: Json | null
          net_amount_cents: number
          payment_method: string
          payment_url?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          platform_fee_cents: number
          refunded_at?: string | null
          registration_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          boleto_url?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          installments?: number | null
          metadata?: Json | null
          net_amount_cents?: number
          payment_method?: string
          payment_url?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          platform_fee_cents?: number
          refunded_at?: string | null
          registration_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asaas_wallet_id: string | null
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          password_reset_required: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          password_reset_required?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          password_reset_required?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          athlete_birth_date: string | null
          athlete_cpf: string | null
          athlete_email: string | null
          athlete_name: string
          athlete_phone: string | null
          box_name: string | null
          category_id: string
          championship_id: string
          coupon_id: string | null
          created_at: string | null
          discount_cents: number | null
          expires_at: string | null
          id: string
          order_index: number | null
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          platform_fee_cents: number
          shirt_size: string | null
          status: string
          subtotal_cents: number
          team_members: Json | null
          team_name: string | null
          total_cents: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          athlete_birth_date?: string | null
          athlete_cpf?: string | null
          athlete_email?: string | null
          athlete_name: string
          athlete_phone?: string | null
          box_name?: string | null
          category_id: string
          championship_id: string
          coupon_id?: string | null
          created_at?: string | null
          discount_cents?: number | null
          expires_at?: string | null
          id?: string
          order_index?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents: number
          shirt_size?: string | null
          status?: string
          subtotal_cents: number
          team_members?: Json | null
          team_name?: string | null
          total_cents: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          athlete_birth_date?: string | null
          athlete_cpf?: string | null
          athlete_email?: string | null
          athlete_name?: string
          athlete_phone?: string | null
          box_name?: string | null
          category_id?: string
          championship_id?: string
          coupon_id?: string | null
          created_at?: string | null
          discount_cents?: number | null
          expires_at?: string | null
          id?: string
          order_index?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents?: number
          shirt_size?: string | null
          status?: string
          subtotal_cents?: number
          team_members?: Json | null
          team_name?: string | null
          total_cents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_configs: {
        Row: {
          category_id: string
          created_at: string | null
          dnf_points: number
          dns_points: number
          id: string
          points_table: Json
          preset_type: string
          ranking_method: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          dnf_points?: number
          dns_points?: number
          id?: string
          points_table?: Json
          preset_type?: string
          ranking_method?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          dnf_points?: number
          dns_points?: number
          id?: string
          points_table?: Json
          preset_type?: string
          ranking_method?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_configs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_id: string
          championship_id: string
          created_at: string | null
          id: string
          members: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          championship_id: string
          created_at?: string | null
          id?: string
          members?: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          championship_id?: string
          created_at?: string | null
          id?: string
          members?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          championship_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          athlete_email: string
          athlete_name: string
          athlete_phone: string | null
          category_id: string
          championship_id: string
          created_at: string | null
          id: string
          notified_at: string | null
          payment_link_expires_at: string | null
          payment_link_sent_at: string | null
          position: number
          status: string
          updated_at: string | null
        }
        Insert: {
          athlete_email: string
          athlete_name: string
          athlete_phone?: string | null
          category_id: string
          championship_id: string
          created_at?: string | null
          id?: string
          notified_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_sent_at?: string | null
          position: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          athlete_email?: string
          athlete_name?: string
          athlete_phone?: string | null
          category_id?: string
          championship_id?: string
          created_at?: string | null
          id?: string
          notified_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_sent_at?: string | null
          position?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      wod_category_variations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_name: string | null
          estimated_duration_minutes: number | null
          id: string
          notes: string | null
          time_cap: string | null
          updated_at: string
          wod_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          time_cap?: string | null
          updated_at?: string
          wod_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          time_cap?: string | null
          updated_at?: string
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wod_category_variations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_category_variations_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      wod_results: {
        Row: {
          athlete_id: string | null
          category_id: string
          created_at: string | null
          id: string
          is_published: boolean
          points: number | null
          position: number | null
          registration_id: string | null
          result: string | null
          status: string
          team_id: string | null
          tiebreak_value: string | null
          updated_at: string | null
          wod_id: string
        }
        Insert: {
          athlete_id?: string | null
          category_id: string
          created_at?: string | null
          id?: string
          is_published?: boolean
          points?: number | null
          position?: number | null
          registration_id?: string | null
          result?: string | null
          status?: string
          team_id?: string | null
          tiebreak_value?: string | null
          updated_at?: string | null
          wod_id: string
        }
        Update: {
          athlete_id?: string | null
          category_id?: string
          created_at?: string | null
          id?: string
          is_published?: boolean
          points?: number | null
          position?: number | null
          registration_id?: string | null
          result?: string | null
          status?: string
          team_id?: string | null
          tiebreak_value?: string | null
          updated_at?: string | null
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wod_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_results_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_results_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_results_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      wods: {
        Row: {
          championship_id: string
          created_at: string | null
          description: string
          estimated_duration_minutes: number | null
          id: string
          is_published: boolean
          name: string
          notes: string | null
          order_num: number
          tiebreaker: string | null
          time_cap: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          championship_id: string
          created_at?: string | null
          description: string
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean
          name: string
          notes?: string | null
          order_num?: number
          tiebreaker?: string | null
          time_cap?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          championship_id?: string
          created_at?: string | null
          description?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean
          name?: string
          notes?: string | null
          order_num?: number
          tiebreaker?: string | null
          time_cap?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wods_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      heats_view: {
        Row: {
          category_name: string | null
          heat_id: string | null
          heat_number: number | null
          participants: Json | null
          scheduled_time: string | null
          slug: string | null
          wod_name: string | null
        }
        Relationships: []
      }
      leaderboard_view: {
        Row: {
          affiliation: string | null
          category_id: string | null
          category_name: string | null
          first_places: number | null
          participant_id: string | null
          participant_name: string | null
          second_places: number | null
          slug: string | null
          third_places: number | null
          total_points: number | null
          wod_results: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wod_results_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_organizer_stats: {
        Args: never
        Returns: {
          net_revenue_cents: number
          organizer_email: string
          organizer_id: string
          organizer_name: string
          paid_payments: number
          platform_fee_cents: number
          total_championships: number
          total_registrations: number
          total_revenue_cents: number
        }[]
      }
      has_role: {
        Args: {
          _championship_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_security_event: {
        Args: { event_details?: Json; event_type: string }
        Returns: undefined
      }
      update_global_platform_fee: {
        Args: { new_fee_config: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "judge" | "staff" | "super_admin"
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
      app_role: ["admin", "organizer", "judge", "staff", "super_admin"],
    },
  },
} as const
