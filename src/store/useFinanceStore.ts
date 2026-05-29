import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lancamento, FiltroLancamento, DashboardKpis, FluxoMensal } from '../types';
import { seedLancamentos } from '../data/seed';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';

interface FinanceState {
  lancamentos: Lancamento[];
  filtros: FiltroLancamento;
  addLancamento: (l: Omit<Lancamento, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLancamento: (id: string, dados: Partial<Lancamento>) => void;
  deleteLancamento: (id: string) => void;
  baixarLancamento: (id: string, dataPagamento: string) => void;
  setFiltros: (f: Partial<FiltroLancamento>) => void;
  getLancamentosFiltrados: () => Lancamento[];
  getKpis: () => DashboardKpis;
  getFluxoMensal: (ano: number) => FluxoMensal[];
  getLancamentosPagar: () => Lancamento[];
  getLancamentosReceber: () => Lancamento[];
  marcarVencidos: () => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      lancamentos: seedLancamentos,
      filtros: {},

      addLancamento: (dados) => {
        const now = new Date().toISOString();
        const novoLancamento: Lancamento = {
          ...dados,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        if (dados.tipoRecorrencia === 'parcelas' && dados.numeroParcelas) {
          const parcelas: Lancamento[] = [];
          for (let i = 0; i < dados.numeroParcelas; i++) {
            const vencParcela = new Date(dados.dataVencimento);
            vencParcela.setMonth(vencParcela.getMonth() + i);
            parcelas.push({
              ...novoLancamento,
              id: crypto.randomUUID(),
              valor: dados.valor,
              valorTotal: dados.valorTotal,
              parcelaAtual: i + 1,
              dataVencimento: format(vencParcela, 'yyyy-MM-dd'),
              competencia: format(vencParcela, 'yyyy-MM'),
              descricao: `${dados.descricao} (${i + 1}/${dados.numeroParcelas})`,
            });
          }
          set((s) => ({ lancamentos: [...s.lancamentos, ...parcelas] }));
          return;
        }

        set((s) => ({ lancamentos: [...s.lancamentos, novoLancamento] }));
      },

      updateLancamento: (id, dados) =>
        set((s) => ({
          lancamentos: s.lancamentos.map((l) =>
            l.id === id ? { ...l, ...dados, updatedAt: new Date().toISOString() } : l
          ),
        })),

      deleteLancamento: (id) =>
        set((s) => ({ lancamentos: s.lancamentos.filter((l) => l.id !== id) })),

      baixarLancamento: (id, dataPagamento) =>
        set((s) => ({
          lancamentos: s.lancamentos.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: l.tipo === 'credito' ? 'recebido' : 'pago',
                  dataPagamento,
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        })),

      setFiltros: (f) => set((s) => ({ filtros: { ...s.filtros, ...f } })),

      marcarVencidos: () => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        set((s) => ({
          lancamentos: s.lancamentos.map((l) => {
            if (l.status === 'pendente') {
              const venc = parseISO(l.dataVencimento);
              if (isBefore(venc, hoje)) {
                return { ...l, status: 'vencido' as const, updatedAt: new Date().toISOString() };
              }
            }
            return l;
          }),
        }));
      },

      getLancamentosFiltrados: () => {
        const { lancamentos, filtros } = get();
        return lancamentos.filter((l) => {
          if (filtros.empresaId && l.empresaId !== filtros.empresaId) return false;
          if (filtros.categoriaId && l.categoriaId !== filtros.categoriaId) return false;
          if (filtros.status && l.status !== filtros.status) return false;
          if (filtros.tipo && l.tipo !== filtros.tipo) return false;
          if (filtros.competencia && l.competencia !== filtros.competencia) return false;
          if (filtros.busca) {
            const b = filtros.busca.toLowerCase();
            if (!l.descricao.toLowerCase().includes(b)) return false;
          }
          return true;
        });
      },

      getKpis: () => {
        const { lancamentos } = get();
        const hoje = new Date();
        const competencia = format(hoje, 'yyyy-MM');
        const daqui7 = addDays(hoje, 7);
        const daqui30 = addDays(hoje, 30);

        const doMes = lancamentos.filter((l) => l.competencia === competencia);
        const receitasMes = doMes
          .filter((l) => l.tipo === 'credito' && (l.status === 'recebido' || l.status === 'pendente'))
          .reduce((acc, l) => acc + l.valor, 0);
        const despesasMes = doMes
          .filter((l) => l.tipo === 'debito' && (l.status === 'pago' || l.status === 'pendente'))
          .reduce((acc, l) => acc + l.valor, 0);

        const pendentes = lancamentos.filter((l) => l.status === 'pendente' || l.status === 'vencido');
        const totalVencer7dias = pendentes
          .filter((l) => {
            const v = parseISO(l.dataVencimento);
            return isAfter(v, hoje) && isBefore(v, daqui7);
          })
          .reduce((acc, l) => acc + l.valor, 0);
        const totalVencer30dias = pendentes
          .filter((l) => {
            const v = parseISO(l.dataVencimento);
            return isAfter(v, hoje) && isBefore(v, daqui30);
          })
          .reduce((acc, l) => acc + l.valor, 0);

        return {
          receitasMes,
          despesasMes,
          saldoLiquido: receitasMes - despesasMes,
          totalVencer7dias,
          totalVencer30dias,
          titulosPendentes: pendentes.length,
        };
      },

      getFluxoMensal: (ano) => {
        const { lancamentos } = get();
        return Array.from({ length: 12 }, (_, i) => {
          const mes = format(new Date(ano, i, 1), 'yyyy-MM');
          const mesAbrev = format(new Date(ano, i, 1), 'MMM');
          const doMes = lancamentos.filter((l) => l.competencia === mes);
          const receitas = doMes
            .filter((l) => l.tipo === 'credito')
            .reduce((acc, l) => acc + l.valor, 0);
          const despesas = doMes
            .filter((l) => l.tipo === 'debito')
            .reduce((acc, l) => acc + l.valor, 0);
          return { mes, mesAbrev, receitas, despesas, saldo: receitas - despesas };
        });
      },

      getLancamentosPagar: () =>
        get().lancamentos.filter((l) => l.tipo === 'debito'),

      getLancamentosReceber: () =>
        get().lancamentos.filter((l) => l.tipo === 'credito'),
    }),
    { name: 'finance-store' }
  )
);
