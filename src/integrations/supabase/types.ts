export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          razao_social: string;
          nome_fantasia: string;
          cnpj: string;
          telefone: string;
          email: string;
          cidade: string;
          estado: string;
          cor: string;
          ativo: boolean;
          user_id: string;
          created_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          razao_social: string;
          nome_fantasia: string;
          cnpj: string;
          telefone: string;
          email: string;
          cidade: string;
          estado: string;
          cor: string;
          ativo: boolean;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          razao_social?: string;
          nome_fantasia?: string;
          cnpj?: string;
          telefone?: string;
          email?: string;
          cidade?: string;
          estado?: string;
          cor?: string;
          ativo?: boolean;
          user_id?: string;
          created_at?: string;
        };
      };
      categorias: {
        Row: {
          id: string;
          nome: string;
          tipo: 'credito' | 'debito';
          cor: string;
          icone: string;
          ativo: boolean;
          user_id: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          nome: string;
          tipo: 'credito' | 'debito';
          cor: string;
          icone: string;
          ativo: boolean;
          user_id: string;
        };
        Update: {
          id?: string;
          nome?: string;
          tipo?: 'credito' | 'debito';
          cor?: string;
          icone?: string;
          ativo?: boolean;
          user_id?: string;
        };
      };
      lancamentos: {
        Relationships: [];
        Row: {
          id: string;
          tipo: 'credito' | 'debito';
          descricao: string;
          empresa_id: string;
          categoria_id: string;
          valor: number;
          valor_total: number;
          data_emissao: string;
          data_vencimento: string;
          data_pagamento: string | null;
          status: 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
          tipo_recorrencia: 'avista' | 'fixo' | 'parcelas';
          recorrencia: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null;
          numero_parcelas: number | null;
          parcela_atual: number | null;
          dia_vencimento: number | null;
          observacoes: string | null;
          competencia: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tipo: 'credito' | 'debito';
          descricao: string;
          empresa_id: string;
          categoria_id: string;
          valor: number;
          valor_total: number;
          data_emissao: string;
          data_vencimento: string;
          data_pagamento?: string | null;
          status: 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
          tipo_recorrencia: 'avista' | 'fixo' | 'parcelas';
          recorrencia?: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null;
          numero_parcelas?: number | null;
          parcela_atual?: number | null;
          dia_vencimento?: number | null;
          observacoes?: string | null;
          competencia: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tipo?: 'credito' | 'debito';
          descricao?: string;
          empresa_id?: string;
          categoria_id?: string;
          valor?: number;
          valor_total?: number;
          data_emissao?: string;
          data_vencimento?: string;
          data_pagamento?: string | null;
          status?: 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
          tipo_recorrencia?: 'avista' | 'fixo' | 'parcelas';
          recorrencia?: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null;
          numero_parcelas?: number | null;
          parcela_atual?: number | null;
          dia_vencimento?: number | null;
          observacoes?: string | null;
          competencia?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      anexos: {
        Relationships: [];
        Row: {
          id: string;
          lancamento_id: string;
          nome: string;
          tipo: 'boleto' | 'comprovante' | 'nf' | 'outro';
          url: string;
          tamanho: number;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lancamento_id: string;
          nome: string;
          tipo: 'boleto' | 'comprovante' | 'nf' | 'outro';
          url: string;
          tamanho: number;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lancamento_id?: string;
          nome?: string;
          tipo?: 'boleto' | 'comprovante' | 'nf' | 'outro';
          url?: string;
          tamanho?: number;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}
