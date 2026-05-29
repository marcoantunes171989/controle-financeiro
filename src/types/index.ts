export type TipoLancamento = 'credito' | 'debito';
export type StatusLancamento = 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
export type TipoRecorrencia = 'avista' | 'fixo' | 'parcelas';
export type Recorrencia = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  cor: string;
  ativo: boolean;
  createdAt: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
  icone: string;
  ativo: boolean;
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: 'boleto' | 'comprovante' | 'nf' | 'outro';
  url: string;
  tamanho: number;
  createdAt: string;
}

export interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  status: StatusLancamento;
  pago_em?: string;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  empresaId: string;
  empresa?: Empresa;
  categoriaId: string;
  categoria?: Categoria;
  valor: number;
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusLancamento;
  tipoRecorrencia: TipoRecorrencia;
  recorrencia?: Recorrencia;
  numeroParcelas?: number;
  parcelaAtual?: number;
  parcelas?: Parcela[];
  diaVencimento?: number;
  anexos: Anexo[];
  observacoes?: string;
  competencia: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiltroLancamento {
  empresaId?: string;
  categoriaId?: string;
  status?: StatusLancamento;
  tipo?: TipoLancamento;
  competencia?: string;
  busca?: string;
}

export interface DashboardKpis {
  receitasMes: number;
  despesasMes: number;
  saldoLiquido: number;
  totalVencer7dias: number;
  totalVencer30dias: number;
  titulosPendentes: number;
}

export interface FluxoMensal {
  mes: string;
  mesAbrev: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoriaTotais {
  categoriaId: string;
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
}
