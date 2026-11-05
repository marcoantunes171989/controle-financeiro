// Componente exclusivo do Dashboard Executivo (Microgate 06-B).
//
// Ranking decrescente das categorias de despesa por total pago no
// período/filtros selecionados. Os valores (total, percentual, nome)
// já vêm prontos da camada de dados do Dashboard, que reutiliza
// exclusivamente `calcularDespesasCategoria` do núcleo financeiro
// compartilhado — nenhum cálculo é duplicado aqui.
//
// Diferente de `RankingDespesasList` (maiores pagamentos individuais):
// este ranking agrupa por categoria, não por lançamento.
import { useState } from 'react';
import Modal from '../ui/Modal';
import { fmtMoeda } from '../../utils/format';

export interface ItemRankingCategoria {
  categoriaId: string;
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
}

interface CategoriaRankingListProps {
  itens: ItemRankingCategoria[];
  limite?: number;
}

function ItemRanking({ item, posicao }: { item: ItemRankingCategoria; posicao: number }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="text-xs font-semibold text-slate-400 w-5 shrink-0">{posicao}º</span>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.nome}</p>
        <p className="text-[11px] text-slate-400">{item.percentual.toFixed(1)}% das despesas pagas</p>
      </div>
      <span className="text-sm font-semibold text-destructive shrink-0">{fmtMoeda(item.valor)}</span>
    </li>
  );
}

export default function CategoriaRankingList({ itens, limite = 6 }: CategoriaRankingListProps) {
  const [verTodas, setVerTodas] = useState(false);

  if (itens.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-8">Sem despesas pagas no período</p>;
  }

  const visiveis = itens.slice(0, limite);
  const temMais = itens.length > limite;

  return (
    <>
      <ol className="divide-y divide-slate-50">
        {visiveis.map((item, index) => (
          <ItemRanking key={item.categoriaId} item={item} posicao={index + 1} />
        ))}
      </ol>
      {temMais && (
        <button
          type="button"
          onClick={() => setVerTodas(true)}
          className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
        >
          Ver todas as categorias ({itens.length})
        </button>
      )}
      <Modal open={verTodas} onClose={() => setVerTodas(false)} title="Todas as categorias" size="lg">
        <ol className="divide-y divide-slate-50">
          {itens.map((item, index) => (
            <ItemRanking key={item.categoriaId} item={item} posicao={index + 1} />
          ))}
        </ol>
      </Modal>
    </>
  );
}
