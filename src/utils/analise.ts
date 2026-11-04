import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type { Lancamento } from '../types';

/** Título ainda não liquidado (inclui vencidos). */
export const emAberto = (l: Lancamento) => l.status === 'pendente' || l.status === 'vencido';
export const liquidado = (l: Lancamento) => l.status === 'pago' || l.status === 'recebido';
const ativo = (l: Lancamento) => l.status !== 'cancelado';

const soma = (ls: Lancamento[]) => ls.reduce((a, l) => a + l.valor, 0);
const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);

/* ------------------------------------------------------------------ */
/* Aging (idade da carteira em aberto)                                  */
/* ------------------------------------------------------------------ */

export interface FaixaAging {
  id: string;
  label: string;
  valor: number;
  qtd: number;
  percentual: number;
  vencida: boolean;
}

const FAIXAS: { id: string; label: string; min: number; max: number; vencida: boolean }[] = [
  { id: 'v90', label: '+90 dias', min: -Infinity, max: -91, vencida: true },
  { id: 'v60', label: '61–90', min: -90, max: -61, vencida: true },
  { id: 'v30', label: '31–60', min: -60, max: -31, vencida: true },
  { id: 'v1', label: '1–30', min: -30, max: -1, vencida: true },
  { id: 'a7', label: 'Hoje–7d', min: 0, max: 7, vencida: false },
  { id: 'a30', label: '8–30d', min: 8, max: 30, vencida: false },
  { id: 'a60', label: '31–60d', min: 31, max: 60, vencida: false },
  { id: 'a61', label: '+60d', min: 61, max: Infinity, vencida: false },
];

/** Faixas ordenadas do mais atrasado ao mais distante no futuro. */
export function calcAging(itens: Lancamento[], hoje: Date = new Date()): FaixaAging[] {
  const base = startOfDay(hoje);
  const abertos = itens.filter(emAberto);
  const total = soma(abertos);
  return FAIXAS.map((f) => {
    const doGrupo = abertos.filter((l) => {
      const d = differenceInCalendarDays(parseISO(l.dataVencimento), base);
      return d >= f.min && d <= f.max;
    });
    const valor = soma(doGrupo);
    return { id: f.id, label: f.label, valor, qtd: doGrupo.length, percentual: pct(valor, total), vencida: f.vencida };
  });
}

/* ------------------------------------------------------------------ */
/* Série mensal: previsto x realizado                                   */
/* ------------------------------------------------------------------ */

