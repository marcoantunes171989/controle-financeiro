import { useOutletContext } from 'react-router-dom';
import { format, endOfMonth } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { useLancamentos } from '../hooks/useLancamentos';
import { useEmpresas } from '../hooks/useEmpresas';
import { useCategorias } from '../hooks/useCategorias';
import KpiCard from '../components/shared/KpiCard';
import CategoriaDonut from '../components/shared/CategoriaDonut';
import LancamentoRow from '../components/shared/LancamentoRow';
import EvolucaoCaixaChart, { type PontoEvolucaoCaixa } from '../components/dashboard/EvolucaoCaixaChart';
import ComparativoPeriodoCard, { type ComparativoValor } from '../components/dashboard/ComparativoPeriodoCard';
import RankingDespesasList, { type ItemRankingDespesa } from '../components/dashboard/RankingDespesasList';
import CategoriaRankingList from '../components/dashboard/CategoriaRankingList';
import { Card } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import type { Lancamento, CategoriaTotais, Empresa, Categoria } from '../types';
import { fmtMesAno } from '../utils/format';
import {
  aplicarFiltros,
  dataDentroDoPeriodo,
  paraCentavos,
  centavosParaNumber,
  calcularReceitasRealizadas,
  calcularDespesasRealizadas,
  calcularMargemFinanceira,
  calcularReceitasPrevistas,
  calcularDespesasPrevistas,
  calcularDespesasCategoria,
  calcularVariacaoPercentual,
  gerarRelatorioInconsistencias,
  type FiltrosFinanceiros,
  type Periodo,
} from '../services/financeiro';

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

/** Dados agregados e já reconciliados do Dashboard Executivo, no regime de caixa. */
interface IndicadoresDashboard {
  periodo: Periodo;
  receitasRealizadas: ReturnType<typeof calcularReceitasRealizadas>;
  despesasRealizadas: ReturnType<typeof calcularDespesasRealizadas>;
  resultadoCaixaCentavos: number;
  margem: ReturnType<typeof calcularMargemFinanceira>;
  receitasPrevistas: ReturnType<typeof calcularReceitasPrevistas>;
  despesasPrevistas: ReturnType<typeof calcularDespesasPrevistas>;
  despesasCategoria: ReturnType<typeof calcularDespesasCategoria>;
  evolucao: PontoEvolucaoCaixa[];
  evolucaoAnual: PontoEvolucaoCaixa[];
  comparativoMesAnterior: ComparativoPeriodo;
  comparativoAnoAnterior: ComparativoPeriodo;
  rankingDespesas: ItemRankingDespesa[];
  inconsistencias: ReturnType<typeof gerarRelatorioInconsistencias>;
  ultimos10: Lancamento[];
  proxVencimentos: Lancamento[];
  despesasComPct: CategoriaTotais[];
  /** Quantidade de lançamentos após aplicar os filtros (Seção 05 — ESTADO B). */
  totalLancamentosFiltrados: number;
}

/** Comparação de um período (Seção 06 do Microgate 06) contra uma referência histórica. */
interface ComparativoPeriodo {
  rotuloAtual: string;
  rotuloAnterior: string;
  receitas: ComparativoValor;
  despesas: ComparativoValor;
  resultado: ComparativoValor;
}

function periodoDoMes(competencia: string): Periodo {
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioDate = new Date(ano, mes - 1, 1);
  return {
    inicio: format(inicioDate, 'yyyy-MM-dd'),
    fim: format(endOfMonth(inicioDate), 'yyyy-MM-dd'),
  };
}

function competenciasAnteriores(competencia: string, quantidade: number): string[] {
  const [ano, mes] = competencia.split('-').map(Number);
  const resultado: string[] = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    const d = new Date(ano, mes - 1 - i, 1);
    resultado.push(format(d, 'yyyy-MM'));
  }
  return resultado;
}

/** Desloca uma competência (YYYY-MM) por `deltaMeses` meses (Seção 06). */
function competenciaDeslocada(competencia: string, deltaMeses: number): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const d = new Date(ano, mes - 1 + deltaMeses, 1);
  return format(d, 'yyyy-MM');
}

