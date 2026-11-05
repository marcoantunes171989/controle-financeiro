// Componente exclusivo do Dashboard Executivo (Microgate 06).
//
// Lista ordenada (decrescente) das maiores despesas pagas individuais do
// período/filtros selecionados. A ordenação e os valores já vêm prontos
// da camada de dados do Dashboard, que reutiliza o núcleo financeiro
// compartilhado para apurar quais lançamentos são elegíveis.
import { fmtMoeda, fmtData } from '../../utils/format';

export interface ItemRankingDespesa {
  id: string;
  descricao: string;
  categoriaNome: string;
  empresaNome: string;
  dataPagamento: string;
  valor: number;
}

interface RankingDespesasListProps {
  itens: ItemRankingDespesa[];
}

export default function RankingDespesasList({ itens }: RankingDespesasListProps) {
  if (itens.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-8">Sem despesas pagas no período</p>;
  }

  return (
    <ol className="divide-y divide-slate-50">
      {itens.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 py-2">
          <span className="text-xs font-semibold text-slate-400 w-5 shrink-0">{index + 1}º</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{item.descricao}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {item.empresaNome} · {item.categoriaNome} · {fmtData(item.dataPagamento)}
            </p>
          </div>
          <span className="text-sm font-semibold text-destructive shrink-0">{fmtMoeda(item.valor)}</span>
        </li>
      ))}
    </ol>
  );
}
