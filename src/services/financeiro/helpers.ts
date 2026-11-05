// Funções auxiliares puras e internas do núcleo financeiro.
import type { Lancamento } from '../../types';
import type { FiltrosFinanceiros, Periodo } from './tipos';
import { paraCentavos, somarCentavos, centavosParaNumber, type Centavos } from './dinheiro';

/** Datas ISO (yyyy-MM-dd) são comparáveis lexicograficamente. */
export function dataDentroDoPeriodo(data: string, periodo: Periodo): boolean {
  return data >= periodo.inicio && data <= periodo.fim;
}

export function aplicarFiltros(
  lancamentos: Lancamento[],
  filtros: FiltrosFinanceiros | undefined,
): Lancamento[] {
  if (!filtros) return lancamentos;
  return lancamentos.filter((l) => {
    if (filtros.empresaId !== undefined && l.empresaId !== filtros.empresaId) return false;
    if (filtros.categoriaId !== undefined && l.categoriaId !== filtros.categoriaId) return false;
    return true;
  });
}

const PADRAO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

export function competenciaValida(competencia: string): boolean {
  return PADRAO_COMPETENCIA.test(competencia);
}

/**
 * Soma o campo `valor` (ocorrência individual, nunca `valorTotal`) de uma
 * lista de lançamentos, convertendo cada um para centavos. Lançamentos cujo
 * valor não converte com segurança são excluídos da soma e reportados
 * separadamente pelo chamador.
 */
export function somarValoresOcorrencia(lancamentos: Lancamento[]): {
  totalCentavos: Centavos;
  invalidos: { lancamentoId: string; motivo: string }[];
} {
  const invalidos: { lancamentoId: string; motivo: string }[] = [];
  const centavosValidos: Centavos[] = [];
  for (const l of lancamentos) {
    const resultado = paraCentavos(l.valor);
    if (!resultado.valido) {
      invalidos.push({ lancamentoId: l.id, motivo: resultado.motivo });
      continue;
    }
    centavosValidos.push(resultado.centavos);
  }
  return { totalCentavos: somarCentavos(centavosValidos), invalidos };
}

export function paraResultadoMonetario(totalCentavos: Centavos, quantidade: number) {
  return { totalCentavos, total: centavosParaNumber(totalCentavos), quantidade };
}
