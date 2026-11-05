// Tipos do núcleo financeiro compartilhado (Microgate 04.4).
import type { Lancamento } from '../../types';
import type { Centavos } from './dinheiro';

/** Período de datas ISO (yyyy-MM-dd), ambos os limites inclusivos. */
export interface Periodo {
  inicio: string;
  fim: string;
}

/** Filtros explícitos aceitos pelas funções do núcleo. Nenhum é lido de estado global. */
export interface FiltrosFinanceiros {
  empresaId?: string;
  categoriaId?: string;
}

/** Resultado monetário com a trilha de lançamentos que o compõem. */
export interface ResultadoMonetario {
  totalCentavos: Centavos;
  total: number;
  quantidade: number;
}

/** Um lançamento cujo valor não pôde ser convertido para centavos com segurança. */
export interface LancamentoComValorInvalido {
  lancamentoId: string;
  motivo: string;
}

/** Um lançamento com competência fora do formato/intervalo esperado (YYYY-MM, mês 01-12). */
export interface LancamentoComCompetenciaInvalida {
  lancamentoId: string;
  competencia: string;
}

/** Um lançamento "realizado" (pago/recebido) sem dataPagamento preenchida. */
export interface LancamentoRealizadoSemDataPagamento {
  lancamentoId: string;
  tipo: Lancamento['tipo'];
  status: Lancamento['status'];
}

/** Relatório de inconsistências encontradas ao processar um conjunto de lançamentos. */
export interface RelatorioInconsistencias {
  valoresInvalidos: LancamentoComValorInvalido[];
  competenciasInvalidas: LancamentoComCompetenciaInvalida[];
  realizadosSemDataPagamento: LancamentoRealizadoSemDataPagamento[];
}

/** Indicador percentual que pode não ser calculável (denominador zero). */
export type IndicadorPercentual =
  | { calculavel: true; percentual: number }
  | { calculavel: false; motivo: 'denominador_zero' };

export function relatorioVazio(): RelatorioInconsistencias {
  return { valoresInvalidos: [], competenciasInvalidas: [], realizadosSemDataPagamento: [] };
}
