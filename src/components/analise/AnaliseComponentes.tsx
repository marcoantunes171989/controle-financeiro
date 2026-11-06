import { useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Table2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoeda, fmtPercentual } from '../../utils/format';
import { TYPOGRAPHY } from '../../styles/typography';
import type { FaixaAging, ItemRanking, PontoMensal, SemanaProjecao } from '../../utils/analise';

/** Paleta categórica validada (scripts/validate_palette.js): azul = receber, laranja = pagar. */
export const COR_RECEBER = '#2a78d6';
export const COR_PAGAR = '#eb6834';
const COR_BASE = '#cbd5e1'; // previsto / referência (neutro)
const COR_TINTA = '#334155'; // linha de saldo acumulado (tinta, não série colorida)
const COR_CRITICO = '#d03b3b'; // status reservado: crítico
const GRADE = '#e2e8f0';

const fmtK = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 1000 ? `${(a / 1000).toFixed(0)}k` : String(a);
  return v < 0 ? `-${s}` : s;
};

/* ---------------- Cartão com alternância Gráfico / Tabela ---------------- */

export function ChartCard({
  titulo,
  subtitulo,
  grafico,
  tabela,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  grafico: ReactNode;
  tabela: ReactNode;
  className?: string;
}) {
  const [modo, setModo] = useState<'grafico' | 'tabela'>('grafico');
  const btn = (m: 'grafico' | 'tabela', icon: ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setModo(m)}
      aria-pressed={modo === m}
      aria-label={label}
      title={label}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        modo === m ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
  return (
    <section className={cn('rounded-xl border bg-card shadow-sm min-w-0', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3 className={TYPOGRAPHY.cardTitle}>{titulo}</h3>
          {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
        </div>
        <div className="flex gap-0.5 shrink-0">
          {btn('grafico', <BarChart3 size={14} />, 'Ver gráfico')}
          {btn('tabela', <Table2 size={14} />, 'Ver tabela')}
        </div>
      </header>
      <div className="p-5 pt-3">{modo === 'grafico' ? grafico : tabela}</div>
    </section>
  );
}

export function TabelaSimples({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto max-h-64">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            {colunas.map((c, i) => (
              <th key={c} className={cn('py-1.5 font-medium', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b last:border-0">
              {l.map((c, j) => (
                <td key={j} className={cn('py-1.5 tabular-nums', j > 0 && 'text-right')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Tooltip ---------------- */

function Dica({ active, payload, label, extra }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="tabular-nums font-medium text-slate-800">{fmtMoeda(p.value)}</span>
        </div>
      ))}
      {extra?.(payload[0]?.payload)}
    </div>
  );
}

const eixo = { fontSize: 11, fill: '#64748b' };

/* ---------------- Aging ---------------- */

export function AgingChart({ dados, cor }: { dados: FaixaAging[]; cor: string }) {
  const temDado = dados.some((d) => d.valor > 0);
  const idxCorte = dados.findIndex((d) => !d.vencida);
  return (
      <ChartCard
        titulo="Aging da carteira em aberto"
        subtitulo="Idade por faixa de vencimento: à esquerda o que já venceu, à direita o que vence."
        grafico={
          temDado ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barSize={24}>
                <CartesianGrid vertical={false} stroke={GRADE} />
                <XAxis dataKey="label" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={eixo} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  content={
                    <Dica
                      extra={(d: FaixaAging) => (
                        <p className="text-slate-500 mt-1.5">
                          {d.qtd} título(s) · {fmtPercentual(d.percentual)} da carteira
                        </p>
                      )}
                    />
                  }
                />
                {idxCorte > 0 && <ReferenceLine x={dados[idxCorte].label} stroke="#94a3b8" strokeDasharray="4 3" />}
                <Bar dataKey="valor" name="Em aberto" fill={cor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Vazio texto="Nenhum título em aberto." />
          )
        }
        tabela={
          <TabelaSimples
            colunas={['Faixa', 'Valor', 'Títulos', '% carteira']}
            linhas={dados.map((d) => [
              `${d.vencida ? 'Vencido ' : 'A vencer '}${d.label}`,
              fmtMoeda(d.valor),
              d.qtd,
              fmtPercentual(d.percentual),
            ])}
          />
        }
      />
  );
}

/* ---------------- Previsto x Realizado ---------------- */

export function PrevistoRealizadoChart({
  dados,
  cor,
  rotuloRealizado,
}: {
  dados: PontoMensal[];
  cor: string;
  rotuloRealizado: string;
}) {
  const temDado = dados.some((d) => d.previsto > 0);
  return (
    <ChartCard
      titulo="Previsto × realizado por mês"
      subtitulo="Por competência, descontados os cancelados."
      grafico={
        temDado ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRADE} />
              <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={eixo} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                content={
                  <Dica
                    extra={(d: PontoMensal) => (
                      <p className="text-slate-500 mt-1.5">Realização: {fmtPercentual(d.taxaRealizacao)}</p>
                    )}
                  />
                }
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="previsto" name="Previsto" fill={COR_BASE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name={rotuloRealizado} fill={cor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Vazio texto="Sem lançamentos neste ano." />
        )
      }
      tabela={
        <TabelaSimples
          colunas={['Mês', 'Previsto', rotuloRealizado, 'Em aberto', 'Vencido', 'Realização']}
          linhas={dados.map((d) => [
            d.mes,
            fmtMoeda(d.previsto),
            fmtMoeda(d.realizado),
            fmtMoeda(d.aberto),
            fmtMoeda(d.vencido),
            fmtPercentual(d.taxaRealizacao),
          ])}
        />
      }
    />
  );
}

/* ---------------- Projeção de caixa ---------------- */

export function ProjecaoChart({ dados }: { dados: SemanaProjecao[] }) {
  const temDado = dados.some((d) => d.entradas > 0 || d.saidas > 0);
  return (
    <ChartCard
      titulo="Projeção de caixa — próximas 8 semanas"
      subtitulo="Só títulos em aberto. Parte de zero: o sistema não tem saldo bancário, então a linha mostra o resultado líquido acumulado."
      grafico={
        temDado ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRADE} />
              <XAxis dataKey="label" tick={{ ...eixo, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tickFormatter={fmtK} tick={eixo} axisLine={false} tickLine={false} width={44} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<Dica />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="entradas" name="A receber" fill={COR_RECEBER} radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="A pagar" fill={COR_PAGAR} radius={[4, 4, 0, 0]} />
              <Line
                dataKey="acumulado"
                name="Resultado acumulado"
                stroke={COR_TINTA}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: '#fcfcfb', fill: COR_TINTA }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Vazio texto="Nenhum título em aberto para projetar." />
        )
      }
      tabela={
        <TabelaSimples
          colunas={['Período', 'A receber', 'A pagar', 'Saldo', 'Acumulado']}
          linhas={dados.map((d) => [d.label, fmtMoeda(d.entradas), fmtMoeda(d.saidas), fmtMoeda(d.saldo), fmtMoeda(d.acumulado)])}
        />
      }
    />
  );
}

/* ---------------- Ranking (barras horizontais em HTML) ---------------- */

export function RankingBars({
  titulo,
  subtitulo,
  dados,
  cor,
}: {
  titulo: string;
  subtitulo?: string;
  dados: ItemRanking[];
  cor: string;
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={subtitulo}
      grafico={
        dados.length ? (
          <ul className="space-y-3">
            {dados.map((d) => (
              <li key={d.id} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                  <span className="truncate min-w-0 font-medium" title={d.nome}>
                    {d.nome}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {fmtMoeda(d.valor)} · {fmtPercentual(d.percentual)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.valor / max) * 100}%`, background: d.id === '__outros' ? COR_BASE : cor }}
                  />
                </div>
                {d.vencido > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: COR_CRITICO }}>
                    <AlertTriangle size={11} /> {fmtMoeda(d.vencido)} vencido
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Vazio texto="Sem dados no período." />
        )
      }
      tabela={
        <TabelaSimples
          colunas={['Grupo', 'Valor', 'Títulos', '%', 'Vencido']}
          linhas={dados.map((d) => [d.nome, fmtMoeda(d.valor), d.qtd, fmtPercentual(d.percentual), fmtMoeda(d.vencido)])}
        />
      }
    />
  );
}

/* ---------------- Indicador (tile) ---------------- */

export function Indicador({
  titulo,
  valor,
  dica,
  critico,
}: {
  titulo: string;
  valor: string;
  dica?: string;
  critico?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
      <p className={TYPOGRAPHY.label}>{titulo}</p>
      <p
        className={cn(TYPOGRAPHY.valueMd, 'mt-1.5 flex items-center gap-1.5')}
        style={critico ? { color: COR_CRITICO } : undefined}
      >
        {critico && <AlertTriangle size={15} className="shrink-0" aria-label="Atenção" />}
        {valor}
      </p>
      {dica && <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{dica}</p>}
    </div>
  );
}

/** Número de destaque da visão (um por aba). */
export function Destaque({ rotulo, valor, apoio, cor }: { rotulo: string; valor: string; apoio: string; cor: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-center min-w-0">
      <p className={cn(TYPOGRAPHY.label, 'flex items-center gap-2')}>
        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cor }} />
        {rotulo}
      </p>
      <p className={cn(TYPOGRAPHY.valueLg, 'mt-2')}>{valor}</p>
      <p className="mt-2 text-xs text-muted-foreground">{apoio}</p>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">{texto}</div>;
}
