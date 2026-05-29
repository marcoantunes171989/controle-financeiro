import { TrendingUp, TrendingDown, Scale, Clock, AlertTriangle } from 'lucide-react';
import { useLancamentos } from '../hooks/useLancamentos';
import { useEmpresas } from '../hooks/useEmpresas';
import { useCategorias } from '../hooks/useCategorias';
import KpiCard from '../components/shared/KpiCard';
import FluxoBarChart from '../components/shared/FluxoBarChart';
import CategoriaDonut from '../components/shared/CategoriaDonut';
import LancamentoRow from '../components/shared/LancamentoRow';
import { Card } from '../components/ui/Card';
import type { Lancamento, CategoriaTotais } from '../types';
import { calcularPercentual, calcKpis, calcFluxoMensal } from '../utils/calculos';

function enrich(
  lancamentos: Lancamento[],
  empresas: ReturnType<typeof useEmpresas>['empresas'],
  categorias: ReturnType<typeof useCategorias>['categorias'],
) {
  return lancamentos.map((l) => ({
    ...l,
    empresa: empresas.find((e) => e.id === l.empresaId),
    categoria: categorias.find((c) => c.id === l.categoriaId),
  }));
}

export default function Dashboard() {
  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();

  const kpis = calcKpis(lancamentos);
  const fluxo = calcFluxoMensal(lancamentos, new Date().getFullYear());
  const enriched = enrich(lancamentos, empresas, categorias);

  const ultimos10 = [...enriched]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const proxVencimentos = enriched
    .filter((l) => l.status === 'pendente' || l.status === 'vencido')
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 5);

  const despesasPorCategoria = categorias
    .filter((c) => c.tipo === 'debito')
    .map((c) => {
      const valor = lancamentos
        .filter((l) => l.categoriaId === c.id && l.tipo === 'debito')
        .reduce((acc, l) => acc + l.valor, 0);
      return { categoriaId: c.id, nome: c.nome, valor, cor: c.cor, percentual: 0 };
    })
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const totalDespesas = despesasPorCategoria.reduce((acc, c) => acc + c.valor, 0);
  const despesasComPct: CategoriaTotais[] = despesasPorCategoria.map((c) => ({
    ...c,
    percentual: calcularPercentual(c.valor, totalDespesas),
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Receitas do Mês" value={kpis.receitasMes} icon={<TrendingUp size={18} />} colorVariant="green" />
        <KpiCard title="Despesas do Mês" value={kpis.despesasMes} icon={<TrendingDown size={18} />} colorVariant="red" />
        <KpiCard
          title="Saldo Líquido"
          value={kpis.saldoLiquido}
          icon={<Scale size={18} />}
          colorVariant={kpis.saldoLiquido >= 0 ? 'blue' : 'red'}
        />
        <KpiCard title="A vencer em 7 dias" value={kpis.totalVencer7dias} icon={<Clock size={18} />} colorVariant="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Fluxo de Caixa" className="xl:col-span-2">
          <div className="pt-4">
            <FluxoBarChart dados={fluxo} />
          </div>
        </Card>
        <Card title="Despesas por Categoria" padding="sm">
          <div className="pt-4">
            {despesasComPct.length > 0 ? (
              <CategoriaDonut dados={despesasComPct} />
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Sem dados de despesas</p>
            )}
          </div>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Últimos Lançamentos" padding="sm">
          <div className="divide-y divide-slate-50">
            {ultimos10.map((l) => (
              <LancamentoRow key={l.id} lancamento={l as Lancamento} />
            ))}
          </div>
        </Card>
        <Card title="Próximos Vencimentos" padding="sm">
          {proxVencimentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <AlertTriangle size={24} />
              <p className="text-sm">Nenhum vencimento pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {proxVencimentos.map((l) => (
                <LancamentoRow key={l.id} lancamento={l as Lancamento} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
