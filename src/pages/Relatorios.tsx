// Análise Gerencial (Microgate 07).
//
// Esta página consome exclusivamente o núcleo financeiro compartilhado
// (src/services/financeiro) — nenhum cálculo monetário é duplicado ou
// implementado em paralelo aqui. Separa claramente três regimes, que nunca
// são somados entre si:
//   - CAIXA (realizado): calcularReceitasRealizadas/calcularDespesasRealizadas,
//     baseado em dataPagamento.
//   - PREVISÃO (vencimento): calcularReceitasPrevistas/calcularDespesasPrevistas,
//     baseado em dataVencimento vs. a data de referência (hoje). Não é saldo
//     bancário projetado — não há saldo inicial confiável neste contrato.
//   - COMPETÊNCIA OPERACIONAL: calcularReceitasPorCompetencia/
//     calcularDespesasPorCompetencia, baseado no campo `competencia`.
//
// Substituição do DRE Simplificado (Seção 07 do microgate): a versão
// anterior desta página classificava despesas como "Operacionais",
// "Pessoal" ou "Impostos" comparando o NOME da categoria com uma lista fixa
// de strings (heurística de texto, sem base contábil estruturada nem
// reconciliação garantida). Isso foi removido. Em seu lugar, a seção E
// ("Competência Operacional") apresenta receitas, despesas e resultado
// operacional pela competência informada no lançamento — sem usar os termos
// lucro bruto, EBITDA, lucro operacional ou lucro líquido, pois o modelo de
// dados atual não sustenta essas afirmações contábeis.
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { format, endOfMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Download,
  Layers,
} from "lucide-react";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import KpiCard from "../components/shared/KpiCard";
import EvolucaoCaixaChart, { type PontoEvolucaoCaixa } from "../components/dashboard/EvolucaoCaixaChart";
import ComparativoPeriodoCard, { type ComparativoValor } from "../components/dashboard/ComparativoPeriodoCard";
import CategoriaRankingList, { type ItemRankingCategoria } from "../components/dashboard/CategoriaRankingList";
import { Card } from "../components/ui/Card";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import Table from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import type { Lancamento, Empresa, Categoria } from "../types";
import { fmtMoeda, fmtData, fmtMesAno } from "../utils/format";
import { TYPOGRAPHY } from "../styles/typography";
import {
  aplicarFiltros,
  calcularReceitasRealizadas,
  calcularDespesasRealizadas,
  calcularMargemFinanceira,
  calcularReceitasPrevistas,
  calcularDespesasPrevistas,
  calcularDespesasCategoria,
  calcularReceitasPorCompetencia,
  calcularDespesasPorCompetencia,
  calcularResultadoPorCompetencia,
  calcularVariacaoPercentual,
  gerarRelatorioInconsistencias,
  type FiltrosFinanceiros,
  type Periodo,
} from "../services/financeiro";

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

function periodoDoMes(competencia: string): Periodo {
  const [ano, mes] = competencia.split("-").map(Number);
  const inicioDate = new Date(ano, mes - 1, 1);
  return {
    inicio: format(inicioDate, "yyyy-MM-dd"),
    fim: format(endOfMonth(inicioDate), "yyyy-MM-dd"),
  };
}

function competenciaDeslocada(competencia: string, deltaMeses: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(ano, mes - 1 + deltaMeses, 1);
  return format(d, "yyyy-MM");
}

function competenciasAnteriores(competencia: string, quantidade: number): string[] {
  const resultado: string[] = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    resultado.push(competenciaDeslocada(competencia, -i));
  }
  return resultado;
}

function construirSerieEvolucaoCaixa(
  lancamentos: Lancamento[],
  competencias: string[],
  filtros: FiltrosFinanceiros | undefined,
): PontoEvolucaoCaixa[] {
  return competencias.map((comp) => {
    const periodoMes = periodoDoMes(comp);
    const receitas = calcularReceitasRealizadas(lancamentos, periodoMes, filtros);
    const despesas = calcularDespesasRealizadas(lancamentos, periodoMes, filtros);
    const [ano, mes] = comp.split("-").map(Number);
    return {
      mes: comp,
      mesAbrev: format(new Date(ano, mes - 1, 1), "MMM"),
      receitas: receitas.total,
      despesas: despesas.total,
      resultado: receitas.total - despesas.total,
    };
  });
}

