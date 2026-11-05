// Competência operacional (Seção 07 do microgate 04.4).
//
// Usa exclusivamente o campo `competencia` (formato YYYY-MM) já existente
// no lançamento — nunca a data de vencimento como substituta. Não é
// chamado de "lucro contábil": é um agregado operacional por competência
// informada, sujeito às mesmas limitações de regime que o restante do
// contrato de dados atual.
import type { Lancamento } from '../../types';
import type { FiltrosFinanceiros, ResultadoMonetario } from './tipos';
import { aplicarFiltros, competenciaValida, somarValoresOcorrencia, paraResultadoMonetario } from './helpers';

export interface ResultadoCompetencia extends ResultadoMonetario {
  competenciasInvalidas: { lancamentoId: string; competencia: string }[];
  valoresInvalidos: { lancamentoId: string; motivo: string }[];
}

function porTipoECompetencia(
  lancamentos: Lancamento[],
  tipo: Lancamento['tipo'],
  competencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoCompetencia {
  const base = aplicarFiltros(lancamentos, filtros).filter((l) => l.tipo === tipo && l.status !== 'cancelado');

  const competenciasInvalidas = base
    .filter((l) => !competenciaValida(l.competencia))
    .map((l) => ({ lancamentoId: l.id, competencia: l.competencia }));

  const elegiveis = base.filter((l) => competenciaValida(l.competencia) && l.competencia === competencia);
  const { totalCentavos, invalidos } = somarValoresOcorrencia(elegiveis);

  return {
    ...paraResultadoMonetario(totalCentavos, elegiveis.length),
    competenciasInvalidas,
    valoresInvalidos: invalidos,
  };
}

/** Receitas por competência: créditos não cancelados da competência informada. */
export function calcularReceitasPorCompetencia(
  lancamentos: Lancamento[],
  competencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoCompetencia {
  return porTipoECompetencia(lancamentos, 'credito', competencia, filtros);
}

/** Despesas por competência: débitos não cancelados da competência informada. */
export function calcularDespesasPorCompetencia(
  lancamentos: Lancamento[],
  competencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoCompetencia {
  return porTipoECompetencia(lancamentos, 'debito', competencia, filtros);
}

export interface ResultadoOperacionalCompetencia {
  receitas: ResultadoCompetencia;
  despesas: ResultadoCompetencia;
  resultadoCentavos: number;
  resultado: number;
}

/** Resultado operacional por competência = receitas - despesas, ambas não canceladas. */
export function calcularResultadoPorCompetencia(
  lancamentos: Lancamento[],
  competencia: string,
  filtros?: FiltrosFinanceiros,
): ResultadoOperacionalCompetencia {
  const receitas = calcularReceitasPorCompetencia(lancamentos, competencia, filtros);
  const despesas = calcularDespesasPorCompetencia(lancamentos, competencia, filtros);
  const resultadoCentavos = receitas.totalCentavos - despesas.totalCentavos;
  return { receitas, despesas, resultadoCentavos, resultado: resultadoCentavos / 100 };
}

export interface PontoEvolucaoMensal {
  competencia: string;
  receitas: ResultadoCompetencia;
  despesas: ResultadoCompetencia;
  resultadoCentavos: number;
  resultado: number;
}

/**
 * Evolução mensal entre duas competências (inclusive), em ordem cronológica.
 * `competenciaInicio`/`competenciaFim` devem estar no formato YYYY-MM.
 */
export function calcularEvolucaoMensal(
  lancamentos: Lancamento[],
  competenciaInicio: string,
  competenciaFim: string,
  filtros?: FiltrosFinanceiros,
): PontoEvolucaoMensal[] {
  const competencias = listarCompetenciasEntre(competenciaInicio, competenciaFim);
  return competencias.map((competencia) => {
    const r = calcularResultadoPorCompetencia(lancamentos, competencia, filtros);
    return { competencia, receitas: r.receitas, despesas: r.despesas, resultadoCentavos: r.resultadoCentavos, resultado: r.resultado };
  });
}

function listarCompetenciasEntre(inicio: string, fim: string): string[] {
  const [anoIni, mesIni] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  const competencias: string[] = [];
  let ano = anoIni;
  let mes = mesIni;
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    competencias.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return competencias;
}

export interface ComparacaoPeriodos {
  competenciaA: PontoEvolucaoMensal;
  competenciaB: PontoEvolucaoMensal;
  variacaoReceitasCentavos: number;
  variacaoDespesasCentavos: number;
  variacaoResultadoCentavos: number;
}

/** Compara o resultado de duas competências específicas (não necessariamente adjacentes). */
export function compararCompetencias(
  lancamentos: Lancamento[],
  competenciaA: string,
  competenciaB: string,
  filtros?: FiltrosFinanceiros,
): ComparacaoPeriodos {
  const [pontoA] = calcularEvolucaoMensal(lancamentos, competenciaA, competenciaA, filtros);
  const [pontoB] = calcularEvolucaoMensal(lancamentos, competenciaB, competenciaB, filtros);
  return {
    competenciaA: pontoA,
    competenciaB: pontoB,
    variacaoReceitasCentavos: pontoB.receitas.totalCentavos - pontoA.receitas.totalCentavos,
    variacaoDespesasCentavos: pontoB.despesas.totalCentavos - pontoA.despesas.totalCentavos,
    variacaoResultadoCentavos: pontoB.resultadoCentavos - pontoA.resultadoCentavos,
  };
}
