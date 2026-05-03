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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_display_name: string | null
          actor_is_admin: boolean | null
          actor_player_id: string | null
          actor_profile_id: string | null
          changed_fields: string[] | null
          created_at: string
          fixture_id: string | null
          hole_score_id: string | null
          id: string
          player_id: string | null
          record_id: string
          row_after: Json | null
          row_before: Json | null
          segment_id: string | null
          table_name: string
          tournament_id: string | null
        }
        Insert: {
          action: string
          actor_display_name?: string | null
          actor_is_admin?: boolean | null
          actor_player_id?: string | null
          actor_profile_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          fixture_id?: string | null
          hole_score_id?: string | null
          id?: string
          player_id?: string | null
          record_id: string
          row_after?: Json | null
          row_before?: Json | null
          segment_id?: string | null
          table_name: string
          tournament_id?: string | null
        }
        Update: {
          action?: string
          actor_display_name?: string | null
          actor_is_admin?: boolean | null
          actor_player_id?: string | null
          actor_profile_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          fixture_id?: string | null
          hole_score_id?: string | null
          id?: string
          player_id?: string | null
          record_id?: string
          row_after?: Json | null
          row_before?: Json | null
          segment_id?: string | null
          table_name?: string
          tournament_id?: string | null
        }
        Relationships: []
      }
      course_holes: {
        Row: {
          created_at: string
          hole_number: number
          par: number | null
          stroke_index: number
          updated_at: string
          yardage: number | null
        }
        Insert: {
          created_at?: string
          hole_number: number
          par?: number | null
          stroke_index: number
          updated_at?: string
          yardage?: number | null
        }
        Update: {
          created_at?: string
          hole_number?: number
          par?: number | null
          stroke_index?: number
          updated_at?: string
          yardage?: number | null
        }
        Relationships: []
      }
      fixture_players: {
        Row: {
          created_at: string
          fixture_id: string
          player_id: string
          slot: number
          team: Database["public"]["Enums"]["app_team"]
        }
        Insert: {
          created_at?: string
          fixture_id: string
          player_id: string
          slot: number
          team: Database["public"]["Enums"]["app_team"]
        }
        Update: {
          created_at?: string
          fixture_id?: string
          player_id?: string
          slot?: number
          team?: Database["public"]["Enums"]["app_team"]
        }
        Relationships: [
          {
            foreignKeyName: "fixture_players_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          created_at: string
          id: string
          name: string | null
          sort_order: number
          status: Database["public"]["Enums"]["fixture_status"]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["fixture_status"]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["fixture_status"]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      hole_scores: {
        Row: {
          cpi_applied: boolean
          cpi_difference: number
          cpi_strokes_europe: number
          cpi_strokes_usa: number
          created_at: string
          europe_net_score: number | null
          europe_score: number | null
          hole_number: number
          id: string
          outcome: Database["public"]["Enums"]["hole_outcome"]
          segment_id: string
          stroke_index: number
          updated_at: string
          updated_by: string | null
          usa_net_score: number | null
          usa_score: number | null
        }
        Insert: {
          cpi_applied?: boolean
          cpi_difference?: number
          cpi_strokes_europe?: number
          cpi_strokes_usa?: number
          created_at?: string
          europe_net_score?: number | null
          europe_score?: number | null
          hole_number: number
          id?: string
          outcome?: Database["public"]["Enums"]["hole_outcome"]
          segment_id: string
          stroke_index: number
          updated_at?: string
          updated_by?: string | null
          usa_net_score?: number | null
          usa_score?: number | null
        }
        Update: {
          cpi_applied?: boolean
          cpi_difference?: number
          cpi_strokes_europe?: number
          cpi_strokes_usa?: number
          created_at?: string
          europe_net_score?: number | null
          europe_score?: number | null
          hole_number?: number
          id?: string
          outcome?: Database["public"]["Enums"]["hole_outcome"]
          segment_id?: string
          stroke_index?: number
          updated_at?: string
          updated_by?: string | null
          usa_net_score?: number | null
          usa_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hole_scores_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hole_scores_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_games: {
        Row: {
          created_at: string
          europe_player_id: string | null
          europe_player_legacy_id: string | null
          europe_player_name: string
          holes: Json
          id: string
          legacy_firebase_id: string
          legacy_handicap_strokes: number
          legacy_higher_handicap_team:
            | Database["public"]["Enums"]["app_team"]
            | null
          legacy_tournament_id: string
          match_legacy_adjusted_europe: number
          match_legacy_adjusted_usa: number
          match_raw_europe: number
          match_raw_usa: number
          points_legacy_adjusted_europe: number
          points_legacy_adjusted_usa: number
          points_raw_europe: number
          points_raw_usa: number
          source_payload: Json
          status: string
          stroke_legacy_adjusted_europe: number
          stroke_legacy_adjusted_usa: number
          stroke_raw_europe: number
          stroke_raw_usa: number
          updated_at: string
          usa_player_id: string | null
          usa_player_legacy_id: string | null
          usa_player_name: string
          use_legacy_handicap: boolean
        }
        Insert: {
          created_at?: string
          europe_player_id?: string | null
          europe_player_legacy_id?: string | null
          europe_player_name: string
          holes?: Json
          id?: string
          legacy_firebase_id: string
          legacy_handicap_strokes?: number
          legacy_higher_handicap_team?:
            | Database["public"]["Enums"]["app_team"]
            | null
          legacy_tournament_id: string
          match_legacy_adjusted_europe?: number
          match_legacy_adjusted_usa?: number
          match_raw_europe?: number
          match_raw_usa?: number
          points_legacy_adjusted_europe?: number
          points_legacy_adjusted_usa?: number
          points_raw_europe?: number
          points_raw_usa?: number
          source_payload?: Json
          status: string
          stroke_legacy_adjusted_europe?: number
          stroke_legacy_adjusted_usa?: number
          stroke_raw_europe?: number
          stroke_raw_usa?: number
          updated_at?: string
          usa_player_id?: string | null
          usa_player_legacy_id?: string | null
          usa_player_name: string
          use_legacy_handicap?: boolean
        }
        Update: {
          created_at?: string
          europe_player_id?: string | null
          europe_player_legacy_id?: string | null
          europe_player_name?: string
          holes?: Json
          id?: string
          legacy_firebase_id?: string
          legacy_handicap_strokes?: number
          legacy_higher_handicap_team?:
            | Database["public"]["Enums"]["app_team"]
            | null
          legacy_tournament_id?: string
          match_legacy_adjusted_europe?: number
          match_legacy_adjusted_usa?: number
          match_raw_europe?: number
          match_raw_usa?: number
          points_legacy_adjusted_europe?: number
          points_legacy_adjusted_usa?: number
          points_raw_europe?: number
          points_raw_usa?: number
          source_payload?: Json
          status?: string
          stroke_legacy_adjusted_europe?: number
          stroke_legacy_adjusted_usa?: number
          stroke_raw_europe?: number
          stroke_raw_usa?: number
          updated_at?: string
          usa_player_id?: string | null
          usa_player_legacy_id?: string | null
          usa_player_name?: string
          use_legacy_handicap?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "legacy_games_europe_player_id_fkey"
            columns: ["europe_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_games_legacy_tournament_id_fkey"
            columns: ["legacy_tournament_id"]
            isOneToOne: false
            referencedRelation: "legacy_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_games_usa_player_id_fkey"
            columns: ["usa_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_tournaments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_complete: boolean
          legacy_firebase_id: string
          legacy_handicap_method: string
          name: string
          projected_legacy_adjusted_europe: number
          projected_legacy_adjusted_usa: number
          projected_raw_europe: number
          projected_raw_usa: number
          source_payload: Json
          total_legacy_adjusted_europe: number
          total_legacy_adjusted_usa: number
          total_raw_europe: number
          total_raw_usa: number
          updated_at: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          legacy_firebase_id: string
          legacy_handicap_method?: string
          name: string
          projected_legacy_adjusted_europe?: number
          projected_legacy_adjusted_usa?: number
          projected_raw_europe?: number
          projected_raw_usa?: number
          source_payload?: Json
          total_legacy_adjusted_europe?: number
          total_legacy_adjusted_usa?: number
          total_raw_europe?: number
          total_raw_usa?: number
          updated_at?: string
          year: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          legacy_firebase_id?: string
          legacy_handicap_method?: string
          name?: string
          projected_legacy_adjusted_europe?: number
          projected_legacy_adjusted_usa?: number
          projected_raw_europe?: number
          projected_raw_usa?: number
          source_payload?: Json
          total_legacy_adjusted_europe?: number
          total_legacy_adjusted_usa?: number
          total_raw_europe?: number
          total_raw_usa?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      player_tournament_stats: {
        Row: {
          completed_at: string
          completion_year: number
          cpi_after: number | null
          created_at: string
          holes_halved: number
          holes_won: number
          id: string
          legacy_payload: Json
          player_id: string
          singles_average: number | null
          singles_holes_played: number
          singles_strokes: number
          source: string
          tournament_id: string | null
        }
        Insert: {
          completed_at?: string
          completion_year: number
          cpi_after?: number | null
          created_at?: string
          holes_halved?: number
          holes_won?: number
          id?: string
          legacy_payload?: Json
          player_id: string
          singles_average?: number | null
          singles_holes_played?: number
          singles_strokes?: number
          source?: string
          tournament_id?: string | null
        }
        Update: {
          completed_at?: string
          completion_year?: number
          cpi_after?: number | null
          created_at?: string
          holes_halved?: number
          holes_won?: number
          id?: string
          legacy_payload?: Json
          player_id?: string
          singles_average?: number | null
          singles_holes_played?: number
          singles_strokes?: number
          source?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_tournament_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_stats_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          current_cpi: number | null
          custom_emoji: string | null
          id: string
          legacy_firebase_id: string | null
          name: string
          team: Database["public"]["Enums"]["app_team"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_cpi?: number | null
          custom_emoji?: string | null
          id?: string
          legacy_firebase_id?: string | null
          name: string
          team: Database["public"]["Enums"]["app_team"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_cpi?: number | null
          custom_emoji?: string | null
          id?: string
          legacy_firebase_id?: string | null
          name?: string
          team?: Database["public"]["Enums"]["app_team"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          custom_emoji: string | null
          display_name: string
          email: string
          firebase_uid: string | null
          id: string
          is_admin: boolean
          linked_player_id: string | null
          team: Database["public"]["Enums"]["app_team"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_emoji?: string | null
          display_name: string
          email: string
          firebase_uid?: string | null
          id: string
          is_admin?: boolean
          linked_player_id?: string | null
          team?: Database["public"]["Enums"]["app_team"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_emoji?: string | null
          display_name?: string
          email?: string
          firebase_uid?: string | null
          id?: string
          is_admin?: boolean
          linked_player_id?: string | null
          team?: Database["public"]["Enums"]["app_team"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_players: {
        Row: {
          created_at: string
          player_id: string
          segment_id: string
          slot: number
          team: Database["public"]["Enums"]["app_team"]
        }
        Insert: {
          created_at?: string
          player_id: string
          segment_id: string
          slot: number
          team: Database["public"]["Enums"]["app_team"]
        }
        Update: {
          created_at?: string
          player_id?: string
          segment_id?: string
          slot?: number
          team?: Database["public"]["Enums"]["app_team"]
        }
        Relationships: [
          {
            foreignKeyName: "segment_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_players_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          cpi_enabled: boolean
          created_at: string
          europe_player_id: string | null
          fixture_id: string
          hole_end: number
          hole_start: number
          id: string
          kind: Database["public"]["Enums"]["segment_kind"]
          name: string | null
          sort_order: number
          updated_at: string
          usa_player_id: string | null
        }
        Insert: {
          cpi_enabled?: boolean
          created_at?: string
          europe_player_id?: string | null
          fixture_id: string
          hole_end: number
          hole_start: number
          id?: string
          kind: Database["public"]["Enums"]["segment_kind"]
          name?: string | null
          sort_order?: number
          updated_at?: string
          usa_player_id?: string | null
        }
        Update: {
          cpi_enabled?: boolean
          created_at?: string
          europe_player_id?: string | null
          fixture_id?: string
          hole_end?: number
          hole_start?: number
          id?: string
          kind?: Database["public"]["Enums"]["segment_kind"]
          name?: string | null
          sort_order?: number
          updated_at?: string
          usa_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_europe_player_id_fkey"
            columns: ["europe_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_usa_player_id_fkey"
            columns: ["usa_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_progress: {
        Row: {
          completed_holes: number
          created_at: string
          id: string
          score: Json
          tournament_id: string
        }
        Insert: {
          completed_holes?: number
          created_at?: string
          id?: string
          score: Json
          tournament_id: string
        }
        Update: {
          completed_holes?: number
          created_at?: string
          id?: string
          score?: Json
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_progress_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          completed_at: string | null
          cpi_threshold: number
          created_at: string
          id: string
          is_active: boolean
          is_complete: boolean
          legacy_firebase_id: string | null
          name: string
          updated_at: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          cpi_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_complete?: boolean
          legacy_firebase_id?: string | null
          name: string
          updated_at?: string
          year: number
        }
        Update: {
          completed_at?: string | null
          cpi_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_complete?: boolean
          legacy_firebase_id?: string | null
          name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_update_fixture_scores: {
        Args: { target_fixture_id: string }
        Returns: boolean
      }
      current_linked_player_id: { Args: never; Returns: string }
      current_profile_is_admin: { Args: never; Returns: boolean }
      update_own_profile: {
        Args: { custom_emoji_input: string; display_name_input: string }
        Returns: undefined
      }
    }
    Enums: {
      app_team: "USA" | "EUROPE"
      fixture_status: "not_started" | "in_progress" | "complete"
      hole_outcome: "USA" | "EUROPE" | "halved" | "unplayed"
      segment_kind: "foursomes" | "singles"
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
      app_team: ["USA", "EUROPE"],
      fixture_status: ["not_started", "in_progress", "complete"],
      hole_outcome: ["USA", "EUROPE", "halved", "unplayed"],
      segment_kind: ["foursomes", "singles"],
    },
  },
} as const
