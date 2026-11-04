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
import PainelFiltros from "../components/shared/PainelFiltros";
import { useFiltrosLancamentos } from "../hooks/useFiltrosLancamentos";
import StatusBadge from "../components/shared/StatusBadge";
import KpiCard from "../components/shared/KpiCard";
import { ArrowUpCircle, TrendingUp, Clock, AlertCircle, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/Dialog";
import DropZone from "../components/ui/DropZone";
import LancamentoDetalheModal from "../components/shared/LancamentoDetalheModal";
import AnexosModal from "../components/shared/AnexosModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

type OutletCtx = { competencia: string; setCompetencia: (c: string) => void };

export default function ContasReceber() {
  const { competencia } = useOutletContext<OutletCtx>();
  const { lancamentos, deleteLancamento, baixarLancamento } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();
  const { toast } = useToast();

  const [detalhe, setDetalhe] = useState<Lancamento | null>(null);
  const [anexosLanc, setAnexosLanc] = useState<Lancamento | null>(null);
  const [modalBaixa, setModalBaixa] = useState<Lancamento | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<{ id: string; descricao: string } | null>(null);
  const [dataRecebimento, setDataRecebimento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [anexosBaixa, setAnexosBaixa] = useState<File[]>([]);
  const [dropKey, setDropKey] = useState(0);

  const f = useFiltrosLancamentos({ tipo: "credito", lancamentos, empresas, categorias, competencia });
  const creditos = f.itens;
  const total = creditos.reduce((a, l) => a + l.valor, 0);
  // Cartões ignoram só o filtro de status, para mostrar a distribuição.
  const somar = (st?: string) => f.kpiItens.filter((l) => !st || l.status === st).reduce((a, l) => a + l.valor, 0);
  const totalKpi = somar();
  const recebido = somar("recebido");
  const pendente = somar("pendente");
  const vencido = somar("vencido");

  const fecharModalBaixa = () => {
    setModalBaixa(null);
    setAnexosBaixa([]);
    setDropKey((k) => k + 1);
  };

  const handleBaixa = async () => {
    if (!modalBaixa) return;
    try {
      await baixarLancamento(modalBaixa.id, dataRecebimento, anexosBaixa);
      toast({ title: "Recebimento confirmado!", description: `${modalBaixa.descricao} marcado como recebido.`, variant: "success" });
    } catch {
      toast({ title: "Erro ao confirmar recebimento", variant: "error" });
    }
    fecharModalBaixa();
  };

  type Row = typeof creditos[0];

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
      <span className="text-sm font-semibold text-emerald-600">{fmtMoeda(l.valor)}</span>
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
          <Button size="sm" variant="secondary" onClick={() => { setModalBaixa(l); setDataRecebimento(format(new Date(), "yyyy-MM-dd")); setAnexosBaixa([]); setDropKey((k) => k + 1); }}>
            Receber
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total" value={totalKpi} icon={<ArrowUpCircle size={18} />} colorVariant="blue" />
        <KpiCard title="Recebido" value={recebido} icon={<TrendingUp size={18} />} colorVariant="green" />
        <KpiCard title="Pendente" value={pendente} icon={<Clock size={18} />} colorVariant="amber" />
        <KpiCard title="Vencido" value={vencido} icon={<AlertCircle size={18} />} colorVariant="red" />
      </div>

      <PainelFiltros f={f} />

      <Table
        columns={columns}
        data={creditos}
        emptyMessage="Nenhuma conta a receber encontrada"
        defaultSortKey="dataVencimento"
        onRowClick={(row) => setDetalhe(row as Lancamento)}
      />

      <div className="flex justify-end gap-4 text-sm text-muted-foreground px-4">
        <span>Período: <strong className="text-foreground">{f.periodoLabel}</strong></span>
        <span>Lançamentos: <strong className="text-foreground">{creditos.length}</strong></span>
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
            <DialogTitle>Confirmar recebimento</DialogTitle>
          </DialogHeader>
          {modalBaixa && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirmar recebimento de <strong className="text-foreground">{modalBaixa.descricao}</strong> no valor de{" "}
                <strong className="text-foreground">{fmtMoeda(modalBaixa.valor)}</strong>?
              </p>
              <Input type="date" label="Data do recebimento" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
              <DropZone
                key={dropKey}
                label="Comprovante de recebimento (opcional)"
                hint="PDF, imagem ou documento — máx. 10 MB"
                accept={{ "image/*": [], "application/pdf": [], "application/msword": [], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [] }}
                onFilesAccepted={(files) => setAnexosBaixa((prev) => [...prev, ...files])}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={fecharModalBaixa}>Cancelar</Button>
            <Button onClick={handleBaixa}>Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