/** Monta a série de evolução (regime de caixa realizado) para uma lista de competências. */
function construirSerieEvolucao(
  lancamentos: Lancamento[],
  competencias: string[],
  filtros: FiltrosFinanceiros | undefined,
): PontoEvolucaoCaixa[] {
  return competencias.map((comp) => {
    const periodoMes = periodoDoMes(comp);
    const receitas = calcularReceitasRealizadas(lancamentos, periodoMes, filtros);
    const despesas = calcularDespesasRealizadas(lancamentos, periodoMes, filtros);
    const [ano, mes] = comp.split('-').map(Number);
    return {
      mes: comp,
      mesAbrev: format(new Date(ano, mes - 1, 1), 'MMM'),
      receitas: receitas.total,
      despesas: despesas.total,
      resultado: receitas.total - despesas.total,
    };
  });
}

/**
 * Compara um valor (em centavos) do período atual contra um período de
 * referência, reutilizando exclusivamente `calcularVariacaoPercentual` do
 * núcleo financeiro. Mudança de sinal é sinalizada separadamente — nunca
 * apresentada como uma variação percentual convencional (Seção 06).
 */
function compararCentavos(atualCentavos: number, anteriorCentavos: number): ComparativoValor {
  const mudancaSinal =
    (anteriorCentavos < 0 && atualCentavos > 0) || (anteriorCentavos > 0 && atualCentavos < 0);
  return {
    atual: centavosParaNumber(atualCentavos),
    anterior: centavosParaNumber(anteriorCentavos),
    diferenca: centavosParaNumber(atualCentavos - anteriorCentavos),
    percentual: calcularVariacaoPercentual(anteriorCentavos, atualCentavos),
    mudancaSinal,
  };
}

/** Constrói a comparação completa (receitas/despesas/resultado) entre dois períodos mensais. */
function construirComparativoPeriodo(
  lancamentos: Lancamento[],
  competenciaAtual: string,
  competenciaReferencia: string,
  filtros: FiltrosFinanceiros | undefined,
): ComparativoPeriodo {
  const periodoAtual = periodoDoMes(competenciaAtual);
  const periodoReferencia = periodoDoMes(competenciaReferencia);

  const receitasAtual = calcularReceitasRealizadas(lancamentos, periodoAtual, filtros);
  const despesasAtual = calcularDespesasRealizadas(lancamentos, periodoAtual, filtros);
  const receitasRef = calcularReceitasRealizadas(lancamentos, periodoReferencia, filtros);
  const despesasRef = calcularDespesasRealizadas(lancamentos, periodoReferencia, filtros);

  const resultadoAtualCentavos = receitasAtual.totalCentavos - despesasAtual.totalCentavos;
  const resultadoRefCentavos = receitasRef.totalCentavos - despesasRef.totalCentavos;

  return {
    rotuloAtual: fmtMesAno(competenciaAtual),
    rotuloAnterior: fmtMesAno(competenciaReferencia),
    receitas: compararCentavos(receitasAtual.totalCentavos, receitasRef.totalCentavos),
    despesas: compararCentavos(despesasAtual.totalCentavos, despesasRef.totalCentavos),
    resultado: compararCentavos(resultadoAtualCentavos, resultadoRefCentavos),
  };
}

/**
 * Ranking decrescente das maiores despesas pagas individuais do período
 * (Seção 07/08): mesmo regime de caixa realizado e mesmos filtros das
 * demais apurações, usando `paraCentavos` do núcleo para ordenar com
 * precisão exata (nunca float bruto).
 */
