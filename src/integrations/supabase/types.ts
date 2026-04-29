export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      badges: {
        Row: {
          awarded_at: string;
          id: string;
          name: string;
          tier: string;
          user_id: string;
        };
        Insert: {
          awarded_at?: string;
          id?: string;
          name: string;
          tier?: string;
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          id?: string;
          name?: string;
          tier?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          certificate_code: string;
          donation_id: string | null;
          id: string;
          issued_at: string;
          metadata: Json | null;
          user_id: string;
        };
        Insert: {
          certificate_code?: string;
          donation_id?: string | null;
          id?: string;
          issued_at?: string;
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          certificate_code?: string;
          donation_id?: string | null;
          id?: string;
          issued_at?: string;
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          created_at: string;
          donation_date: string;
          donor_id: string;
          emergency_id: string | null;
          hospital_id: string;
          id: string;
          reward_given: number;
        };
        Insert: {
          created_at?: string;
          donation_date?: string;
          donor_id: string;
          emergency_id?: string | null;
          hospital_id: string;
          id?: string;
          reward_given?: number;
        };
        Update: {
          created_at?: string;
          donation_date?: string;
          donor_id?: string;
          emergency_id?: string | null;
          hospital_id?: string;
          id?: string;
          reward_given?: number;
        };
        Relationships: [
          {
            foreignKeyName: "donations_emergency_id_fkey";
            columns: ["emergency_id"];
            isOneToOne: false;
            referencedRelation: "emergency_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      donor_profiles: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          health_status: string | null;
          is_available: boolean;
          last_donation_date: string | null;
          reward_points: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          health_status?: string | null;
          is_available?: boolean;
          last_donation_date?: string | null;
          reward_points?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          health_status?: string | null;
          is_available?: boolean;
          last_donation_date?: string | null;
          reward_points?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      emergency_requests: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          hospital_id: string;
          id: string;
          latitude: number;
          longitude: number;
          patient_info: string | null;
          status: Database["public"]["Enums"]["request_status"];
          units_required: number;
          updated_at: string;
          urgency_level: Database["public"]["Enums"]["urgency_level"];
        };
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          hospital_id: string;
          id?: string;
          latitude: number;
          longitude: number;
          patient_info?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          units_required?: number;
          updated_at?: string;
          urgency_level?: Database["public"]["Enums"]["urgency_level"];
        };
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          hospital_id?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          patient_info?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          units_required?: number;
          updated_at?: string;
          urgency_level?: Database["public"]["Enums"]["urgency_level"];
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          distance_km: number | null;
          emergency_id: string | null;
          id: string;
          message: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          distance_km?: number | null;
          emergency_id?: string | null;
          id?: string;
          message: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          type?: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          distance_km?: number | null;
          emergency_id?: string | null;
          id?: string;
          message?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_emergency_id_fkey";
            columns: ["emergency_id"];
            isOneToOne: false;
            referencedRelation: "emergency_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      organ_pledges: {
        Row: {
          consent_given: boolean;
          hospital_id: string | null;
          id: string;
          medical_notes: string | null;
          next_of_kin_name: string | null;
          next_of_kin_phone: string | null;
          organs: Database["public"]["Enums"]["organ_type"][];
          pledged_at: string;
          status: Database["public"]["Enums"]["organ_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          consent_given?: boolean;
          hospital_id?: string | null;
          id?: string;
          medical_notes?: string | null;
          next_of_kin_name?: string | null;
          next_of_kin_phone?: string | null;
          organs: Database["public"]["Enums"]["organ_type"][];
          pledged_at?: string;
          status?: Database["public"]["Enums"]["organ_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          consent_given?: boolean;
          hospital_id?: string | null;
          id?: string;
          medical_notes?: string | null;
          next_of_kin_name?: string | null;
          next_of_kin_phone?: string | null;
          organs?: Database["public"]["Enums"]["organ_type"][];
          pledged_at?: string;
          status?: Database["public"]["Enums"]["organ_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      organ_requests: {
        Row: {
          approved_by: string | null;
          created_at: string;
          hospital_id: string;
          id: string;
          matched_pledge_id: string | null;
          organ: Database["public"]["Enums"]["organ_type"];
          patient_info: string | null;
          status: Database["public"]["Enums"]["organ_status"];
          updated_at: string;
          urgency_level: Database["public"]["Enums"]["urgency_level"];
        };
        Insert: {
          approved_by?: string | null;
          created_at?: string;
          hospital_id: string;
          id?: string;
          matched_pledge_id?: string | null;
          organ: Database["public"]["Enums"]["organ_type"];
          patient_info?: string | null;
          status?: Database["public"]["Enums"]["organ_status"];
          updated_at?: string;
          urgency_level?: Database["public"]["Enums"]["urgency_level"];
        };
        Update: {
          approved_by?: string | null;
          created_at?: string;
          hospital_id?: string;
          id?: string;
          matched_pledge_id?: string | null;
          organ?: Database["public"]["Enums"]["organ_type"];
          patient_info?: string | null;
          status?: Database["public"]["Enums"]["organ_status"];
          updated_at?: string;
          urgency_level?: Database["public"]["Enums"]["urgency_level"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          created_at: string;
          dob: string | null;
          hospital_name: string | null;
          id: string;
          id_proof_type: string | null;
          id_proof_value: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string;
          notto_registration_started_at: string | null;
          notto_self_confirmed_at: string | null;
          notto_self_confirmed_testing: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          dob?: string | null;
          hospital_name?: string | null;
          id: string;
          id_proof_type?: string | null;
          id_proof_value?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          notto_registration_started_at?: string | null;
          notto_self_confirmed_at?: string | null;
          notto_self_confirmed_testing?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          dob?: string | null;
          hospital_name?: string | null;
          id?: string;
          id_proof_type?: string | null;
          id_proof_value?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          notto_registration_started_at?: string | null;
          notto_self_confirmed_at?: string | null;
          notto_self_confirmed_testing?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      match_donors: {
        Args: { _emergency_id: string };
        Returns: {
          blood_group: Database["public"]["Enums"]["blood_group"];
          distance_km: number;
          last_donation_date: string;
          name: string;
          phone: string;
          user_id: string;
        }[];
      };
      notify_matched_donors: {
        Args: { _emergency_id: string };
        Returns: number;
      };
      respond_to_notification: {
        Args: { _accept: boolean; _notification_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "donor" | "hospital" | "admin";
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
      notification_status: "sent" | "accepted" | "rejected" | "expired";
      notification_type: "emergency" | "info";
      organ_status:
        | "registered"
        | "pending_approval"
        | "approved"
        | "matched"
        | "transplanted"
        | "withdrawn";
      organ_type:
        | "kidney"
        | "liver"
        | "heart"
        | "lungs"
        | "pancreas"
        | "cornea"
        | "bone_marrow"
        | "skin";
      request_status: "open" | "in_progress" | "closed" | "cancelled";
      urgency_level: "low" | "medium" | "high" | "critical";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["donor", "hospital", "admin"],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      notification_status: ["sent", "accepted", "rejected", "expired"],
      notification_type: ["emergency", "info"],
      organ_status: [
        "registered",
        "pending_approval",
        "approved",
        "matched",
        "transplanted",
        "withdrawn",
      ],
      organ_type: [
        "kidney",
        "liver",
        "heart",
        "lungs",
        "pancreas",
        "cornea",
        "bone_marrow",
        "skin",
      ],
      request_status: ["open", "in_progress", "closed", "cancelled"],
      urgency_level: ["low", "medium", "high", "critical"],
    },
  },
} as const;
