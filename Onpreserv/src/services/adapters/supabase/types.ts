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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          criado_por: string | null
          descricao: string
          frequencia_almoxarifado: number
          frequencia_campo: number
          id: string
          local: string
          observacoes: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          criado_por?: string | null
          descricao: string
          frequencia_almoxarifado?: number
          frequencia_campo?: number
          id?: string
          local?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string
          frequencia_almoxarifado?: number
          frequencia_campo?: number
          id?: string
          local?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      cronograma_itens: {
        Row: {
          created_at: string
          criado_por: string | null
          data_prevista: string | null
          data_realizada: string | null
          gabinete: string
          id: string
          medicao_id: string
          motivo_divergencia: string | null
          observacoes: string | null
          preservacao: string | null
          semana: string | null
          status: string
          tag: string
          tipo: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          gabinete: string
          id?: string
          medicao_id: string
          motivo_divergencia?: string | null
          observacoes?: string | null
          preservacao?: string | null
          semana?: string | null
          status?: string
          tag: string
          tipo?: string | null
          unidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          gabinete?: string
          id?: string
          medicao_id?: string
          motivo_divergencia?: string | null
          observacoes?: string | null
          preservacao?: string | null
          semana?: string | null
          status?: string
          tag?: string
          tipo?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_itens_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "cronograma_medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_medicoes: {
        Row: {
          created_at: string
          criado_por: string | null
          data_referencia: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_referencia?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_referencia?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      lot_identifier_counters: {
        Row: {
          tipo: Database["public"]["Enums"]["lot_tipo"]
          ultimo_numero: number
        }
        Insert: {
          tipo: Database["public"]["Enums"]["lot_tipo"]
          ultimo_numero?: number
        }
        Update: {
          tipo?: Database["public"]["Enums"]["lot_tipo"]
          ultimo_numero?: number
        }
        Relationships: []
      }
      lots: {
        Row: {
          codigo: string
          created_at: string
          criado_por: string | null
          data_criacao: string
          data_recebimento: string | null
          descricao: string
          fornecedor: string | null
          id: string
          identificador_interno: string | null
          localizacao: string | null
          nota_fiscal: string | null
          observacoes: string | null
          prateleira: string | null
          quantidade: number
          rua: string | null
          status: string
          tipo_lote: Database["public"]["Enums"]["lot_tipo"]
          unidade: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          criado_por?: string | null
          data_criacao?: string
          data_recebimento?: string | null
          descricao: string
          fornecedor?: string | null
          id?: string
          identificador_interno?: string | null
          localizacao?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          prateleira?: string | null
          quantidade?: number
          rua?: string | null
          status?: string
          tipo_lote?: Database["public"]["Enums"]["lot_tipo"]
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          criado_por?: string | null
          data_criacao?: string
          data_recebimento?: string | null
          descricao?: string
          fornecedor?: string | null
          id?: string
          identificador_interno?: string | null
          localizacao?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          prateleira?: string | null
          quantidade?: number
          rua?: string | null
          status?: string
          tipo_lote?: Database["public"]["Enums"]["lot_tipo"]
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: Database["public"]["Enums"]["notificacao_tipo"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: Database["public"]["Enums"]["notificacao_tipo"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: Database["public"]["Enums"]["notificacao_tipo"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preservations: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          id: string
          lot_id: string
          observacoes: string | null
          responsavel: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          id?: string
          lot_id: string
          observacoes?: string | null
          responsavel: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          lot_id?: string
          observacoes?: string | null
          responsavel?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preservations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rdo_config: {
        Row: {
          cliente: string
          icj: string
          id: number
          jornada_fim: string
          jornada_inicio: string
          numero_rdo: string
          referencia: string
          updated_at: string
        }
        Insert: {
          cliente?: string
          icj?: string
          id?: number
          jornada_fim?: string
          jornada_inicio?: string
          numero_rdo?: string
          referencia?: string
          updated_at?: string
        }
        Update: {
          cliente?: string
          icj?: string
          id?: number
          jornada_fim?: string
          jornada_inicio?: string
          numero_rdo?: string
          referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      rdo_dias: {
        Row: {
          atividades: Json
          created_at: string
          data: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atividades?: Json
          created_at?: string
          data: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atividades?: Json
          created_at?: string
          data?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      rdo_grupos: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          allowed: boolean
          module: Database["public"]["Enums"]["app_module"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          action: string
          allowed?: boolean
          module: Database["public"]["Enums"]["app_module"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          action?: string
          allowed?: boolean
          module?: Database["public"]["Enums"]["app_module"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_edicao_preservacao: {
        Row: {
          analisado_por: string | null
          created_at: string
          dados_atuais: Json
          dados_propostos: Json
          data_resposta: string | null
          data_solicitacao: string
          id: string
          justificativa: string
          lot_id: string
          preservation_id: string
          resposta: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["solicitacao_status"]
          updated_at: string
        }
        Insert: {
          analisado_por?: string | null
          created_at?: string
          dados_atuais: Json
          dados_propostos: Json
          data_resposta?: string | null
          data_solicitacao?: string
          id?: string
          justificativa: string
          lot_id: string
          preservation_id: string
          resposta?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
        }
        Update: {
          analisado_por?: string | null
          created_at?: string
          dados_atuais?: Json
          dados_propostos?: Json
          data_resposta?: string | null
          data_solicitacao?: string
          id?: string
          justificativa?: string
          lot_id?: string
          preservation_id?: string
          resposta?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_exclusao: {
        Row: {
          analisado_por: string | null
          created_at: string
          data_resposta: string | null
          data_solicitacao: string
          id: string
          item_descricao: string | null
          item_id: string
          justificativa: string
          resposta: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["solicitacao_status"]
          tipo: Database["public"]["Enums"]["delete_item_type"]
          updated_at: string
        }
        Insert: {
          analisado_por?: string | null
          created_at?: string
          data_resposta?: string | null
          data_solicitacao?: string
          id?: string
          item_descricao?: string | null
          item_id: string
          justificativa: string
          resposta?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          tipo: Database["public"]["Enums"]["delete_item_type"]
          updated_at?: string
        }
        Update: {
          analisado_por?: string | null
          created_at?: string
          data_resposta?: string | null
          data_solicitacao?: string
          id?: string
          item_descricao?: string | null
          item_id?: string
          justificativa?: string
          resposta?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          tipo?: Database["public"]["Enums"]["delete_item_type"]
          updated_at?: string
        }
        Relationships: []
      }
      stock_identifier_counters: {
        Row: {
          tipo: Database["public"]["Enums"]["stock_item_tipo"]
          ultimo_numero: number
        }
        Insert: {
          tipo: Database["public"]["Enums"]["stock_item_tipo"]
          ultimo_numero?: number
        }
        Update: {
          tipo?: Database["public"]["Enums"]["stock_item_tipo"]
          ultimo_numero?: number
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string
          criado_por: string | null
          descricao: string
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          identificador_interno: string
          localizacao: string | null
          nota_fiscal: string | null
          observacoes: string | null
          prateleira: string | null
          quantidade: number
          rua: string | null
          status: string
          tipo_item: Database["public"]["Enums"]["stock_item_tipo"]
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string
          criado_por?: string | null
          descricao: string
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          identificador_interno: string
          localizacao?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          prateleira?: string | null
          quantidade?: number
          rua?: string | null
          status?: string
          tipo_item?: Database["public"]["Enums"]["stock_item_tipo"]
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          identificador_interno?: string
          localizacao?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          prateleira?: string | null
          quantidade?: number
          rua?: string | null
          status?: string
          tipo_item?: Database["public"]["Enums"]["stock_item_tipo"]
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          destino: string | null
          id: string
          item_id: string
          justificativa: string | null
          observacoes: string | null
          op_petrobras: string | null
          ppu: string | null
          quantidade: number
          quantidade_resultante: number
          referencia: string | null
          responsavel: string
          tipo: string
          unidade_destino: string | null
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          destino?: string | null
          id?: string
          item_id: string
          justificativa?: string | null
          observacoes?: string | null
          op_petrobras?: string | null
          ppu?: string | null
          quantidade: number
          quantidade_resultante: number
          referencia?: string | null
          responsavel: string
          tipo: string
          unidade_destino?: string | null
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          destino?: string | null
          id?: string
          item_id?: string
          justificativa?: string | null
          observacoes?: string | null
          op_petrobras?: string | null
          ppu?: string | null
          quantidade?: number
          quantidade_resultante?: number
          referencia?: string | null
          responsavel?: string
          tipo?: string
          unidade_destino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          mime: string | null
          nome: string
          path: string
          tamanho: number | null
          task_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          mime?: string | null
          nome: string
          path: string
          tamanho?: number | null
          task_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          mime?: string | null
          nome?: string
          path?: string
          tamanho?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          arquivado: boolean
          cor: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          equipe: string
          id: string
          nome: string
          posicao: number
          updated_at: string
        }
        Insert: {
          arquivado?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipe?: string
          id?: string
          nome: string
          posicao?: number
          updated_at?: string
        }
        Update: {
          arquivado?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipe?: string
          id?: string
          nome?: string
          posicao?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          acao: string
          created_at: string
          de: string | null
          id: string
          para: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          de?: string | null
          id?: string
          para?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          de?: string | null
          id?: string
          para?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          label_id: string
          task_id: string
        }
        Insert: {
          label_id: string
          task_id: string
        }
        Update: {
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          cor: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      task_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          task_id: string
          user_id_mencionado: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          task_id: string
          user_id_mencionado: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          task_id?: string
          user_id_mencionado?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_mentions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          id: string
          posicao: number
          task_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          posicao?: number
          task_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          posicao?: number
          task_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          aprovacao: Database["public"]["Enums"]["task_aprovacao"]
          aprovacao_observacao: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          board_id: string | null
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          item_relacionado_descricao: string | null
          item_relacionado_id: string | null
          modulo_relacionado: Database["public"]["Enums"]["task_modulo"]
          observacoes: string | null
          posicao: number
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          aprovacao?: Database["public"]["Enums"]["task_aprovacao"]
          aprovacao_observacao?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          board_id?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          item_relacionado_descricao?: string | null
          item_relacionado_id?: string | null
          modulo_relacionado?: Database["public"]["Enums"]["task_modulo"]
          observacoes?: string | null
          posicao?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          aprovacao?: Database["public"]["Enums"]["task_aprovacao"]
          aprovacao_observacao?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          board_id?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          item_relacionado_descricao?: string | null
          item_relacionado_id?: string | null
          modulo_relacionado?: Database["public"]["Enums"]["task_modulo"]
          observacoes?: string | null
          posicao?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_audit_log: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          detalhes: Json | null
          id: string
          user_id: string
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          is_override: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          is_override?: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          is_override?: boolean
          module?: Database["public"]["Enums"]["app_module"]
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
      gerar_identificador_estoque: {
        Args: { _tipo: Database["public"]["Enums"]["stock_item_tipo"] }
        Returns: string
      }
      gerar_identificador_lote: {
        Args: { _tipo: Database["public"]["Enums"]["lot_tipo"] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_profiles: {
        Args: never
        Returns: {
          cargo: string
          id: string
          nome: string
          status: string
        }[]
      }
      match_user_ids_by_emails: {
        Args: { _emails: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      user_can_access_task: { Args: { _task_id: string }; Returns: boolean }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "lotes"
        | "preservacoes"
        | "atividades"
        | "estoque"
        | "cronograma"
        | "tarefas"
        | "rdo"
        | "solicitacoes"
      app_role: "admin" | "user" | "viewer"
      delete_item_type:
        | "lote"
        | "preservacao"
        | "atividade"
        | "estoque"
        | "tarefa"
        | "quadro"
      lot_tipo: "novo" | "retirado_campo"
      notificacao_tipo:
        | "solicitacao_criada"
        | "solicitacao_aprovada"
        | "solicitacao_recusada"
        | "solicitacao_respondida"
        | "tarefa_atribuida"
        | "tarefa_mencionada"
        | "tarefa_comentario"
        | "tarefa_prazo"
        | "tarefa_vencida"
        | "tarefa_concluida"
      solicitacao_status: "pendente" | "aprovado" | "recusado"
      stock_item_tipo: "petrobras" | "generico" | "retirado_campo" | "schneider"
      task_aprovacao: "pendente" | "aprovado" | "reprovado"
      task_modulo:
        | "lote"
        | "cronograma"
        | "preservacao"
        | "estoque"
        | "atividade"
        | "solicitacao"
        | "geral"
      task_priority: "baixa" | "media" | "alta" | "critica"
      task_status:
        | "a_fazer"
        | "em_andamento"
        | "em_revisao"
        | "concluido"
        | "bloqueado"
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
      app_module: [
        "dashboard",
        "lotes",
        "preservacoes",
        "atividades",
        "estoque",
        "cronograma",
        "tarefas",
        "rdo",
        "solicitacoes",
      ],
      app_role: ["admin", "user", "viewer"],
      delete_item_type: [
        "lote",
        "preservacao",
        "atividade",
        "estoque",
        "tarefa",
        "quadro",
      ],
      lot_tipo: ["novo", "retirado_campo"],
      notificacao_tipo: [
        "solicitacao_criada",
        "solicitacao_aprovada",
        "solicitacao_recusada",
        "solicitacao_respondida",
        "tarefa_atribuida",
        "tarefa_mencionada",
        "tarefa_comentario",
        "tarefa_prazo",
        "tarefa_vencida",
        "tarefa_concluida",
      ],
      solicitacao_status: ["pendente", "aprovado", "recusado"],
      stock_item_tipo: ["petrobras", "generico", "retirado_campo", "schneider"],
      task_aprovacao: ["pendente", "aprovado", "reprovado"],
      task_modulo: [
        "lote",
        "cronograma",
        "preservacao",
        "estoque",
        "atividade",
        "solicitacao",
        "geral",
      ],
      task_priority: ["baixa", "media", "alta", "critica"],
      task_status: [
        "a_fazer",
        "em_andamento",
        "em_revisao",
        "concluido",
        "bloqueado",
      ],
    },
  },
} as const