function construirRankingDespesas(
  lancamentos: Lancamento[],
  periodo: Periodo,
  filtros: FiltrosFinanceiros | undefined,
  empresas: Empresa[],
  categorias: Categoria[],
  limite: number,
): ItemRankingDespesa[] {
  const elegiveis = aplicarFiltros(lancamentos, filtros).filter((l) => {
    if (l.tipo !== 'debito' || l.status !== 'pago' || !l.dataPagamento) return false;
    return dataDentroDoPeriodo(l.dataPagamento, periodo);
  });

  const comCentavos = elegiveis
    .map((l) => ({ lancamento: l, resultado: paraCentavos(l.valor) }))
    .filter((r) => r.resultado.valido) as { lancamento: Lancamento; resultado: { valido: true; centavos: number } }[];

  return comCentavos
    .sort((a, b) => b.resultado.centavos - a.resultado.centavos)
    .slice(0, limite)
    .map(({ lancamento, resultado }) => ({
      id: lancamento.id,
      descricao: lancamento.descricao,
      categoriaNome: categorias.find((c) => c.id === lancamento.categoriaId)?.nome ?? 'Sem categoria',
      empresaNome: empresas.find((e) => e.id === lancamento.empresaId)?.nomeFantasia ?? 'Sem empresa',
      dataPagamento: lancamento.dataPagamento as string,
      valor: centavosParaNumber(resultado.centavos),
    }));
}

/** Monta os indicadores do regime de caixa realizado (Seção 03) para o período/empresa selecionados. */
function construirIndicadores(
  lancamentos: Lancamento[],
  empresas: Empresa[],
  categorias: Categoria[],
  competencia: string,
  hoje: string,
  filtros: FiltrosFinanceiros | undefined,
): IndicadoresDashboard {
  const periodo = periodoDoMes(competencia);

  const receitasRealizadas = calcularReceitasRealizadas(lancamentos, periodo, filtros);
  const despesasRealizadas = calcularDespesasRealizadas(lancamentos, periodo, filtros);
  const resultadoCaixaCentavos = receitasRealizadas.totalCentavos - despesasRealizadas.totalCentavos;
  const margem = calcularMargemFinanceira(lancamentos, periodo, filtros);

  const receitasPrevistas = calcularReceitasPrevistas(lancamentos, hoje, filtros);
  const despesasPrevistas = calcularDespesasPrevistas(lancamentos, hoje, filtros);

  const despesasCategoria = calcularDespesasCategoria(lancamentos, periodo, filtros);

  const evolucao = construirSerieEvolucao(lancamentos, competenciasAnteriores(competencia, 6), filtros);
  const evolucaoAnual = construirSerieEvolucao(lancamentos, competenciasAnteriores(competencia, 12), filtros);

  const comparativoMesAnterior = construirComparativoPeriodo(
    lancamentos,
    competencia,
    competenciaDeslocada(competencia, -1),
    filtros,
  );
  const comparativoAnoAnterior = construirComparativoPeriodo(
    lancamentos,
    competencia,
    competenciaDeslocada(competencia, -12),
    filtros,
  );

  const rankingDespesas = construirRankingDespesas(lancamentos, periodo, filtros, empresas, categorias, 8);

  const base = aplicarFiltros(lancamentos, filtros);
  const inconsistencias = gerarRelatorioInconsistencias(base);

  const enriched = enrich(base, empresas, categorias);
  const ultimos10 = [...enriched]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  const proxVencimentos = enriched
    .filter((l) => l.status === 'pendente' || l.status === 'vencido')
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 5);

  const despesasComPct = despesasCategoriaParaDonut(despesasCategoria, categorias);

  return {
    periodo,
    receitasRealizadas,
    despesasRealizadas,
    resultadoCaixaCentavos,
    margem,
    receitasPrevistas,
    despesasPrevistas,
    despesasCategoria,
    evolucao,
    evolucaoAnual,
    comparativoMesAnterior,
    comparativoAnoAnterior,
    rankingDespesas,
    inconsistencias,
    ultimos10,
    proxVencimentos,
    despesasComPct,
    totalLancamentosFiltrados: base.length,
  };
}

function enrich(lancamentos: Lancamento[], empresas: Empresa[], categorias: Categoria[]) {
  return lancamentos.map((l) => ({
    ...l,
    empresa: empresas.find((e) => e.id === l.empresaId),
    categoria: categorias.find((c) => c.id === l.categoriaId),
  }));
}

