// Regime de caixa (Seção 05 do microgate 04.4): receitas/despesas
// REALIZADAS, baseadas estritamente em dataPagamento.
import type { Lancamento } from '../../types';
import type { FiltrosFinanceiros, Periodo, ResultadoMonetario } from './tipos';
import { aplicarFiltros, dataDentroDoPeriodo, somarValoresOcorrencia, paraResultadoMonetario } from './helpers';

export interface ResultadoRegimeCaixa extends ResultadoMonetario {
  valoresInvalidos: { lancamentoId: string; motivo: string }[];
}

function receitasOuDespesasRealizadas(
  lancamentos: Lancamento[],
  tipo: Lancamento['tipo'],
  statusElegivel: Lancamento['status'],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): ResultadoRegimeCaixa {
  const filtrados = aplicarFiltros(lancamentos, filtros).filter((l) => {
    if (l.tipo !== tipo) return false;
    if (l.status !== statusElegivel) return false;
    if (!l.dataPagamento) return false;
    return dataDentroDoPeriodo(l.dataPagamento, periodo);
  });
  const { totalCentavos, invalidos } = somarValoresOcorrencia(filtrados);
  return { ...paraResultadoMonetario(totalCentavos, filtrados.length), valoresInvalidos: invalidos };
}

/** Receitas realizadas: tipo=credito, status=recebido, dataPagamento dentro do período. */
export function calcularReceitasRealizadas(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): ResultadoRegimeCaixa {
  return receitasOuDespesasRealizadas(lancamentos, 'credito', 'recebido', periodo, filtros);
}

/** Despesas realizadas: tipo=debito, status=pago, dataPagamento dentro do período. */
export function calcularDespesasRealizadas(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): ResultadoRegimeCaixa {
  return receitasOuDespesasRealizadas(lancamentos, 'debito', 'pago', periodo, filtros);
}

export interface ResultadoCaixa {
  receitasRealizadas: ResultadoRegimeCaixa;
  despesasRealizadas: ResultadoRegimeCaixa;
  resultadoCentavos: number;
  resultado: number;
}

/** Resultado de caixa = receitas realizadas - despesas realizadas, no período/filtros dados. */
export function calcularResultadoCaixa(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): ResultadoCaixa {
  const receitasRealizadas = calcularReceitasRealizadas(lancamentos, periodo, filtros);
  const despesasRealizadas = calcularDespesasRealizadas(lancamentos, periodo, filtros);
  const resultadoCentavos = receitasRealizadas.totalCentavos - despesasRealizadas.totalCentavos;
  return { receitasRealizadas, despesasRealizadas, resultadoCentavos, resultado: resultadoCentavos / 100 };
}

/**
 * Lançamentos com status realizado (pago/recebido) cuja dataPagamento está
 * ausente — sinalizados como inconsistentes, nunca incluídos nos totais de
 * regime de caixa acima (que já exigem dataPagamento válida).
 */
export function identificarRealizadosSemDataPagamento(
  lancamentos: Lancamento[],
): { lancamentoId: string; tipo: Lancamento['tipo']; status: Lancamento['status'] }[] {
  return lancamentos
    .filter((l) => (l.status === 'pago' || l.status === 'recebido') && !l.dataPagamento)
    .map((l) => ({ lancamentoId: l.id, tipo: l.tipo, status: l.status }));
}
