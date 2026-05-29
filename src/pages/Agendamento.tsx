import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, parseISO, addMonths, subMonths,
  differenceInCalendarMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { fmtMoeda, fmtData } from "../utils/format";
import StatusBadge from "../components/shared/StatusBadge";
import type { Lancamento } from "../types";

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

const INTERVALO: Record<string, number> = {
  mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
};

type EnrichedLancamento = Lancamento & {
  empresa?: { nomeFantasia: string };
  categoria?: { nome: string; cor: string };
  isProjection?: boolean;
  isDueMonth?: boolean; // true when payment is actually due this month
};

/**
 * Returns only the latest (most recent dataVencimento) fixo entry per unique series.
 * Used to project only from the last generated real entry, avoiding duplicate projections.
 */
function latestFixoPerGroup(lancamentos: EnrichedLancamento[]): EnrichedLancamento[] {
  const map: Record<string, EnrichedLancamento> = {};
  for (const l of lancamentos) {
    if (l.tipoRecorrencia !== "fixo" || l.isProjection) continue;
    const key = `${l.tipo}_${l.empresaId}_${l.categoriaId}_${l.descricao}`;
    if (!map[key] || l.dataVencimento > map[key].dataVencimento) map[key] = l;
  }
  return Object.values(map);
}

/**
 * Projects fixo transactions into `mesAlvo` — only from the LATEST real entry per series.
 * This avoids duplicate projections when multiple real entries exist for the same series.
 */
function projetarFixos(lancamentos: EnrichedLancamento[], mesAlvo: Date): EnrichedLancamento[] {
  const comp = format(mesAlvo, "yyyy-MM");
  const alvoMes = startOfMonth(mesAlvo);
  const projections: EnrichedLancamento[] = [];

  for (const l of latestFixoPerGroup(lancamentos)) {

    // Fallbacks: use day from original date if diaVencimento not set; default to mensal
    const dia = l.diaVencimento ?? parseISO(l.dataVencimento).getDate();
    const recorrencia = l.recorrencia ?? "mensal";
    const intervalo = INTERVALO[recorrencia] ?? 1;

    const origemMes = startOfMonth(parseISO(l.dataVencimento));
    const diff = differenceInCalendarMonths(alvoMes, origemMes);

    // Do not project before or on the origin month (real entry already there)
    if (diff <= 0) continue;

    // Skip if a real entry already exists for this month (user manually created it)
    const jaExiste = lancamentos.some(
      (r) =>
        !r.isProjection &&
        r.id !== l.id &&
        r.empresaId === l.empresaId &&
        r.categoriaId === l.categoriaId &&
        r.descricao === l.descricao &&
        r.competencia === comp
    );
    if (jaExiste) continue;

    const diaStr = String(dia).padStart(2, "0");
    const dataVenc = `${comp}-${diaStr}`;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencDate = parseISO(dataVenc);
    const isDueMonth = diff % intervalo === 0;

    projections.push({
      ...l,
      id: `${l.id}_proj_${comp}`,
      dataVencimento: dataVenc,
      competencia: comp,
      dataPagamento: undefined,
      status: isDueMonth ? (vencDate < hoje ? "vencido" : "pendente") : "pendente",
      isProjection: true,
      isDueMonth,
    });
  }
  return projections;
}

/** Next actual payment date for a fixo transaction from a given reference date */
function proximaOcorrenciaFixo(l: EnrichedLancamento, apartirDe: Date): string {
  const dia = l.diaVencimento ?? parseISO(l.dataVencimento).getDate();
  const recorrencia = l.recorrencia ?? "mensal";
  const intervalo = INTERVALO[recorrencia] ?? 1;
  let candidatoMes = startOfMonth(parseISO(l.dataVencimento));

  while (true) {
    const candidato = new Date(candidatoMes.getFullYear(), candidatoMes.getMonth(), dia);
    if (candidato >= apartirDe) return format(candidato, "yyyy-MM-dd");
    candidatoMes = addMonths(candidatoMes, intervalo);
  }
}

