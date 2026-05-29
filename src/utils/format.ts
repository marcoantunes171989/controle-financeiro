import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtData = (d: string) =>
  format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR });

export const fmtDataHora = (d: string) =>
  format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export const fmtMesAno = (competencia: string) => {
  const [ano, mes] = competencia.split('-');
  return format(new Date(Number(ano), Number(mes) - 1, 1), 'MMMM yyyy', { locale: ptBR });
};

export const fmtPercentual = (v: number) => `${v.toFixed(1)}%`;

export const competenciaAtual = () =>
  format(new Date(), 'yyyy-MM');

export const COR_RECEITA = '#1D9E75';
export const COR_DESPESA = '#EF4444';

export const corTipo = (tipo: string) =>
  tipo === 'credito' ? COR_RECEITA : COR_DESPESA;

export const bgTipo = (tipo: string) =>
  tipo === 'credito' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
