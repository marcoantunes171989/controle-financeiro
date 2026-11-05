// Relatório de inconsistências (Seções 06/07/09): agrega, sem ocultar nada,
// os registros que não podem ser incluídos com segurança nos indicadores.
import type { Lancamento } from '../../types';
import type { RelatorioInconsistencias } from './tipos';
import { competenciaValida } from './helpers';
import { paraCentavos } from './dinheiro';
import { identificarRealizadosSemDataPagamento } from './regimeCaixa';

/** Varre todos os lançamentos fornecidos e reporta cada tipo de inconsistência, sem filtrar por período. */
export function gerarRelatorioInconsistencias(lancamentos: Lancamento[]): RelatorioInconsistencias {
  const valoresInvalidos = lancamentos
    .map((l) => ({ lancamentoId: l.id, resultado: paraCentavos(l.valor) }))
    .filter((r) => !r.resultado.valido)
    .map((r) => ({ lancamentoId: r.lancamentoId, motivo: (r.resultado as { motivo: string }).motivo }));

  const competenciasInvalidas = lancamentos
    .filter((l) => !competenciaValida(l.competencia))
    .map((l) => ({ lancamentoId: l.id, competencia: l.competencia }));

  const realizadosSemDataPagamento = identificarRealizadosSemDataPagamento(lancamentos);

  return { valoresInvalidos, competenciasInvalidas, realizadosSemDataPagamento };
}