function compararCentavos(atualCentavos: number, anteriorCentavos: number): ComparativoValor {
  const mudancaSinal =
    (anteriorCentavos < 0 && atualCentavos > 0) || (anteriorCentavos > 0 && atualCentavos < 0);
  return {
    atual: atualCentavos / 100,
    anterior: anteriorCentavos / 100,
    diferenca: (atualCentavos - anteriorCentavos) / 100,
    percentual: calcularVariacaoPercentual(anteriorCentavos, atualCentavos),
    mudancaSinal,
  };
}

interface ComparativoPeriodo {
  rotuloAtual: string;
  rotuloAnterior: string;
  receitas: ComparativoValor;
  despesas: ComparativoValor;
  resultado: ComparativoValor;
}

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

function despesasCategoriaParaRanking(
  despesasCategoria: ReturnType<typeof calcularDespesasCategoria>,
  categorias: Categoria[],
): ItemRankingCategoria[] {
  const totalCentavos = despesasCategoria.total.totalCentavos;
  return despesasCategoria.porCategoria
    .map(({ categoriaId, resultado }) => {
      const categoria = categorias.find((c) => c.id === categoriaId);
      return {
        categoriaId,
        nome: categoria?.nome ?? "Sem categoria",
        valor: resultado.total,
        cor: categoria?.cor ?? "#94a3b8",
        percentual: totalCentavos === 0 ? 0 : (resultado.totalCentavos / totalCentavos) * 100,
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

function enrich(lancamentos: Lancamento[], empresas: Empresa[], categorias: Categoria[]) {
  return lancamentos.map((l) => ({
    ...l,
    empresa: empresas.find((e) => e.id === l.empresaId),
    categoria: categorias.find((c) => c.id === l.categoriaId),
  }));
}

/**
 * Previne injeção de fórmulas em planilhas (Seção 11, corrigido no
 * Microgate 08-B — achado F01): uma célula cujo conteúdo comece, mesmo após
 * espaços ou caracteres de controle (tab, CR, LF, VT, FF, espaços Unicode
 * como NBSP/EM SPACE/IDEOGRAPHIC SPACE), com =, +, - ou @ seria interpretada
 * como fórmula por Excel/Sheets ao abrir o CSV. `\s` no motor de regex do
 * JavaScript já cobre todos esses espaços/controles (inclusive BOM), então
 * basta tolerá-los antes do prefixo de fórmula. Prefixar com aspas simples
 * neutraliza isso sem remover nenhum caractere do conteúdo original (nunca
 * fazemos trim destrutivo) e sem depender do escape de aspas do CSV, que
 * não impede a interpretação como fórmula.
 */
function sanitizarFormulaCSV(valor: string): string {
  return /^\s*[=+\-@]/.test(valor) ? `'${valor}` : valor;
}

/**
 * Campos numéricos legítimos (ex.: Valor, que pode ser negativo e começar
 * com "-") não passam pela sanitização de fórmula: o conteúdo é gerado
 * internamente (toFixed), não é texto livre do usuário, e prefixá-lo
 * corromperia um número negativo real. Apenas campos de texto não confiável
 * (digitados pelo usuário) são sanitizados.
 */
function celulaCSV(valor: string, tipo: "texto" | "numerico" = "texto"): string {
  const sanitizado = tipo === "texto" ? sanitizarFormulaCSV(valor) : valor;
  return /[",\n\r]/.test(sanitizado) ? `"${sanitizado.replace(/"/g, '""')}"` : sanitizado;
}

/** Cartão de indicador que não pôde ser calculado com confiança. Nunca exibe zero no lugar. */
function IndicadorIndisponivel({ title, icon, motivo }: { title: string; icon: React.ReactNode; motivo: string }) {
  return (
    <div className="rounded-xl border border-l-4 border-slate-300 bg-slate-50 p-5 flex items-start gap-4">
      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={TYPOGRAPHY.label}>{title}</p>
        <p className="text-lg font-semibold text-slate-500 mt-1">Indisponível</p>
        <p className="text-xs text-slate-400 mt-1">{motivo}</p>
      </div>
    </div>
  );
}

export default function Relatorios() {
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

  const [categoriaId, setCategoriaId] = useState("");

  const carregando = carregandoLancamentos || carregandoEmpresas || carregandoCategorias;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const fontesComErro: { nome: string; detalhe: unknown; refetch: () => void }[] = [];
  if (erroLancamentos) fontesComErro.push({ nome: "lançamentos", detalhe: erroLancamentosDetalhe, refetch: refetchLancamentos });
  if (erroEmpresas) fontesComErro.push({ nome: "empresas", detalhe: erroEmpresasDetalhe, refetch: refetchEmpresas });
  if (erroCategorias) fontesComErro.push({ nome: "categorias", detalhe: erroCategoriasDetalhe, refetch: refetchCategorias });

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
    { value: "", label: "Todas as empresas (consolidado)" },
    ...empresas.map((e) => ({ value: e.id, label: e.nomeFantasia })),
  ];
  const categoriaOptions = [
    { value: "", label: "Todas as categorias" },
    ...categorias.map((c) => ({ value: c.id, label: c.nome })),
  ];

  // Empresa via querystring, pela mesma convenção do Dashboard Executivo
  // (Seção 08): não introduz estado global novo e mantém compatibilidade.
  const params = new URLSearchParams(window.location.search);
  const empresaId = params.get("empresaId") ?? "";
  const onEmpresaChange = (novoId: string) => {
    const novosParams = new URLSearchParams(window.location.search);
    if (novoId) novosParams.set("empresaId", novoId);
    else novosParams.delete("empresaId");
    const query = novosParams.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    window.dispatchEvent(new Event("popstate"));
  };

  const filtros: FiltrosFinanceiros | undefined =
    empresaId || categoriaId ? { empresaId: empresaId || undefined, categoriaId: categoriaId || undefined } : undefined;

  const hoje = format(new Date(), "yyyy-MM-dd");

  let erroCalculo: string | null = null;
  let periodo: Periodo;
  let receitasRealizadas: ReturnType<typeof calcularReceitasRealizadas>;
  let despesasRealizadas: ReturnType<typeof calcularDespesasRealizadas>;
  let margem: ReturnType<typeof calcularMargemFinanceira>;
  let receitasPrevistas: ReturnType<typeof calcularReceitasPrevistas>;
  let despesasPrevistas: ReturnType<typeof calcularDespesasPrevistas>;
  let despesasCategoria: ReturnType<typeof calcularDespesasCategoria>;
  let receitasCompetencia: ReturnType<typeof calcularReceitasPorCompetencia>;
  let despesasCompetencia: ReturnType<typeof calcularDespesasPorCompetencia>;
  let resultadoCompetencia: ReturnType<typeof calcularResultadoPorCompetencia>;
  let evolucaoMensal: PontoEvolucaoCaixa[];
  let evolucaoAnual: PontoEvolucaoCaixa[];
  let comparativoMesAnterior: ComparativoPeriodo;
  let comparativoAnoAnterior: ComparativoPeriodo;
  let rankingCategorias: ItemRankingCategoria[];
  let inconsistencias: ReturnType<typeof gerarRelatorioInconsistencias>;
  let filtrados: (Lancamento & { empresa?: Empresa; categoria?: Categoria })[];

  try {
    periodo = periodoDoMes(competencia);
    receitasRealizadas = calcularReceitasRealizadas(lancamentos, periodo, filtros);
    despesasRealizadas = calcularDespesasRealizadas(lancamentos, periodo, filtros);
    margem = calcularMargemFinanceira(lancamentos, periodo, filtros);

    receitasPrevistas = calcularReceitasPrevistas(lancamentos, hoje, filtros);
    despesasPrevistas = calcularDespesasPrevistas(lancamentos, hoje, filtros);

    despesasCategoria = calcularDespesasCategoria(lancamentos, periodo, filtros);
    rankingCategorias = despesasCategoriaParaRanking(despesasCategoria, categorias);

    receitasCompetencia = calcularReceitasPorCompetencia(lancamentos, competencia, filtros);
    despesasCompetencia = calcularDespesasPorCompetencia(lancamentos, competencia, filtros);
    resultadoCompetencia = calcularResultadoPorCompetencia(lancamentos, competencia, filtros);

    evolucaoMensal = construirSerieEvolucaoCaixa(lancamentos, competenciasAnteriores(competencia, 6), filtros);
    evolucaoAnual = construirSerieEvolucaoCaixa(lancamentos, competenciasAnteriores(competencia, 12), filtros);

    comparativoMesAnterior = construirComparativoPeriodo(lancamentos, competencia, competenciaDeslocada(competencia, -1), filtros);
    comparativoAnoAnterior = construirComparativoPeriodo(lancamentos, competencia, competenciaDeslocada(competencia, -12), filtros);

    const base = aplicarFiltros(lancamentos, filtros);
    inconsistencias = gerarRelatorioInconsistencias(base);
    filtrados = enrich(base, empresas, categorias);
  } catch (e) {
    erroCalculo = e instanceof Error ? e.message : "Falha ao calcular os indicadores financeiros.";
  }

  if (erroCalculo) {
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

  const resultadoCaixaCentavos = receitasRealizadas!.totalCentavos - despesasRealizadas!.totalCentavos;
  const totalInconsistencias =
    inconsistencias!.valoresInvalidos.length +
    inconsistencias!.competenciasInvalidas.length +
    inconsistencias!.realizadosSemDataPagamento.length;

  type Row = (typeof filtrados)[0];
  const columns = [
    { key: "descricao", header: "Descrição", sortable: true, render: (l: Row) => <span className="text-xs">{l.descricao}</span> },
    { key: "empresa", header: "Empresa", sortable: true, sortValue: (l: Row) => l.empresa?.nomeFantasia ?? "", render: (l: Row) => <span className="text-xs">{l.empresa?.nomeFantasia}</span> },
    { key: "categoria", header: "Categoria", sortable: true, sortValue: (l: Row) => l.categoria?.nome ?? "", render: (l: Row) => <span className="text-xs">{l.categoria?.nome ?? "Sem categoria"}</span> },
    { key: "tipo", header: "Tipo", sortable: true, render: (l: Row) => (
      <span className={`text-xs font-medium ${l.tipo === "credito" ? "text-emerald-600" : "text-destructive"}`}>
        {l.tipo === "credito" ? "Receita" : "Despesa"}
      </span>
    )},
    { key: "valor", header: "Valor", align: "right" as const, sortable: true, render: (l: Row) => <span className="text-xs font-medium">{fmtMoeda(l.valor)}</span> },
    { key: "dataVencimento", header: "Vencimento", sortable: true, render: (l: Row) => <span className="text-xs">{fmtData(l.dataVencimento)}</span> },
    { key: "status", header: "Status", sortable: true, render: (l: Row) => <span className="text-xs">{l.status}</span> },
  ];

  // Contrato de exportação (Seção 11): mesmas colunas, ordem, encoding
  // (UTF-8 com BOM) e nome de arquivo da versão anterior. O CSV reflete os
  // filtros de empresa/categoria atualmente selecionados (não o período de
  // competência do AppLayout, que não restringe esta listagem). Corrigido
  // nesta versão: aspas/escapes CSV corretos por campo (RFC 4180) em vez de
  // substituir vírgulas por ponto-e-vírgula na descrição (defeito corrigido —
  // Seção 11), e proteção contra injeção de fórmulas.
  const exportarCSV = () => {
    const headers = ["ID", "Tipo", "Descricao", "Empresa", "Categoria", "Valor", "Vencimento", "Status"];
    const rows = filtrados.map((l) => [
      celulaCSV(l.id),
      celulaCSV(l.tipo),
      celulaCSV(l.descricao),
      celulaCSV(l.empresa?.nomeFantasia ?? ""),
      celulaCSV(l.categoria?.nome ?? ""),
      celulaCSV(l.valor.toFixed(2), "numerico"),
      celulaCSV(l.dataVencimento),
      celulaCSV(l.status),
    ]);
    const csv = [headers.map((h) => celulaCSV(h)), ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lancamentos_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full sm:w-56";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Análise Gerencial</h1>
        <p className="text-xs text-muted-foreground">{fmtMesAno(competencia)} · Caixa, previsão e competência apresentados separadamente</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className={inputClass}>
          <Select
            label="Empresa"
            aria-label="Filtrar por empresa"
            options={empresaOptions}
            value={empresaId}
            onChange={(e) => onEmpresaChange(e.target.value)}
          />
        </div>
        <div className={inputClass}>
          <Select
            label="Categoria"
            aria-label="Filtrar por categoria"
            options={categoriaOptions}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={exportarCSV} className="ml-auto">
          <Download size={14} />
          Exportar CSV
        </Button>
      </div>

      {totalInconsistencias! > 0 && (
        <Card>
          <div className="flex items-start gap-3 text-amber-700">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Inconsistências encontradas nos dados ({totalInconsistencias})</p>
              <ul className="list-disc list-inside text-xs text-amber-600 mt-1 space-y-0.5">
                {inconsistencias!.valoresInvalidos.length > 0 && (
                  <li>{inconsistencias!.valoresInvalidos.length} lançamento(s) com valor inválido</li>
                )}
                {inconsistencias!.competenciasInvalidas.length > 0 && (
                  <li>{inconsistencias!.competenciasInvalidas.length} lançamento(s) com competência inválida</li>
                )}
                {inconsistencias!.realizadosSemDataPagamento.length > 0 && (
                  <li>{inconsistencias!.realizadosSemDataPagamento.length} lançamento(s) pago(s)/recebido(s) sem data de pagamento</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* A. Visão Geral — regime de caixa (realizado) */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Visão Geral — Regime de Caixa (Realizado)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Receitas Realizadas" value={receitasRealizadas!.total} icon={<TrendingUp size={18} />} colorVariant="green" />
          <KpiCard title="Despesas Realizadas" value={despesasRealizadas!.total} icon={<TrendingDown size={18} />} colorVariant="red" />
          <KpiCard
            title="Resultado de Caixa"
            value={resultadoCaixaCentavos / 100}
            icon={<Scale size={18} />}
            colorVariant={resultadoCaixaCentavos >= 0 ? "blue" : "red"}
          />
          {margem!.calculavel ? (
            <KpiCard title="Margem de Caixa" value={margem!.percentual} format="percentual" icon={<Percent size={18} />} colorVariant={margem!.percentual >= 0 ? "blue" : "red"} />
          ) : (
            <IndicadorIndisponivel title="Margem de Caixa" icon={<Percent size={18} />} motivo="Sem receitas realizadas no período (denominador zero)." />
          )}
        </div>
      </div>

      {/* B. Compromissos Financeiros — previsão (vencimento) */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Compromissos Financeiros — Previsão (Vencimento)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Contas a Receber" value={receitasPrevistas!.total.total} icon={<Clock size={18} />} colorVariant="blue" />
          <KpiCard title="Contas a Pagar" value={despesasPrevistas!.total.total} icon={<Clock size={18} />} colorVariant="amber" />
          <KpiCard title="Recebíveis Vencidos" value={receitasPrevistas!.vencidasEmAberto.total} icon={<AlertTriangle size={18} />} colorVariant="red" />
          <KpiCard title="Obrigações Vencidas" value={despesasPrevistas!.vencidasEmAberto.total} icon={<AlertTriangle size={18} />} colorVariant="red" />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Previsão calculada por data de vencimento em relação a hoje ({fmtData(hoje)}). Não representa saldo bancário projetado.
        </p>
      </div>

      {/* C. Evolução Financeira */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Evolução Mensal de Caixa (6 meses)" className="xl:col-span-2">
          <div className="pt-4">
            <EvolucaoCaixaChart dados={evolucaoMensal!} />
          </div>
        </Card>
        <Card padding="sm">
          <ComparativoPeriodoCard
            titulo="Mês Selecionado vs. Mês Anterior"
            rotuloAtual={comparativoMesAnterior!.rotuloAtual}
            rotuloAnterior={comparativoMesAnterior!.rotuloAnterior}
            receitas={comparativoMesAnterior!.receitas}
            despesas={comparativoMesAnterior!.despesas}
            resultado={comparativoMesAnterior!.resultado}
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Evolução Anual de Caixa (12 meses)" className="xl:col-span-2">
          <div className="pt-4">
            <EvolucaoCaixaChart dados={evolucaoAnual!} />
          </div>
        </Card>
        <Card padding="sm">
          <ComparativoPeriodoCard
            titulo="Mês Selecionado vs. Mesmo Mês do Ano Anterior"
            rotuloAtual={comparativoAnoAnterior!.rotuloAtual}
            rotuloAnterior={comparativoAnoAnterior!.rotuloAnterior}
            receitas={comparativoAnoAnterior!.receitas}
            despesas={comparativoAnoAnterior!.despesas}
            resultado={comparativoAnoAnterior!.resultado}
          />
        </Card>
      </div>

      {/* D. Análise de Despesas — ranking completo por categoria */}
      <Card title="Análise de Despesas — Ranking Completo de Categorias (Caixa Realizado)" padding="sm">
        <div className="pt-2">
          {rankingCategorias!.length > 0 ? (
            <>
              <CategoriaRankingList itens={rankingCategorias!} limite={rankingCategorias!.length} />
              <p className="text-[11px] text-slate-400 mt-3 px-1">
                Total reconciliado: {fmtMoeda(despesasCategoria!.total.total)} (idêntico a Despesas Realizadas acima).
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">Sem despesas pagas no período</p>
          )}
        </div>
      </Card>

      {/* E. Competência Operacional */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
        <div className="flex items-start gap-2 mb-3">
          <Layers size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Competência Operacional</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Regime de competência operacional: agrega lançamentos não cancelados pelo campo <code>competencia</code>{" "}
              do lançamento (não pela data de pagamento ou vencimento). Esta seção substitui o antigo "DRE Simplificado",
              que classificava despesas comparando o nome da categoria com uma lista fixa de termos — sem base contábil
              estruturada. Os valores abaixo não constituem lucro bruto, EBITDA, lucro operacional ou lucro líquido.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receitas por Competência</p>
            <p className="text-xl font-semibold text-emerald-600 mt-1">{fmtMoeda(receitasCompetencia!.total)}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Despesas por Competência</p>
            <p className="text-xl font-semibold text-destructive mt-1">{fmtMoeda(despesasCompetencia!.total)}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado Operacional por Competência</p>
            <p className={`text-xl font-semibold mt-1 ${resultadoCompetencia!.resultado >= 0 ? "text-blue-600" : "text-destructive"}`}>
              {fmtMoeda(resultadoCompetencia!.resultado)}
            </p>
          </div>
        </div>
        {(receitasCompetencia!.competenciasInvalidas.length > 0 || despesasCompetencia!.competenciasInvalidas.length > 0) && (
          <p className="text-[11px] text-amber-600 mt-3">
            {receitasCompetencia!.competenciasInvalidas.length + despesasCompetencia!.competenciasInvalidas.length} lançamento(s)
            com competência em formato inválido foram excluídos deste regime e aparecem no alerta de inconsistências.
          </p>
        )}
      </div>

      {/* F. Detalhamento e Exportação */}
      <Card title={`Detalhamento dos Lançamentos (${filtrados!.length})`} padding="sm">
        <p className="text-xs text-muted-foreground px-1 pb-3">
          Filtros aplicados: {empresaOptions.find((o) => o.value === empresaId)?.label ?? "Todas as empresas"}
          {" · "}
          {categoriaOptions.find((o) => o.value === categoriaId)?.label ?? "Todas as categorias"}
        </p>
        <Table columns={columns} data={filtrados! as (Row & { id: string })[]} defaultSortKey="dataVencimento" />
      </Card>
    </div>
  );
}
