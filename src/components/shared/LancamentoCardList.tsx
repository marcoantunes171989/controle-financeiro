import { Paperclip, FileX } from "lucide-react";
import type { Lancamento } from "../../types";
import { fmtMoeda, fmtData } from "../../utils/format";
import { Button } from "../ui/Button";
import StatusBadge from "./StatusBadge";

interface LancamentoCardListProps {
  itens: Lancamento[];
  emptyMessage: string;
  valorClassName: string;
  acaoLabel: string;
  onRowClick: (l: Lancamento) => void;
  onAnexos: (l: Lancamento) => void;
  onBaixa: (l: Lancamento) => void;
  onExcluir: (l: Lancamento) => void;
}

/**
 * Alternativa em cards para a Table em telas de smartphone, onde uma
 * tabela horizontal nao oferece boa usabilidade. Preserva os mesmos
 * dados e acoes das colunas da Table (valor, vencimento, situacao,
 * empresa, descricao, acoes).
 */
export default function LancamentoCardList({
  itens,
  emptyMessage,
  valorClassName,
  acaoLabel,
  onRowClick,
  onAnexos,
  onBaixa,
  onExcluir,
}: LancamentoCardListProps) {
  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <FileX size={32} />
        <span className="text-sm">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {itens.map((l) => (
        <li key={l.id}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onRowClick(l)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRowClick(l);
              }
            }}
            className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{l.descricao}</p>
                {l.parcelaAtual && l.numeroParcelas && (
                  <p className="text-xs text-muted-foreground">{l.parcelaAtual}/{l.numeroParcelas}</p>
                )}
              </div>
              <StatusBadge status={l.status} />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>{l.empresa?.nomeFantasia ?? "-"}</span>
              {l.categoria && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: l.categoria.cor + "20", color: l.categoria.cor }}
                >
                  {l.categoria.nome}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="text-sm text-foreground">{fmtData(l.dataVencimento)}</p>
              </div>
              <p className={`text-base font-semibold ${valorClassName}`}>{fmtMoeda(l.valor)}</p>
            </div>

            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                title="Ver anexos"
                aria-label="Ver anexos"
                onClick={() => onAnexos(l)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Paperclip size={16} />
              </button>
              {(l.status === "pendente" || l.status === "vencido") && (
                <Button size="sm" variant="secondary" className="flex-1 min-h-[44px]" onClick={() => onBaixa(l)}>
                  {acaoLabel}
                </Button>
              )}
              <Button size="sm" variant="destructive" className="flex-1 min-h-[44px]" onClick={() => onExcluir(l)}>
                Excluir
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
