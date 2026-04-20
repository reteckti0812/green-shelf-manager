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
      auditoria: {
        Row: {
          acao: string
          created_at: string
          descricao: string | null
          entidade: string
          entidade_id: string | null
          id: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          descricao?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          descricao?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
      defeitos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      itens_lote: {
        Row: {
          created_at: string
          criado_por: string | null
          criado_por_nome: string | null
          defeito_id: string | null
          defeito_nome: string | null
          id: string
          lote_id: string
          observacao: string | null
          ordem: number
          produto_id: string | null
          produto_marca: string | null
          produto_nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          defeito_id?: string | null
          defeito_nome?: string | null
          id?: string
          lote_id: string
          observacao?: string | null
          ordem: number
          produto_id?: string | null
          produto_marca?: string | null
          produto_nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          defeito_id?: string | null
          defeito_nome?: string | null
          id?: string
          lote_id?: string
          observacao?: string | null
          ordem?: number
          produto_id?: string | null
          produto_marca?: string | null
          produto_nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_lote_defeito_id_fkey"
            columns: ["defeito_id"]
            isOneToOne: false
            referencedRelation: "defeitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_lote_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      legendas: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          id: string
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      localizacoes: {
        Row: {
          codigo: string
          coluna: number
          created_at: string
          id: string
          nivel: number
          rua: number
        }
        Insert: {
          codigo: string
          coluna: number
          created_at?: string
          id?: string
          nivel: number
          rua: number
        }
        Update: {
          codigo?: string
          coluna?: number
          created_at?: string
          id?: string
          nivel?: number
          rua?: number
        }
        Relationships: []
      }
      lotes: {
        Row: {
          b2b: boolean
          created_at: string
          expedido_em: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          localizacao_id: string | null
          nome: string
          observacao: string | null
          operador_id: string | null
          operador_nome: string | null
          pausa_acumulada_seg: number
          pausado_em: string | null
          retomado_em: string | null
          status: Database["public"]["Enums"]["lote_status"]
          updated_at: string
        }
        Insert: {
          b2b?: boolean
          created_at?: string
          expedido_em?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          localizacao_id?: string | null
          nome: string
          observacao?: string | null
          operador_id?: string | null
          operador_nome?: string | null
          pausa_acumulada_seg?: number
          pausado_em?: string | null
          retomado_em?: string | null
          status?: Database["public"]["Enums"]["lote_status"]
          updated_at?: string
        }
        Update: {
          b2b?: boolean
          created_at?: string
          expedido_em?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          localizacao_id?: string | null
          nome?: string
          observacao?: string | null
          operador_id?: string | null
          operador_nome?: string | null
          pausa_acumulada_seg?: number
          pausado_em?: string | null
          retomado_em?: string | null
          status?: Database["public"]["Enums"]["lote_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_localizacao_id_fkey"
            columns: ["localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          id: string
          localizacao_destino_id: string | null
          localizacao_origem_id: string | null
          lote_id: string
          observacao: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          lote_id: string
          observacao?: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          lote_id?: string
          observacao?: string | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_localizacao_destino_id_fkey"
            columns: ["localizacao_destino_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_localizacao_origem_id_fkey"
            columns: ["localizacao_origem_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          marca: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          marca?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          marca?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
      lote_status:
        | "em_andamento"
        | "pausado"
        | "finalizado"
        | "sem_localizacao"
        | "expedido"
      movimentacao_tipo: "alocacao" | "transferencia" | "saida" | "reabertura"
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
      app_role: ["admin", "operador"],
      lote_status: [
        "em_andamento",
        "pausado",
        "finalizado",
        "sem_localizacao",
        "expedido",
      ],
      movimentacao_tipo: ["alocacao", "transferencia", "saida", "reabertura"],
    },
  },
} as const
