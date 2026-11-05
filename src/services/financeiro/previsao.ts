// Previsão financeira (Seção 06 do microgate 04.4): títulos em aberto,
// vencidos ou a vencer, com base em dataVencimento.
//
// A regra de vencimento é recalculada aqui a partir de dataVencimento e de
// uma data de referência explícita, em vez de confiar no campo `status`
// persistido (que pode estar desatualizado se o lançamento não passou por
// resolveStatus recentemente). Isso centraliza, conceitualmente, a mesma
// regra usada por resolveStatus (src/hooks/useLancamentos.ts): um título
// vence apenas quando dataVencimento é estritamente anterior à data de
// referência — o dia do próprio vencimento NÃO é tratado como vencido.
import type { Lancamento } from '../../types';
import type { FiltrosFinanceiros, ResultadoMonetario } from './tipos';
import { aplicarFiltros, somarValoresOcorrencia, paraResultadoMonetario } from './helpers';

/** Títulos "em aberto": nem realizados (pago/recebido), nem cancelados. */
function titulosEmAberto(lancamentos: Lancamento[], tipo: Lancamento['tipo']): Lancamento[] {
  return lancamentos.filter((l) => l.tipo === tipo && (l.status === 'pendente' || l.status === 'vencido'));
}

function estaVencido(dataVencimento: string, dataReferencia: string): boolean {
  return dataVencimento < dataReferencia;
}

export interface ResultadoPrevisao {
  aVencer: ResultadoMonetario;
  vencidasEmAberto: ResultadoMonetario;
  total: ResultadoMonetario;
  valoresInvalidos: { lancamentoId: string; motivo: string }[];
}

function previsaoPorTipo(
  lancamentos: Lancamento[],
  tipo: Lancamento['tipo'],
  dataReferencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoPrevisao {
  const abertos = aplicarFiltros(titulosEmAberto(lancamentos, tipo), filtros);
  const vencidas = abertos.filter((l) => estaVencido(l.dataVencimento, dataReferencia));
  const aVencer = abertos.filter((l) => !estaVencido(l.dataVencimento, dataReferencia));

  const somaVencidas = somarValoresOcorrencia(vencidas);
  const somaAVencer = somarValoresOcorrencia(aVencer);
  const somaTotal = somarValoresOcorrencia(abertos);

  return {
    vencidasEmAberto: paraResultadoMonetario(somaVencidas.totalCentavos, vencidas.length),
    aVencer: paraResultadoMonetario(somaAVencer.totalCentavos, aVencer.length),
    total: paraResultadoMonetario(somaTotal.totalCentavos, abertos.length),
    valoresInvalidos: [...somaVencidas.invalidos, ...somaAVencer.invalidos],
  };
}

/** Receitas previstas: créditos em aberto, divididos entre a vencer e vencidos. */
export function calcularReceitasPrevistas(
  lancamentos: Lancamento[],
  dataReferencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoPrevisao {
  return previsaoPorTipo(lancamentos, 'credito', dataReferencia, filtros);
}

/** Despesas previstas: débitos em aberto, divididos entre a vencer e vencidos. */
export function calcularDespesasPrevistas(
  lancamentos: Lancamento[],
  dataReferencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoPrevisao {
  return previsaoPorTipo(lancamentos, 'debito', dataReferencia, filtros);
}

/** Contas a receber: total de créditos em aberto (vencidos + a vencer), sem split por data. */
export function calcularContasReceber(
  lancamentos: Lancamento[],
  filtros?: FiltrosFinanceiros,
): ResultadoMonetario & { valoresInvalidos: { lancamentoId: string; motivo: string }[] } {
  const abertos = aplicarFiltros(titulosEmAberto(lancamentos, 'credito'), filtros);
  const { totalCentavos, invalidos } = somarValoresOcorrencia(abertos);
  return { ...paraResultadoMonetario(totalCentavos, abertos.length), valoresInvalidos: invalidos };
}

/** Contas a pagar: total de débitos em aberto (vencidos + a vencer), sem split por data. */
export function calcularContasPagar(
  lancamentos: Lancamento[],
  filtros?: FiltrosFinanceiros,
): ResultadoMonetario & { valoresInvalidos: { lancamentoId: string; motivo: string }[] } {
  const abertos = aplicarFiltros(titulosEmAberto(lancamentos, 'debito'), filtros);
  const { totalCentavos, invalidos } = somarValoresOcorrencia(abertos);
  return { ...paraResultadoMonetario(totalCentavos, abertos.length), valoresInvalidos: invalidos };
}

export interface ResultadoTitulosVencidos {
  receitasVencidas: ResultadoMonetario;
  despesasVencidas: ResultadoMonetario;
}

/** Títulos vencidos em aberto, separados por tipo (crédito/débito). */
export function calcularTitulosVencidos(
  lancamentos: Lancamento[],
  dataReferencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoTitulosVencidos {
  return {
    receitasVencidas: calcularReceitasPrevistas(lancamentos, dataReferencia, filtros).vencidasEmAberto,
    despesasVencidas: calcularDespesasPrevistas(lancamentos, dataReferencia, filtros).vencidasEmAberto,
  };
}

/**
 * Resultado líquido previsto = total a receber - total a pagar (títulos em
 * aberto). Não representa saldo bancário projetado: não há saldo inicial
 * confiável disponível neste contrato.
 */
export function calcularResultadoLiquidoPrevisto(
  lancamentos: Lancamento[],
  filtros?: FiltrosFinanceiros,
): { totalAReceberCentavos: number; totalAPagarCentavos: number; resultadoCentavos: number; resultado: number } {
  const aReceber = calcularContasReceber(lancamentos, filtros);
  const aPagar = calcularContasPagar(lancamentos, filtros);
  const resultadoCentavos = aReceber.totalCentavos - aPagar.totalCentavos;
  return {
    totalAReceberCentavos: aReceber.totalCentavos,
    totalAPagarCentavos: aPagar.totalCentavos,
    resultadoCentavos,
    resultado: resultadoCentavos / 100,
  };
}
