import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { fmtMoeda, fmtData } from "../utils/format";
import { calcularPercentual, calcFluxoMensal } from "../utils/calculos";
import FluxoBarChart from "../components/shared/FluxoBarChart";
import KpiCard from "../components/shared/KpiCard";
import Table from "../components/ui/Table";
import PainelFiltros from "../components/shared/PainelFiltros";
import { useFiltrosLancamentos } from "../hooks/useFiltrosLancamentos";
import { Button } from "../components/ui/Button";
import { TrendingUp, TrendingDown, Scale, Percent, Download } from "lucide-react";

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

export default function Relatorios() {
  const { competencia } = useOutletContext<OutletCtx>();
  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();

  const fluxo = calcFluxoMensal(lancamentos, new Date().getFullYear());

  const f = useFiltrosLancamentos({ lancamentos, empresas, categorias, competencia });
  const filtrados = f.itens;

  const receitas = filtrados.filter((l) => l.tipo === "credito").reduce((a, l) => a + l.valor, 0);
  const despesas = filtrados.filter((l) => l.tipo === "debito").reduce((a, l) => a + l.valor, 0);
  const lucro = receitas - despesas;
  const margem = calcularPercentual(lucro, receitas);

  const ranking = categorias
    .map((c) => {
      const valor = filtrados.filter((l) => l.categoriaId === c.id).reduce((a, l) => a + l.valor, 0);
      return { ...c, valor };
    })
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const maxRanking = ranking[0]?.valor ?? 1;

  const exportarCSV = () => {
    const headers = ["ID", "Tipo", "Descricao", "Empresa", "Categoria", "Valor", "Vencimento", "Status"];
    const rows = filtrados.map((l) => [
      l.id,
      l.tipo,
      l.descricao.replace(/,/g, ";"),
      l.empresa?.nomeFantasia ?? "",
      l.categoria?.nome ?? "",
      l.valor.toFixed(2),
      l.dataVencimento,
      l.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lancamentos_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  type Row = typeof filtrados[0];

  const columns = [
    { key: "descricao", header: "Descricao", sortable: true, render: (l: Row) => <span className="text-xs">{l.descricao}</span> },
    { key: "empresa", header: "Empresa", sortable: true, sortValue: (l: Row) => l.empresa?.nomeFantasia ?? "", render: (l: Row) => <span className="text-xs">{l.empresa?.nomeFantasia}</span> },
    { key: "categoria", header: "Categoria", sortable: true, sortValue: (l: Row) => l.categoria?.nome ?? "", render: (l: Row) => <span className="text-xs">{l.categoria?.nome}</span> },
    { key: "tipo", header: "Tipo", sortable: true, render: (l: Row) => (
      <span className={`text-xs font-medium ${l.tipo === "credito" ? "text-emerald-600" : "text-destructive"}`}>
        {l.tipo === "credito" ? "Receita" : "Despesa"}
      </span>
    )},
    { key: "valor", header: "Valor", align: "right" as const, sortable: true, render: (l: Row) => (
      <span className="text-xs font-medium">{fmtMoeda(l.valor)}</span>
    )},
    { key: "dataVencimento", header: "Vencimento", sortable: true, render: (l: Row) => <span className="text-xs">{fmtData(l.dataVencimento)}</span> },
    { key: "status", header: "Status", sortable: true, render: (l: Row) => <span className="text-xs">{l.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <PainelFiltros
        f={f}
        acoes={
          <Button variant="outline" onClick={exportarCSV}>
            <Download size={14} />
            Exportar CSV
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Receita Bruta" value={receitas} icon={<TrendingUp size={18} />} colorVariant="green" />
        <KpiCard title="Despesas" value={despesas} icon={<TrendingDown size={18} />} colorVariant="red" />
        <KpiCard title="Resultado" value={lucro} icon={<Scale size={18} />} colorVariant={lucro >= 0 ? "blue" : "red"} />
        <KpiCard title="Margem" value={margem} format="percentual" icon={<Percent size={18} />} colorVariant="amber" />
      </div>

      {/* DRE Simplificado */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">DRE Simplificado</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: "Receita Bruta", valor: receitas, destaque: false },
            { label: "Despesas Operacionais", valor: -filtrados.filter((l) => l.tipo === "debito" && l.categoria?.nome && ["Fornecedor", "Manutencao", "Marketing"].includes(l.categoria.nome)).reduce((a, l) => a + l.valor, 0), destaque: false },
            { label: "Despesas com Pessoal", valor: -filtrados.filter((l) => l.categoria?.nome === "Pessoal").reduce((a, l) => a + l.valor, 0), destaque: false },
            { label: "Impostos", valor: -filtrados.filter((l) => l.categoria?.nome === "Impostos").reduce((a, l) => a + l.valor, 0), destaque: false },
            { label: "Resultado Liquido", valor: lucro, destaque: true },
          ].map((row) => (
            <div key={row.label} className={`flex justify-between py-2 ${row.destaque ? "border-t-2 border-border font-semibold" : "border-t border-border/50"}`}>
              <span className={row.destaque ? "text-foreground" : "text-muted-foreground"}>{row.label}</span>
              <span className={row.valor >= 0 ? "text-emerald-600" : "text-destructive"}>{fmtMoeda(row.valor)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grafico */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Evolucao Anual</h3>
        <FluxoBarChart dados={fluxo} />
      </div>

      {/* Ranking categorias */}
      {ranking.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Ranking por Categoria</h3>
          <div className="space-y-3">
            {ranking.slice(0, 8).map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{cat.nome}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${calcularPercentual(cat.valor, maxRanking)}%`, backgroundColor: cat.cor }}
                  />
                </div>
                <span className="text-xs font-medium w-24 text-right shrink-0">{fmtMoeda(cat.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Lancamentos ({filtrados.length})</h3>
        <Table columns={columns} data={filtrados as (Row & { id: string })[]} defaultSortKey="dataVencimento" />
      </div>
    </div>
  );
}
