import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FluxoMensal } from '../../types';
import { fmtMoeda } from '../../utils/format';

interface FluxoBarChartProps {
  dados: FluxoMensal[];
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

const fmtK = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

export default function FluxoBarChart({ dados }: FluxoBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mesAbrev" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="receitas" name="Receitas" fill="#1D9E75" radius={[3, 3, 0, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill="#E24B4A" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
