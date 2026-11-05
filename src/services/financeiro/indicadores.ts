// Indicadores financeiros (Seção 09 do microgate 04.4).
//
// Não implementa como valores reais: saldo bancário, liquidez corrente, ROI,
// ponto de equilíbrio ou DRE contábil completa — esses exigem modelagem de
// dados que este contrato não possui (ex.: saldo inicial de caixa).
import type { Lancamento } from '../../types';
import type { FiltrosFinanceiros, IndicadorPercentual, Periodo, ResultadoMonetario } from './tipos';
import { aplicarFiltros, somarValoresOcorrencia, paraResultadoMonetario, dataDentroDoPeriodo } from './helpers';
import type { Centavos } from './dinheiro';
import { calcularReceitasRealizadas, calcularDespesasRealizadas } from './regimeCaixa';
import { calcularContasReceber, calcularReceitasPrevistas } from './previsao';

/** Percentual de variação entre dois valores em centavos. Denominador zero não é calculável. */
export function calcularVariacaoPercentual(anteriorCentavos: Centavos, atualCentavos: Centavos): IndicadorPercentual {
  if (anteriorCentavos === 0) return { calculavel: false, motivo: 'denominador_zero' };
  return { calculavel: true, percentual: ((atualCentavos - anteriorCentavos) / Math.abs(anteriorCentavos)) * 100 };
}

/** Margem financeira = resultado de caixa / receitas realizadas, no período/filtros dados. */
export function calcularMargemFinanceira(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): IndicadorPercentual {
  const receitas = calcularReceitasRealizadas(lancamentos, periodo, filtros);
  const despesas = calcularDespesasRealizadas(lancamentos, periodo, filtros);
  if (receitas.totalCentavos === 0) return { calculavel: false, motivo: 'denominador_zero' };
  const resultadoCentavos = receitas.totalCentavos - despesas.totalCentavos;
  return { calculavel: true, percentual: (resultadoCentavos / receitas.totalCentavos) * 100 };
}

export interface DespesaPorCategoria {
  categoriaId: string;
  resultado: ResultadoMonetario;
}

export interface ResultadoDespesasCategoria {
  porCategoria: DespesaPorCategoria[];
  total: ResultadoMonetario;
  valoresInvalidos: { lancamentoId: string; motivo: string }[];
}

/**
 * Despesas por categoria = total de despesas realizadas (regime de caixa)
 * elegíveis sob o mesmo período e filtros, agrupadas por categoriaId.
 * Reconciliação: soma de `porCategoria` == `total` (Seção 11).
 */
export function calcularDespesasCategoria(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): ResultadoDespesasCategoria {
  const elegiveis = aplicarFiltros(lancamentos, filtros).filter((l) => {
    if (l.tipo !== 'debito' || l.status !== 'pago' || !l.dataPagamento) return false;
    return dataDentroDoPeriodo(l.dataPagamento, periodo);
  });

  const porCategoriaMap = new Map<string, Lancamento[]>();
  for (const l of elegiveis) {
    const grupo = porCategoriaMap.get(l.categoriaId) ?? [];
    grupo.push(l);
    porCategoriaMap.set(l.categoriaId, grupo);
  }

  const porCategoria: DespesaPorCategoria[] = [];
  const invalidosTotal: { lancamentoId: string; motivo: string }[] = [];
  porCategoriaMap.forEach((grupo, categoriaId) => {
    const { totalCentavos, invalidos } = somarValoresOcorrencia(grupo);
    porCategoria.push({ categoriaId, resultado: paraResultadoMonetario(totalCentavos, grupo.length) });
    invalidosTotal.push(...invalidos);
  });

  const { totalCentavos, invalidos } = somarValoresOcorrencia(elegiveis);
  return {
    porCategoria,
    total: paraResultadoMonetario(totalCentavos, elegiveis.length),
    valoresInvalidos: invalidos.length ? invalidos : invalidosTotal,
  };
}

/** Concentração de despesas: participação percentual de cada categoria no total do período. */
export function calcularConcentracaoDespesas(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): { categoriaId: string; percentual: IndicadorPercentual }[] {
  const { porCategoria, total } = calcularDespesasCategoria(lancamentos, periodo, filtros);
  return porCategoria.map(({ categoriaId, resultado }) => ({
    categoriaId,
    percentual: calcularVariacaoPercentualDeParticipacao(resultado.totalCentavos, total.totalCentavos),
  }));
}

function calcularVariacaoPercentualDeParticipacao(parteCentavos: Centavos, totalCentavos: Centavos): IndicadorPercentual {
  if (totalCentavos === 0) return { calculavel: false, motivo: 'denominador_zero' };
  return { calculavel: true, percentual: (parteCentavos / totalCentavos) * 100 };
}

/**
 * Resultado de caixa individual por empresa (receitas realizadas - despesas
 * realizadas), para cada empresaId presente nos lançamentos fornecidos, e a
 * consolidação dos mesmos lançamentos. Não substitui RLS: a autorização dos
 * dados (quais lançamentos chegam aqui) é responsabilidade da camada de acesso.
 */
export function calcularResultadoEmpresa(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros?: FiltrosFinanceiros,
): {
  porEmpresa: { empresaId: string; receitasCentavos: Centavos; despesasCentavos: Centavos; resultadoCentavos: Centavos }[];
  consolidado: { receitasCentavos: Centavos; despesasCentavos: Centavos; resultadoCentavos: Centavos };
} {
  const base = aplicarFiltros(lancamentos, filtros);
  const empresaIds = Array.from(new Set(base.map((l) => l.empresaId)));

  const porEmpresa = empresaIds.map((empresaId) => {
    const filtrosEmpresa: FiltrosFinanceiros = { ...filtros, empresaId };
    const receitas = calcularReceitasRealizadas(lancamentos, periodo, filtrosEmpresa);
    const despesas = calcularDespesasRealizadas(lancamentos, periodo, filtrosEmpresa);
    return {
      empresaId,
      receitasCentavos: receitas.totalCentavos,
      despesasCentavos: despesas.totalCentavos,
      resultadoCentavos: receitas.totalCentavos - despesas.totalCentavos,
    };
  });

  const receitasConsolidadas = calcularReceitasRealizadas(lancamentos, periodo, filtros);
  const despesasConsolidadas = calcularDespesasRealizadas(lancamentos, periodo, filtros);

  return {
    porEmpresa,
    consolidado: {
      receitasCentavos: receitasConsolidadas.totalCentavos,
      despesasCentavos: despesasConsolidadas.totalCentavos,
      resultadoCentavos: receitasConsolidadas.totalCentavos - despesasConsolidadas.totalCentavos,
    },
  };
}

/**
 * Inadimplência de recebíveis = receitas vencidas em aberto / total a
 * receber (créditos em aberto), na data de referência dada. Considera
 * exclusivamente títulos de crédito vencidos em aberto — nunca obrigações
 * (débitos) vencidas, que são um conceito distinto (Seção 09).
 */
export function calcularInadimplenciaRecebiveis(
  lancamentos: Lancamento[],
  dataReferencia: string,
  filtros?: FiltrosFinanceiros,
): IndicadorPercentual {
  const totalAReceber = calcularContasReceber(lancamentos, filtros);
  const vencidas = calcularReceitasPrevistas(lancamentos, dataReferencia, filtros).vencidasEmAberto;
  if (totalAReceber.totalCentavos === 0) return { calculavel: false, motivo: 'denominador_zero' };
  return { calculavel: true, percentual: (vencidas.totalCentavos / totalAReceber.totalCentavos) * 100 };
}