export default function Agendamento() {
  const { competencia, setCompetencia } = useOutletContext<OutletCtx>();
  const [anoStr, mesStr] = competencia.split("-");
  const mesAtual = new Date(parseInt(anoStr), parseInt(mesStr) - 1, 1);
  const setMesAtual = (date: Date) => setCompetencia(format(date, "yyyy-MM"));
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);

  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();

  const enriched: EnrichedLancamento[] = lancamentos.map((l) => ({
    ...l,
    empresa: empresas.find((e) => e.id === l.empresaId),
    categoria: categorias.find((c) => c.id === l.categoriaId),
  }));

  const projecoes = projetarFixos(enriched, mesAtual);
  const tudo = [...enriched, ...projecoes];

  const inicio = startOfMonth(mesAtual);
  const fim = endOfMonth(mesAtual);
  const dias = eachDayOfInterval({ start: inicio, end: fim });
  const comp = format(mesAtual, "yyyy-MM");

  const getLancamentosDodia = (dia: Date) =>
    tudo.filter((l) => isSameDay(parseISO(l.dataVencimento), dia));

  // Resumo: real entries + only DUE-month projections
  const doMes = [
    ...enriched.filter((l) => l.competencia === comp),
    ...projecoes.filter((l) => l.isDueMonth),
  ];
  const receber = doMes.filter((l) => l.tipo === "credito").reduce((a, l) => a + l.valor, 0);
  const pagar   = doMes.filter((l) => l.tipo === "debito").reduce((a, l) => a + l.valor, 0);
  const saldo   = receber - pagar;

  // Deduplicar contas fixas: exibe uma entrada por série (a mais antiga = original)
  const contasFixasMap: Record<string, EnrichedLancamento> = {};
  for (const l of enriched.filter((l) => l.tipoRecorrencia === "fixo")) {
    const key = `${l.tipo}_${l.empresaId}_${l.categoriaId}_${l.descricao}`;
    if (!contasFixasMap[key] || l.dataVencimento < contasFixasMap[key].dataVencimento) {
      contasFixasMap[key] = l;
    }
  }
  const contasFixas = Object.values(contasFixasMap);

  // All panel calculations are relative to the VIEWED month, not today
  const refMes = inicio;

  // Próximos vencimentos: entradas reais pendentes/vencidas a partir do mês visualizado
  const proximasBase: EnrichedLancamento[] = enriched
    .filter(
      (l) =>
        (l.status === "pendente" || l.status === "vencido") &&
        parseISO(l.dataVencimento) >= refMes
    )
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 10);

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const offset = inicio.getDay();
  const lancamentosDiaSelecionado = diaSelecionado ? getLancamentosDodia(diaSelecionado) : [];

  const recorrenciaLabel: Record<string, string> = {
    mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral",
    semestral: "Semestral", anual: "Anual",
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendario */}
      <div className="xl:col-span-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMesAtual(subMonths(mesAtual, 1))} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold capitalize">
              {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button onClick={() => setMesAtual(addMonths(mesAtual, 1))} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {diasSemana.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
            {dias.map((dia) => {
              const lancsDia = getLancamentosDodia(dia);
              const temCreditoReal   = lancsDia.some((l) => l.tipo === "credito" && !l.isProjection);
              const temDebitoReal    = lancsDia.some((l) => l.tipo === "debito"  && !l.isProjection);
              const temCreditoProj   = lancsDia.some((l) => l.tipo === "credito" && l.isProjection && l.isDueMonth);
              const temDebitoProj    = lancsDia.some((l) => l.tipo === "debito"  && l.isProjection && l.isDueMonth);
              const temDebitoRef     = lancsDia.some((l) => l.tipo === "debito"  && l.isProjection && !l.isDueMonth);
              const temCreditoRef    = lancsDia.some((l) => l.tipo === "credito" && l.isProjection && !l.isDueMonth);
              const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado);

              return (
                <button
                  key={dia.toISOString()}
                  onClick={() => setDiaSelecionado(selecionado ? null : dia)}
                  className={cn(
                    "relative p-1.5 rounded-lg text-xs transition-colors min-h-[48px] text-left",
                    isToday(dia) && "border-2 border-primary",
                    selecionado ? "bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <span className={cn("font-medium", isToday(dia) ? "text-primary" : "text-foreground")}>
                    {format(dia, "d")}
                  </span>
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {/* Real entries */}
                    {temCreditoReal && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {temDebitoReal  && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                    {/* Due-month projections */}
                    {!temCreditoReal && temCreditoProj && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 border border-emerald-500" />}
                    {!temDebitoReal  && temDebitoProj  && <span className="w-1.5 h-1.5 rounded-full bg-red-300 border border-destructive" />}
                    {/* Reference projections (not due this month) */}
                    {!temCreditoReal && !temCreditoProj && temCreditoRef && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />}
                    {!temDebitoReal  && !temDebitoProj  && temDebitoRef  && <span className="w-1.5 h-1.5 rounded-full bg-red-100 border border-red-300" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Vencimento real</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 border border-destructive inline-block" /> Vencimento projetado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-100 border border-red-300 inline-block" /> Conta fixa (referência)</span>
          </div>

          {diaSelecionado && lancamentosDiaSelecionado.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                {format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="space-y-2">
                {lancamentosDiaSelecionado.map((l) => (
                  <div
                    key={l.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      l.isProjection && !l.isDueMonth
                        ? "bg-muted/30 border border-dashed border-border opacity-70"
                        : l.isProjection
                        ? "bg-muted/60 border border-dashed border-border"
                        : "bg-muted"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">{l.descricao}</p>
                        {l.isProjection && <Repeat size={10} className="text-muted-foreground" />}
                        {l.isProjection && !l.isDueMonth && (
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">ref.</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{l.empresa?.nomeFantasia}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xs font-semibold", l.tipo === "credito" ? "text-emerald-600" : "text-destructive")}>
                        {fmtMoeda(l.valor)}
                      </p>
                      {(!l.isProjection || l.isDueMonth) && <StatusBadge status={l.status} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral */}
      <div className="space-y-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumo do Mes</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">A receber</span>
              <span className="font-semibold text-emerald-600">{fmtMoeda(receber)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">A pagar</span>
              <span className="font-semibold text-destructive">{fmtMoeda(pagar)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-medium">Saldo</span>
              <span className={`font-bold ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmtMoeda(saldo)}</span>
            </div>
          </div>
        </div>

        {contasFixas.length > 0 && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contas Fixas</h3>
            <div className="space-y-2.5">
              {contasFixas.slice(0, 6).map((l) => {
                const proxData = proximaOcorrenciaFixo(l, refMes);
                const isDueThisMonth =
                  enriched.some(
                    (r) =>
                      r.tipoRecorrencia === "fixo" &&
                      r.empresaId === l.empresaId &&
                      r.categoriaId === l.categoriaId &&
                      r.descricao === l.descricao &&
                      r.competencia === comp
                  ) ||
                  projecoes.some((p) => p.id === `${l.id}_proj_${comp}` && p.isDueMonth);
                return (
                  <div key={l.id} className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Repeat size={12} className={cn("shrink-0", isDueThisMonth ? "text-destructive" : "text-muted-foreground")} />
                      <span className="flex-1 truncate">{l.descricao}</span>
                      <span className={cn("font-medium", l.tipo === "credito" ? "text-emerald-600" : "text-destructive")}>
                        {fmtMoeda(l.valor)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-5">
                      {recorrenciaLabel[l.recorrencia ?? ""] ?? "—"} · próx. {fmtData(proxData)} · dia {l.diaVencimento ?? parseISO(l.dataVencimento).getDate()}
                      {isDueThisMonth && <span className="ml-1 text-destructive font-medium">· vence este mês</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proximos Vencimentos</h3>
          <div className="space-y-2">
            {proximasBase.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum vencimento pendente.</p>
            ) : (
              proximasBase.map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", l.tipo === "credito" ? "bg-emerald-400" : "bg-destructive")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium truncate">{l.descricao}</p>
                      {l.isProjection && <Repeat size={9} className="text-muted-foreground shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtData(l.dataVencimento)}</p>
                  </div>
                  <span className={cn("text-xs font-semibold shrink-0", l.tipo === "credito" ? "text-emerald-600" : "text-destructive")}>
                    {fmtMoeda(l.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
