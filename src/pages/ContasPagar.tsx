import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { useToast } from "../components/ui/Toast";
import type { Lancamento } from "../types";
import { fmtMoeda, fmtData } from "../utils/format";
import Table from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import StatusBadge from "../components/shared/StatusBadge";
import KpiCard from "../components/shared/KpiCard";
import { ArrowDownCircle, TrendingDown, Clock, AlertCircle, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/Dialog";
import DropZone from "../components/ui/DropZone";
import LancamentoDetalheModal from "../components/shared/LancamentoDetalheModal";
import AnexosModal from "../components/shared/AnexosModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

export default function ContasPagar() {
  const { competencia } = useOutletContext<OutletCtx>();
  const { lancamentos, deleteLancamento, baixarLancamento } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();
  const { toast } = useToast();

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [todosPeriodos, setTodosPeriodos] = useState(false);
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [campoData, setCampoData] = useState<"vencimento" | "emissao">("vencimento");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [detalhe, setDetalhe] = useState<Lancamento | null>(null);
  const [anexosLanc, setAnexosLanc] = useState<Lancamento | null>(null);
  const [modalBaixa, setModalBaixa] = useState<Lancamento | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<{ id: string; descricao: string } | null>(null);
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [anexosBaixa, setAnexosBaixa] = useState<File[]>([]);
  const [dropKey, setDropKey] = useState(0);

  const q = busca.trim().toLowerCase();

  // Intervalo de datas (emissão ou vencimento): quando preenchido, substitui o filtro de mês/ano da barra superior.
  const intervaloInvalido = !!dataInicio && !!dataFim && dataFim < dataInicio;
  const intervaloAtivo = (!!dataInicio || !!dataFim) && !intervaloInvalido;
  const noIntervalo = (l: Lancamento) => {
    const d = (campoData === "emissao" ? l.dataEmissao : l.dataVencimento).substring(0, 10);
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    return true;
  };
  const temFiltroLocal = !!(busca || statusFiltro || catFiltro || empresaFiltro || dataInicio || dataFim || todosPeriodos);
  const limparFiltros = () => {
    setBusca(""); setStatusFiltro(""); setCatFiltro(""); setEmpresaFiltro("");
    setDataInicio(""); setDataFim(""); setCampoData("vencimento"); setTodosPeriodos(false);
  };

  const debitos = lancamentos
    .filter((l) => l.tipo === "debito")
    .filter((l) => (intervaloAtivo ? noIntervalo(l) : todosPeriodos || l.competencia === competencia))
    .filter((l) => !empresaFiltro || l.empresaId === empresaFiltro)
    .filter((l) => !statusFiltro || l.status === statusFiltro)
    .filter((l) => !catFiltro || l.categoriaId === catFiltro)
    .map((l) => ({
      ...l,
      empresa: empresas.find((e) => e.id === l.empresaId),
      categoria: categorias.find((c) => c.id === l.categoriaId),
    }))
    .filter((l) => {
      if (!q) return true;
      return [
        l.descricao,
        l.empresa?.nomeFantasia ?? "",
        l.categoria?.nome ?? "",
        fmtData(l.dataEmissao),
        fmtData(l.dataVencimento),
        fmtMoeda(l.valor),
        l.status,
      ].some((v) => v.toLowerCase().includes(q));
    })

  const [anoComp, mesComp] = competencia.split("-");
  const periodoLabel = intervaloAtivo
    ? `${campoData === "emissao" ? "emissão" : "vencimento"} ${dataInicio ? fmtData(dataInicio) : "…"} a ${dataFim ? fmtData(dataFim) : "…"}`
    : todosPeriodos ? "todos os períodos" : `${mesComp}/${anoComp}`;

  const total = debitos.reduce((a, l) => a + l.valor, 0);
  const pago = debitos.filter((l) => l.status === "pago").reduce((a, l) => a + l.valor, 0);
  const pendente = debitos.filter((l) => l.status === "pendente").reduce((a, l) => a + l.valor, 0);
  const vencido = debitos.filter((l) => l.status === "vencido").reduce((a, l) => a + l.valor, 0);

  const fecharModalBaixa = () => {
    setModalBaixa(null);
    setAnexosBaixa([]);
    setDropKey((k) => k + 1);
  };

  const handleBaixa = async () => {
    if (!modalBaixa) return;
    try {
      await baixarLancamento(modalBaixa.id, dataPagamento, anexosBaixa);
      toast({ title: "Baixa realizada!", description: `${modalBaixa.descricao} marcado como pago.`, variant: "success" });
    } catch {
      toast({ title: "Erro ao dar baixa", variant: "error" });
    }
    fecharModalBaixa();
  };

  type Row = typeof debitos[0];

  const columns = [
    { key: "descricao", header: "Descricao", sortable: true, render: (l: Row) => (
      <div>
        <p className="text-sm font-medium truncate max-w-[200px]">{l.descricao}</p>
        {l.parcelaAtual && l.numeroParcelas && (
          <p className="text-xs text-muted-foreground">{l.parcelaAtual}/{l.numeroParcelas}</p>
        )}
      </div>
    )},
    { key: "empresa", header: "Empresa", sortable: true, sortValue: (l: Row) => l.empresa?.nomeFantasia ?? "", render: (l: Row) => (
      <span className="text-xs text-muted-foreground">{l.empresa?.nomeFantasia ?? "-"}</span>
    )},
    { key: "categoria", header: "Categoria", sortable: true, sortValue: (l: Row) => l.categoria?.nome ?? "", render: (l: Row) => (
      l.categoria ? (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: l.categoria.cor + "20", color: l.categoria.cor }}>
          {l.categoria.nome}
        </span>
      ) : null
    )},
    { key: "dataEmissao", header: "Emissao", sortable: true, render: (l: Row) => <span className="text-xs text-muted-foreground">{fmtData(l.dataEmissao)}</span> },
    { key: "dataVencimento", header: "Vencimento", sortable: true, render: (l: Row) => <span className="text-xs text-muted-foreground">{fmtData(l.dataVencimento)}</span> },
    { key: "valor", header: "Valor", align: "right" as const, sortable: true, render: (l: Row) => (
      <span className="text-sm font-semibold text-destructive">{fmtMoeda(l.valor)}</span>
    )},
    { key: "status", header: "Situacao", sortable: true, render: (l: Row) => <StatusBadge status={l.status} /> },
    { key: "acoes", header: "Acoes", render: (l: Row) => (
      <div className="flex items-center gap-1">
        <button
          title="Ver anexos"
          onClick={() => setAnexosLanc(l as Lancamento)}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Paperclip size={14} />
        </button>
        {(l.status === "pendente" || l.status === "vencido") && (
          <Button size="sm" variant="secondary" onClick={() => { setModalBaixa(l); setDataPagamento(format(new Date(), "yyyy-MM-dd")); setAnexosBaixa([]); setDropKey((k) => k + 1); }}>
            Baixar
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={() => setConfirmExcluir({ id: l.id, descricao: l.descricao })}>
          Excluir
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total" value={total} icon={<ArrowDownCircle size={18} />} colorVariant="blue" />
        <KpiCard title="Pago" value={pago} icon={<TrendingDown size={18} />} colorVariant="green" />
        <KpiCard title="Pendente" value={pendente} icon={<Clock size={18} />} colorVariant="amber" />
        <KpiCard title="Vencido" value={vencido} icon={<AlertCircle size={18} />} colorVariant="red" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48 flex-1 placeholder:text-muted-foreground" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-40" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
          <option value="">Todas categorias</option>
          {categorias.filter((c) => c.tipo === "debito").map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={todosPeriodos}
            onChange={(e) => setTodosPeriodos(e.target.checked)}
          />
          Considerar todos os períodos
        </label>
        {temFiltroLocal && (
          <Button size="sm" variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
        )}
      </div>

      {/* Empresa + período por emissão/vencimento */}
      <div className="flex flex-wrap items-end gap-3">
        <select className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-56" value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="">Todas as empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nomeFantasia}</option>
          ))}
        </select>
        <fieldset className="flex h-9 items-center gap-4 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
          <legend className="sr-only">Filtrar período por</legend>
          {(["vencimento", "emissao"] as const).map((c) => (
            <label key={c} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="campoData"
                className="h-4 w-4 accent-primary"
                checked={campoData === c}
                onChange={() => setCampoData(c)}
              />
              {c === "vencimento" ? "Vencimento" : "Emissão"}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          Data inicial
          <input type="date" className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={dataInicio} max={dataFim || undefined} onChange={(e) => setDataInicio(e.target.value)} />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          Data final
          <input type="date" className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={dataFim} min={dataInicio || undefined} onChange={(e) => setDataFim(e.target.value)} />
        </label>
        {intervaloInvalido && (
          <p className="text-xs text-destructive pb-2">A data final deve ser igual ou posterior à inicial.</p>
        )}
        {intervaloAtivo && (
          <p className="text-xs text-muted-foreground pb-2">O intervalo de datas substitui o filtro de mês/ano da barra superior.</p>
        )}
      </div>

      {/* Tabela */}
      <Table
        columns={columns}
        data={debitos}
        emptyMessage="Nenhuma conta a pagar encontrada"
        defaultSortKey="dataVencimento"
        onRowClick={(row) => setDetalhe(row as Lancamento)}
      />

      <div className="flex justify-end gap-4 text-sm text-muted-foreground px-4">
        <span>Período: <strong className="text-foreground">{periodoLabel}</strong></span>
        <span>Total filtrado: <strong className="text-foreground">{fmtMoeda(total)}</strong></span>
      </div>

      {detalhe && (
        <LancamentoDetalheModal
          lancamento={detalhe}
          open={!!detalhe}
          onClose={() => setDetalhe(null)}
        />
      )}

      {anexosLanc && (
        <AnexosModal
          lancamento={anexosLanc}
          open={!!anexosLanc}
          onClose={() => setAnexosLanc(null)}
        />
      )}

      {/* Modal de baixa */}
      <ConfirmDialog
        open={!!confirmExcluir}
        title="Excluir lançamento"
        message={`Deseja excluir "${confirmExcluir?.descricao}"? Esta ação não pode ser desfeita.`}
        onCancel={() => setConfirmExcluir(null)}
        onConfirm={async () => {
          try {
            await deleteLancamento(confirmExcluir!.id);
            toast({ title: "Excluído", variant: "info" });
          } catch {
            toast({ title: "Erro ao excluir", variant: "error" });
          } finally {
            setConfirmExcluir(null);
          }
        }}
      />

      <Dialog open={!!modalBaixa} onOpenChange={(o) => !o && fecharModalBaixa()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dar baixa no pagamento</DialogTitle>
          </DialogHeader>
          {modalBaixa && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirmar pagamento de <strong className="text-foreground">{modalBaixa.descricao}</strong> no valor de{" "}
                <strong className="text-foreground">{fmtMoeda(modalBaixa.valor)}</strong>?
              </p>
              <Input type="date" label="Data do pagamento" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              <DropZone
                key={dropKey}
                label="Comprovante de pagamento (opcional)"
                hint="PDF, imagem ou documento — máx. 10 MB"
                accept={{ "image/*": [], "application/pdf": [], "application/msword": [], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [] }}
                onFilesAccepted={(files) => setAnexosBaixa((prev) => [...prev, ...files])}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={fecharModalBaixa}>Cancelar</Button>
            <Button onClick={handleBaixa}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
