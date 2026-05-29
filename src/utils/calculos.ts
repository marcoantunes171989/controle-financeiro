import { format, parseISO, isBefore, isAfter, addDays, differenceInCalendarDays } from 'date-fns';
import type { Lancamento, DashboardKpis, FluxoMensal } from '../types';

export const calcularParcelasValor = (valorTotal: number, nParcelas: number): number =>
  nParcelas > 0 ? valorTotal / nParcelas : 0;

export const calcularTotalParcelado = (valorParcela: number, nParcelas: number): number =>
  valorParcela * nParcelas;

export const calcularSaldo = (receitas: number, despesas: number): number =>
  receitas - despesas;

export const calcularPercentual = (valor: number, total: number): number =>
  total > 0 ? (valor / total) * 100 : 0;

export const isVencido = (dataVencimento: string): boolean => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return isBefore(parseISO(dataVencimento), hoje);
};

export const diasParaVencer = (dataVencimento: string): number =>
  differenceInCalendarDays(parseISO(dataVencimento), new Date());

export function calcKpis(lancamentos: Lancamento[]): DashboardKpis {
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
    .filter((l) => { const v = parseISO(l.dataVencimento); return isAfter(v, hoje) && isBefore(v, daqui7); })
    .reduce((acc, l) => acc + l.valor, 0);
  const totalVencer30dias = pendentes
    .filter((l) => { const v = parseISO(l.dataVencimento); return isAfter(v, hoje) && isBefore(v, daqui30); })
    .reduce((acc, l) => acc + l.valor, 0);

  return {
    receitasMes,
    despesasMes,
    saldoLiquido: receitasMes - despesasMes,
    totalVencer7dias,
    totalVencer30dias,
    titulosPendentes: pendentes.length,
  };
}

export function calcFluxoMensal(lancamentos: Lancamento[], ano: number): FluxoMensal[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = format(new Date(ano, i, 1), 'yyyy-MM');
    const mesAbrev = format(new Date(ano, i, 1), 'MMM');
    const doMes = lancamentos.filter((l) => l.competencia === mes);
    const receitas = doMes.filter((l) => l.tipo === 'credito').reduce((acc, l) => acc + l.valor, 0);
    const despesas = doMes.filter((l) => l.tipo === 'debito').reduce((acc, l) => acc + l.valor, 0);
    return { mes, mesAbrev, receitas, despesas, saldo: receitas - despesas };
  });
}
