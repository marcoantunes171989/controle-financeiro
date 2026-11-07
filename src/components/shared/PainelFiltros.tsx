import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { STATUS_LABEL, type FiltrosLancamentos } from "../../hooks/useFiltrosLancamentos";
import { opcoesPeriodo } from "../../utils/periodo";
import type { PeriodoOpcao } from "../../utils/periodo";

const ctrl =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted-foreground";

/** Painel único de filtros combinados e dinâmicos (Contas a Pagar, Contas a Receber, Relatórios). */
export default function PainelFiltros({ f, acoes }: { f: FiltrosLancamentos; acoes?: ReactNode }) {
  // No mobile o painel abre recolhido (exceto quando ja ha filtro ativo); no
  // desktop (md:) permanece sempre visivel, independente deste estado.
  const [open, setOpen] = useState(f.temFiltro);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="painel-filtros-conteudo"
        className="md:hidden flex w-full min-h-[44px] items-center justify-between gap-2 text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filtros
          {f.temFiltro && (
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Ativos</span>
          )}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <div id="painel-filtros-conteudo" className={cn("space-y-3", !open && "hidden md:block")}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className={ctrl} placeholder="Buscar..." value={f.busca} onChange={(e) => f.setBusca(e.target.value)} />
        <select className={ctrl} value={f.empresaFiltro} onChange={(e) => f.setEmpresaFiltro(e.target.value)}>
          <option value="">Todas as empresas</option>
          {f.opcoesEmpresa.map((e) => (
            <option key={e.id} value={e.id}>{e.nomeFantasia} ({f.contEmpresa.get(e.id) ?? 0})</option>
          ))}
        </select>
        <select className={ctrl} value={f.catFiltro} onChange={(e) => f.setCatFiltro(e.target.value)}>
          <option value="">Todas as categorias</option>
          {f.opcoesCategoria.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({f.contCategoria.get(c.id) ?? 0})</option>
          ))}
        </select>
        <select className={ctrl} value={f.statusFiltro} onChange={(e) => f.setStatusFiltro(e.target.value)}>
          <option value="">Todos os status ({f.totalSemStatus})</option>
          {f.opcoesStatus.map((st) => (
            <option key={st} value={st}>{STATUS_LABEL[st]} ({f.contStatus.get(st) ?? 0})</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground w-72 max-w-full">
          Período
          <select
            className={ctrl}
            value={f.periodo}
            disabled={f.intervaloAtivo}
            onChange={(e) => f.setPeriodo(e.target.value as PeriodoOpcao)}
          >
            {opcoesPeriodo(f.competencia).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <fieldset className="flex h-9 items-center gap-4 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
          <legend className="sr-only">Filtrar datas por</legend>
          {(["vencimento", "emissao"] as const).map((c) => (
            <label key={c} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="radio" name="campoData" className="h-4 w-4 accent-primary" checked={f.campoData === c} onChange={() => f.setCampoData(c)} />
              {c === "vencimento" ? "Vencimento" : "Emissão"}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          Data inicial
          <input type="date" className={ctrl} value={f.dataInicio} max={f.dataFim || undefined} onChange={(e) => f.setDataInicio(e.target.value)} />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          Data final
          <input type="date" className={ctrl} value={f.dataFim} min={f.dataInicio || undefined} onChange={(e) => f.setDataFim(e.target.value)} />
        </label>
        {f.temFiltro && (
          <Button size="sm" variant="outline" onClick={f.limpar}>Limpar filtros</Button>
        )}
        {acoes}
      </div>

      {f.intervaloInvalido && <p className="text-xs text-destructive">A data final deve ser igual ou posterior à inicial.</p>}
      {f.intervaloAtivo && <p className="text-xs text-muted-foreground">O intervalo de datas substitui o combo de período.</p>}

      {f.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {f.chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={c.remover}
              title="Remover filtro"
              className="inline-flex items-center gap-1 rounded-full border border-input bg-accent px-2.5 py-0.5 text-xs hover:bg-accent/70"
            >
              {c.label}
              <span aria-hidden className="text-muted-foreground">×</span>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