function despesasCategoriaParaDonut(
  despesasCategoria: IndicadoresDashboard['despesasCategoria'],
  categorias: Categoria[],
): CategoriaTotais[] {
  const totalCentavos = despesasCategoria.total.totalCentavos;
  return despesasCategoria.porCategoria
    .map(({ categoriaId, resultado }) => {
      const categoria = categorias.find((c) => c.id === categoriaId);
      return {
        categoriaId,
        nome: categoria?.nome ?? 'Sem categoria',
        valor: resultado.total,
        cor: categoria?.cor ?? '#94a3b8',
        percentual: totalCentavos === 0 ? 0 : (resultado.totalCentavos / totalCentavos) * 100,
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

/** Cartão de indicador que não pôde ser calculado com confiança (Seção 09). Nunca exibe zero no lugar. */
function IndicadorIndisponivel({ title, icon, motivo }: { title: string; icon: React.ReactNode; motivo: string }) {
  return (
    <div className="rounded-xl border border-l-4 border-slate-300 bg-slate-50 p-5 flex items-start gap-4">
      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-lg font-semibold text-slate-500 mt-1">Indisponível</p>
        <p className="text-xs text-slate-400 mt-1">{motivo}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { competencia } = useOutletContext<OutletCtx>();
  const {
    lancamentos,
    isLoading: carregandoLancamentos,
    isError: erroLancamentos,
    error: erroLancamentosDetalhe,
    refetch: refetchLancamentos,
  } = useLancamentos();
  const {
    empresas,
    isLoading: carregandoEmpresas,
    isError: erroEmpresas,
    error: erroEmpresasDetalhe,
    refetch: refetchEmpresas,
  } = useEmpresas();
  const {
    categorias,
    isLoading: carregandoCategorias,
    isError: erroCategorias,
    error: erroCategoriasDetalhe,
    refetch: refetchCategorias,
  } = useCategorias();

  const carregando = carregandoLancamentos || carregandoEmpresas || carregandoCategorias;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  // ESTADO C (Seção 05): falha de consulta nunca é tratada como ausência de
  // registros. Qualquer uma das três fontes falhando interrompe a exibição
  // de indicadores (eles dependem de lançamentos + empresas + categorias
  // simultaneamente) antes que dados obsoletos de cache sejam apresentados
  // como atuais.
  const fontesComErro: { nome: string; detalhe: unknown; refetch: () => void }[] = [];
  if (erroLancamentos) fontesComErro.push({ nome: 'lançamentos', detalhe: erroLancamentosDetalhe, refetch: refetchLancamentos });
  if (erroEmpresas) fontesComErro.push({ nome: 'empresas', detalhe: erroEmpresasDetalhe, refetch: refetchEmpresas });
  if (erroCategorias) fontesComErro.push({ nome: 'categorias', detalhe: erroCategoriasDetalhe, refetch: refetchCategorias });

  if (fontesComErro.length > 0) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-start gap-3 text-destructive">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Não foi possível carregar as informações financeiras.</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">
                {fontesComErro.map((f) => (
                  <li key={f.nome}>Falha ao consultar {f.nome}.</li>
                ))}
              </ul>
              <div className="flex gap-3 mt-3">
                {fontesComErro.map((f) => (
                  <button
                    key={f.nome}
                    type="button"
                    onClick={() => f.refetch()}
                    className="text-xs font-medium text-primary underline underline-offset-2"
                  >
                    Tentar novamente ({f.nome})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const empresaOptions = [
    { value: '', label: 'Todas as empresas (consolidado)' },
    ...empresas.map((e) => ({ value: e.id, label: e.nomeFantasia })),
  ];

  // A empresa selecionada é um estado local de apresentação, derivado da
  // própria URL para não exigir alterações em componentes compartilhados
  // (Seção 06): usamos querystring para persistir a escolha sem tocar em
  // Sidebar/Topbar/AppLayout.
  const params = new URLSearchParams(window.location.search);
  const empresaId = params.get('empresaId') ?? '';
  const onEmpresaChange = (novoId: string) => {
    const novosParams = new URLSearchParams(window.location.search);
    if (novoId) novosParams.set('empresaId', novoId);
    else novosParams.delete('empresaId');
    const query = novosParams.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    window.dispatchEvent(new Event('popstate'));
  };

  const filtros: FiltrosFinanceiros | undefined = empresaId ? { empresaId } : undefined;
  const hoje = format(new Date(), 'yyyy-MM-dd');

  let indicadores: IndicadoresDashboard | null = null;
  let erroCalculo: string | null = null;
  try {
    indicadores = construirIndicadores(lancamentos, empresas, categorias, competencia, hoje, filtros);
  } catch (e) {
    erroCalculo = e instanceof Error ? e.message : 'Falha ao calcular os indicadores financeiros.';
  }

  if (erroCalculo || !indicadores) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <ShieldAlert size={20} />
            <div>
              <p className="font-semibold">Não foi possível calcular os indicadores do período</p>
              <p className="text-sm text-muted-foreground">{erroCalculo}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const {
    periodo,
    receitasRealizadas,
    despesasRealizadas,
    resultadoCaixaCentavos,
    margem,
    receitasPrevistas,
    despesasPrevistas,
    evolucao,
    evolucaoAnual,
    comparativoMesAnterior,
    comparativoAnoAnterior,
    rankingDespesas,
    inconsistencias,
    ultimos10,
    proxVencimentos,
    despesasComPct,
    totalLancamentosFiltrados,
  } = indicadores;

  const totalInconsistencias =
    inconsistencias.valoresInvalidos.length +
    inconsistencias.competenciasInvalidas.length +
    inconsistencias.realizadosSemDataPagamento.length;

  const rotuloPeriodo = `${fmtMesAno(competencia)} · Regime de caixa (realizado)`;

  return (
    <div className="space-y-6">
      {/* Filtro de empresa */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rotuloPeriodo}</p>
        <div className="w-64">
          <Select
            aria-label="Filtrar por empresa"
            options={empresaOptions}
            value={empresaId}
            onChange={(ev) => onEmpresaChange(ev.target.value)}
          />
        </div>
      </div>

      {totalLancamentosFiltrados === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Não foram encontrados lançamentos para os filtros selecionados.
          </p>
        </Card>
      )}

      {totalInconsistencias > 0 && (
        <Card>
          <div className="flex items-start gap-3 text-amber-700">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Inconsistências encontradas nos dados ({totalInconsistencias})</p>
              <ul className="list-disc list-inside text-xs text-amber-600 mt-1 space-y-0.5">
                {inconsistencias.valoresInvalidos.length > 0 && (
                  <li>{inconsistencias.valoresInvalidos.length} lançamento(s) com valor inválido</li>
                )}
                {inconsistencias.competenciasInvalidas.length > 0 && (
                  <li>{inconsistencias.competenciasInvalidas.length} lançamento(s) com competência inválida</li>
                )}
                {inconsistencias.realizadosSemDataPagamento.length > 0 && (
                  <li>
                    {inconsistencias.realizadosSemDataPagamento.length} lançamento(s) pago(s)/recebido(s) sem data de
                    pagamento
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* A. Resultado Realizado */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Resultado Realizado — Regime de Caixa</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Receitas Recebidas"
            value={receitasRealizadas.total}
            icon={<TrendingUp size={18} />}
            colorVariant="green"
          />
          <KpiCard
            title="Despesas Pagas"
            value={despesasRealizadas.total}
            icon={<TrendingDown size={18} />}
            colorVariant="red"
          />
          <KpiCard
            title="Resultado de Caixa"
            value={resultadoCaixaCentavos / 100}
            icon={<Scale size={18} />}
            colorVariant={resultadoCaixaCentavos >= 0 ? 'blue' : 'red'}
          />
          {margem.calculavel ? (
            <KpiCard
              title="Margem de Caixa"
              value={margem.percentual}
              format="percentual"
              icon={<Percent size={18} />}
              colorVariant={margem.percentual >= 0 ? 'blue' : 'red'}
            />
          ) : (
            <IndicadorIndisponivel
              title="Margem de Caixa"
              icon={<Percent size={18} />}
              motivo="Sem receitas realizadas no período (denominador zero)."
            />
          )}
        </div>
      </div>

      {/* B. Compromissos Financeiros */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Compromissos Financeiros — Previsão (vencimento)</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Contas a Receber"
            value={receitasPrevistas.total.total}
            icon={<Clock size={18} />}
            colorVariant="blue"
          />
          <KpiCard
            title="Contas a Pagar"
            value={despesasPrevistas.total.total}
            icon={<Clock size={18} />}
            colorVariant="amber"
          />
          <KpiCard
            title="Recebíveis Vencidos"
            value={receitasPrevistas.vencidasEmAberto.total}
            icon={<AlertTriangle size={18} />}
            colorVariant="red"
          />
          <KpiCard
            title="Obrigações Vencidas"
            value={despesasPrevistas.vencidasEmAberto.total}
            icon={<AlertTriangle size={18} />}
            colorVariant="red"
          />
        </div>
      </div>

      {/* C. Análise Resumida */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Evolução de Caixa (Realizado)" className="xl:col-span-2">
          <div className="pt-4">
            <EvolucaoCaixaChart dados={evolucao} />
          </div>
        </Card>
        <Card title="Despesas Pagas por Categoria" padding="sm">
          <div className="pt-4">
            {despesasComPct.length > 0 ? (
              <CategoriaDonut dados={despesasComPct} />
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Sem despesas pagas no período</p>
            )}
          </div>
        </Card>
      </div>

      {/* D. Comparações históricas e evolução anual (Microgate 06) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Evolução Anual de Caixa" className="xl:col-span-2">
          <div className="pt-4">
            <EvolucaoCaixaChart dados={evolucaoAnual} />
          </div>
        </Card>
        <Card padding="sm">
          <ComparativoPeriodoCard
            titulo="Comparação com o Mês Anterior"
            rotuloAtual={comparativoMesAnterior.rotuloAtual}
            rotuloAnterior={comparativoMesAnterior.rotuloAnterior}
            receitas={comparativoMesAnterior.receitas}
            despesas={comparativoMesAnterior.despesas}
            resultado={comparativoMesAnterior.resultado}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card padding="sm">
          <ComparativoPeriodoCard
            titulo="Comparação com o Mesmo Mês do Ano Anterior"
            rotuloAtual={comparativoAnoAnterior.rotuloAtual}
            rotuloAnterior={comparativoAnoAnterior.rotuloAnterior}
            receitas={comparativoAnoAnterior.receitas}
            despesas={comparativoAnoAnterior.despesas}
            resultado={comparativoAnoAnterior.resultado}
          />
        </Card>
        <Card title="Maiores pagamentos individuais" padding="sm">
          <div className="pt-2">
            <RankingDespesasList itens={rankingDespesas} />
          </div>
        </Card>
      </div>

      {/* E. Ranking de categorias de despesa (Microgate 06-B) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Ranking de Categorias — Despesas Pagas" padding="sm">
          <div className="pt-2">
            <CategoriaRankingList itens={despesasComPct} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Últimos Lançamentos" padding="sm">
          <div className="divide-y divide-slate-50">
            {ultimos10.length > 0 ? (
              ultimos10.map((l) => <LancamentoRow key={l.id} lancamento={l as Lancamento} />)
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Nenhum lançamento encontrado</p>
            )}
          </div>
        </Card>
        <Card title="Próximos Vencimentos" padding="sm">
          {proxVencimentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <AlertTriangle size={24} />
              <p className="text-sm">Nenhum vencimento pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {proxVencimentos.map((l) => (
                <LancamentoRow key={l.id} lancamento={l as Lancamento} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="text-[10px] text-slate-400">
        Período de caixa: {periodo.inicio} a {periodo.fim}. Previsão (a vencer/vencidos) calculada com referência em{' '}
        {hoje}.
      </p>
    </div>
  );
}
