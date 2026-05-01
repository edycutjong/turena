export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      trade_cycles: {
        Row: {
          id: string;
          agent_id: string;
          cycle_number: number;
          intent: Json | null;
          cot_transcript: string | null;
          result: "win" | "loss" | "pending";
          pnl_mnt: number | null;
          self_corrected: boolean;
          tx_hash: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trade_cycles"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["trade_cycles"]["Insert"]>;
      };
      counter_trades: {
        Row: {
          id: string;
          cycle_id: string;
          wallet_address: string;
          amount_mnt: number;
          position: "for" | "against";
          result: "win" | "loss" | "pending";
          payout_mnt: number | null;
          tx_hash: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["counter_trades"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["counter_trades"]["Insert"]>;
      };
      self_corrections: {
        Row: {
          id: string;
          cycle_id: string;
          parameter_changed: string;
          old_value: number;
          new_value: number;
          regret_score: number;
          tx_hash: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["self_corrections"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["self_corrections"]["Insert"]>;
      };
      agent_state: {
        Row: {
          id: string;
          agent_id: string;
          total_trades: number;
          win_rate: number;
          total_pnl: number;
          self_corrections_count: number;
          current_params: Json;
          elo_rating: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_state"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["agent_state"]["Insert"]>;
      };
      cot_tokens: {
        Row: {
          id: number;
          cycle_id: string;
          token_text: string;
          token_type: "reasoning" | "intent" | "correction";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cot_tokens"]["Row"], "id" | "created_at">;
        Update: Record<string, never>;
      };
    };
  };
}
