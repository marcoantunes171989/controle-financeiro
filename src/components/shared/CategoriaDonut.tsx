import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoriaTotais } from '../../types';
import { fmtMoeda } from '../../utils/format';

interface CategoriaDonutProps {
  dados: CategoriaTotais[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as CategoriaTotais;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow text-xs">
      <p className="font-semibold text-slate-700">{item.nome}</p>
      <p className="text-slate-500">{fmtMoeda(item.valor)}</p>
      <p className="text-slate-400">{item.percentual.toFixed(1)}%</p>
    </div>
  );
};

export default function CategoriaDonut({ dados }: CategoriaDonutProps) {
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="flex gap-4 items-center">
      <div className="w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              dataKey="valor"
              strokeWidth={0}
            >
              {dados.map((entry, index) => (
                <Cell key={index} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {dados.slice(0, 6).map((item) => (
          <div key={item.categoriaId} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
            <span className="text-xs text-slate-600 truncate flex-1">{item.nome}</span>
            <span className="text-xs text-slate-500 shrink-0">{item.percentual.toFixed(0)}%</span>
          </div>
        ))}
        <p className="text-xs text-slate-400 pt-1">Total: {fmtMoeda(total)}</p>
      </div>
    </div>
  );
}
