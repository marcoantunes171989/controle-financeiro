// Componente exclusivo do Dashboard Executivo (Microgate 06).
//
// Exibe a comparação de um indicador de regime de caixa (receitas,
// despesas ou resultado) entre o período atual e um período de
// referência (mês anterior / mesmo mês do ano anterior). Todo o cálculo
// (diferença, percentual, mudança de sinal) já vem pronto do núcleo
// financeiro compartilhado e da camada de dados do Dashboard — este
// componente só formata e exibe.
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtMoeda } from '../../utils/format';
import type { IndicadorPercentual } from '../../services/financeiro';

export interface ComparativoValor {
  atual: number;
  anterior: number;
  diferenca: number;
  percentual: IndicadorPercentual;
  mudancaSinal: boolean;
}

export interface ComparativoPeriodoCardProps {
  titulo: string;
  rotuloAtual: string;
  rotuloAnterior: string;
  receitas: ComparativoValor;
  despesas: ComparativoValor;
  resultado: ComparativoValor;
}

function Linha({ label, dados }: { label: string; dados: ComparativoValor }) {
  const subiu = dados.diferenca > 0;
  const caiu = dados.diferenca < 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{fmtMoeda(dados.atual)}</p>
        <p className="text-[11px] text-slate-400">anterior: {fmtMoeda(dados.anterior)}</p>
      </div>
      <div className="text-right shrink-0">
        <div
          className={`flex items-center justify-end gap-1 text-xs font-medium ${
            subiu ? 'text-emerald-600' : caiu ? 'text-destructive' : 'text-slate-400'
          }`}
        >
          {subiu ? <TrendingUp size={12} /> : caiu ? <TrendingDown size={12} /> : <Minus size={12} />}
          <span>{fmtMoeda(Math.abs(dados.diferenca))}</span>
        </div>
        {dados.mudancaSinal ? (
          <p className="text-[11px] text-amber-600">mudança de sinal</p>
        ) : dados.percentual.calculavel ? (
          <p className="text-[11px] text-slate-400">{dados.percentual.percentual.toFixed(1)}%</p>
        ) : (
          <p className="text-[11px] text-slate-400">variação indisponível</p>
        )}
      </div>
    </div>
  );
}

export default function ComparativoPeriodoCard({
  titulo,
  rotuloAtual,
  rotuloAnterior,
  receitas,
  despesas,
  resultado,
}: ComparativoPeriodoCardProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-1">{titulo}</p>
      <p className="text-[11px] text-slate-400 mb-2">
        {rotuloAtual} vs {rotuloAnterior}
      </p>
      <Linha label="Receitas no período" dados={receitas} />
      <Linha label="Despesas no período" dados={despesas} />
      <Linha label="Resultado do período" dados={resultado} />
    </div>
  );
}