export interface PontoMensal {
  competencia: string;
  mes: string; // jan, fev...
  previsto: number;
  realizado: number;
  aberto: number;
  vencido: number;
  taxaRealizacao: number;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function calcSerieMensal(itens: Lancamento[], ano: number): PontoMensal[] {
  return MESES.map((mes, i) => {
    const competencia = `${ano}-${String(i + 1).padStart(2, '0')}`;
    const doMes = itens.filter((l) => l.competencia === competencia && ativo(l));
    const previsto = soma(doMes);
    const realizado = soma(doMes.filter(liquidado));
    const aberto = soma(doMes.filter(emAberto));
    const vencido = soma(doMes.filter((l) => l.status === 'vencido'));
    return { competencia, mes, previsto, realizado, aberto, vencido, taxaRealizacao: pct(realizado, previsto) };
  });
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                          */
/* ------------------------------------------------------------------ */

export interface Indicadores {
  totalPrevisto: number;
  totalRealizado: number;
  totalAberto: number;
  totalVencido: number;
  qtdVencido: number;
  aVencer7: number;
  aVencer30: number;
  taxaRealizacao: number;
  /** vencido ÷ tudo que já deveria ter sido liquidado (vencimento ≤ hoje). */
  taxaInadimplencia: number;
  /** Prazo médio (dias) entre emissão e liquidação — PMP no pagar, PMR no receber. */
  prazoMedio: number | null;
  /** % de títulos liquidados até a data de vencimento. */
  pontualidade: number | null;
  /** Atraso médio (dias) dos títulos liquidados após o vencimento. */
  atrasoMedio: number | null;
  ticketMedio: number;
  atrasoMedioAberto: number | null;
}

export function calcIndicadores(itens: Lancamento[], hoje: Date = new Date()): Indicadores {
  const base = startOfDay(hoje);
  const validos = itens.filter(ativo);
  const abertos = validos.filter(emAberto);
  const liq = validos.filter(liquidado);
  const vencidos = validos.filter((l) => l.status === 'vencido');

  const totalPrevisto = soma(validos);
  const totalRealizado = soma(liq);

  const devidos = validos.filter((l) => differenceInCalendarDays(parseISO(l.dataVencimento), base) <= 0);

  const comPgto = liq.filter((l) => l.dataPagamento);
  const prazoMedio = comPgto.length
    ? comPgto.reduce((a, l) => a + differenceInCalendarDays(parseISO(l.dataPagamento!), parseISO(l.dataEmissao)), 0) /
      comPgto.length
    : null;
  const noPrazo = comPgto.filter((l) => l.dataPagamento! <= l.dataVencimento);
  const atrasados = comPgto.filter((l) => l.dataPagamento! > l.dataVencimento);
  const atrasoMedio = atrasados.length
    ? atrasados.reduce((a, l) => a + differenceInCalendarDays(parseISO(l.dataPagamento!), parseISO(l.dataVencimento)), 0) /
      atrasados.length
    : null;

  const janela = (dias: number) =>
    soma(
      abertos.filter((l) => {
        const d = differenceInCalendarDays(parseISO(l.dataVencimento), base);
        return d >= 0 && d <= dias;
      }),
    );

  return {
    totalPrevisto,
    totalRealizado,
    totalAberto: soma(abertos),
    totalVencido: soma(vencidos),
    qtdVencido: vencidos.length,
    aVencer7: janela(7),
    aVencer30: janela(30),
    taxaRealizacao: pct(totalRealizado, totalPrevisto),
    taxaInadimplencia: pct(soma(vencidos), soma(devidos)),
    prazoMedio,
    pontualidade: comPgto.length ? pct(noPrazo.length, comPgto.length) : null,
    atrasoMedio,
    ticketMedio: validos.length ? totalPrevisto / validos.length : 0,
    atrasoMedioAberto: vencidos.length
      ? vencidos.reduce((a, l) => a + Math.abs(differenceInCalendarDays(parseISO(l.dataVencimento), base)), 0) /
        vencidos.length
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Projeção de caixa semanal                                            */
/* ------------------------------------------------------------------ */

export interface SemanaProjecao {
  id: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
  acumulado: number;
}

/**
 * Projeção de caixa: coluna 0 = atrasados (já vencidos e não liquidados), depois N semanas
 * a partir de hoje. Parte de zero (o sistema não tem saldo bancário) — mostra o fluxo líquido acumulado.
 */
export function calcProjecaoSemanal(todos: Lancamento[], hoje: Date = new Date(), semanas = 8): SemanaProjecao[] {
  const base = startOfDay(hoje);
  const abertos = todos.filter(emAberto);
  const out: SemanaProjecao[] = [];
  let acumulado = 0;

  const montar = (id: string, label: string, grupo: Lancamento[]) => {
    const entradas = soma(grupo.filter((l) => l.tipo === 'credito'));
    const saidas = soma(grupo.filter((l) => l.tipo === 'debito'));
    acumulado += entradas - saidas;
    out.push({ id, label, entradas, saidas, saldo: entradas - saidas, acumulado });
  };

  montar(
    'atrasados',
    'Atrasados',
    abertos.filter((l) => differenceInCalendarDays(parseISO(l.dataVencimento), base) < 0),
  );

  for (let i = 0; i < semanas; i++) {
    const ini = addDays(base, i * 7);
    const fim = addDays(base, i * 7 + 6);
    const grupo = abertos.filter((l) => {
      const d = differenceInCalendarDays(parseISO(l.dataVencimento), base);
      return d >= i * 7 && d <= i * 7 + 6;
    });
    montar(`s${i}`, `${format(ini, 'dd/MM')}–${format(fim, 'dd/MM')}`, grupo);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rankings / concentração                                              */
/* ------------------------------------------------------------------ */

export interface ItemRanking {
  id: string;
  nome: string;
  valor: number;
  qtd: number;
  percentual: number;
  vencido: number;
}

/** Agrupa por chave; mantém os `top` maiores e junta o resto em "Outros". */
export function calcRanking(
  itens: Lancamento[],
  chave: (l: Lancamento) => { id: string; nome: string },
  top = 6,
): ItemRanking[] {
  const validos = itens.filter(ativo);
  const total = soma(validos);
  const mapa = new Map<string, ItemRanking>();
  for (const l of validos) {
    const { id, nome } = chave(l);
    const atual = mapa.get(id) ?? { id, nome, valor: 0, qtd: 0, percentual: 0, vencido: 0 };
    atual.valor += l.valor;
    atual.qtd += 1;
    if (l.status === 'vencido') atual.vencido += l.valor;
    mapa.set(id, atual);
  }
  const ordenado = Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
  const primeiros = ordenado.slice(0, top);
  const resto = ordenado.slice(top);
  if (resto.length) {
    primeiros.push({
      id: '__outros',
      nome: `Outros (${resto.length})`,
      valor: soma0(resto.map((r) => r.valor)),
      qtd: resto.reduce((a, r) => a + r.qtd, 0),
      percentual: 0,
      vencido: soma0(resto.map((r) => r.vencido)),
    });
  }
  return primeiros.map((r) => ({ ...r, percentual: pct(r.valor, total) }));
}

const soma0 = (v: number[]) => v.reduce((a, n) => a + n, 0);

/** Participação dos 3 maiores grupos (risco de concentração). */
export const concentracaoTop3 = (ranking: ItemRanking[]) =>
  ranking
    .filter((r) => r.id !== '__outros')
    .slice(0, 3)
    .reduce((a, r) => a + r.percentual, 0);

/** Maiores títulos em aberto, vencidos primeiro em empate de valor. */
export function maioresAbertos(itens: Lancamento[], n = 8): Lancamento[] {
  return itens
    .filter(emAberto)
    .sort((a, b) => b.valor - a.valor || a.dataVencimento.localeCompare(b.dataVencimento))
    .slice(0, n);
}

/** Variação percentual; null quando a base é zero. */
export const variacao = (atual: number, anterior: number): number | null =>
  anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;
