// Componente exclusivo do Dashboard Executivo (Microgate 06).
//
// Exibe a evolução mensal do regime de caixa realizado: receitas recebidas,
// despesas pagas e resultado de caixa (receitas - despesas). Os dados já
// chegam calculados pelo núcleo financeiro compartilhado — este componente
// apenas renderiza, sem nenhum cálculo monetário próprio.
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fmtMoeda, COR_RECEITA, COR_DESPESA } from '../../utils/format';

export const COR_RESULTADO = '#2563EB';

export interface PontoEvolucaoCaixa {
  mes: string;
  mesAbrev: string;
  receitas: number;
  despesas: number;
  resultado: number;
}

interface EvolucaoCaixaChartProps {
  dados: PontoEvolucaoCaixa[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow text-xs">
      <p className="font-semibold text-slate-700 mb-1.5 capitalize">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {fmtMoeda(entry.value)}
        </p>
      ))}
    </div>
  );
};

const fmtK = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v));

export default function EvolucaoCaixaChart({ dados, height = 260 }: EvolucaoCaixaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mesAbrev" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="receitas" name="Receitas" fill={COR_RECEITA} radius={[3, 3, 0, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill={COR_DESPESA} radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="resultado"
          name="Resultado"
          stroke={COR_RESULTADO}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
