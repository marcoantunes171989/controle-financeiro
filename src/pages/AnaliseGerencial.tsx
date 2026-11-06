import { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Layers, Lightbulb } from 'lucide-react';
import { useLancamentos } from '../hooks/useLancamentos';
import { useEmpresas } from '../hooks/useEmpresas';
import { useCategorias } from '../hooks/useCategorias';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Select from '../components/ui/Select';
import {
  AgingChart,
  ChartCard,
  COR_PAGAR,
  COR_RECEBER,
  Destaque,
  Indicador,
  PrevistoRealizadoChart,
  ProjecaoChart,
  RankingBars,
  TabelaSimples,
} from '../components/analise/AnaliseComponentes';
import {
  calcAging,
  calcIndicadores,
  calcProjecaoSemanal,
  calcRanking,
  calcSerieMensal,
  concentracaoTop3,
  emAberto,
  maioresAbertos,
  type Indicadores,
} from '../utils/analise';
import { fmtData, fmtMoeda, fmtPercentual } from '../utils/format';
import { STATUS_LABEL } from '../hooks/useFiltrosLancamentos';
import type { Lancamento } from '../types';

const dias = (v: number | null) => (v === null ? '—' : `${v.toFixed(0)} dias`);
const pctOuTraco = (v: number | null) => (v === null ? '—' : fmtPercentual(v));

interface Alerta {
  nivel: 'critico' | 'atencao' | 'info';
  texto: string;
}

function gerarAlertas(pagar: Indicadores, receber: Indicadores, top3Pagar: number): Alerta[] {
  const a: Alerta[] = [];
  if (receber.totalVencido > 0)
    a.push({
      nivel: 'critico',
      texto: `${fmtMoeda(receber.totalVencido)} em recebíveis vencidos (${receber.qtdVencido} título(s), atraso médio de ${dias(receber.atrasoMedioAberto)}). Inadimplência de ${fmtPercentual(receber.taxaInadimplencia)} sobre o que já deveria ter sido recebido.`,
    });
  if (pagar.totalVencido > 0)
    a.push({
      nivel: 'critico',
      texto: `${fmtMoeda(pagar.totalVencido)} em contas a pagar vencidas (${pagar.qtdVencido} título(s)). Risco de multa, juros e restrição com fornecedores.`,
    });
  const saldo30 = receber.aVencer30 - pagar.aVencer30;
  if (pagar.aVencer30 > 0 || receber.aVencer30 > 0)
    a.push({
      nivel: saldo30 < 0 ? 'atencao' : 'info',
      texto:
        saldo30 < 0
          ? `Próximos 30 dias: saem ${fmtMoeda(pagar.aVencer30)} e entram ${fmtMoeda(receber.aVencer30)} — déficit de ${fmtMoeda(-saldo30)} a cobrir com caixa atual.`
          : `Próximos 30 dias: entram ${fmtMoeda(receber.aVencer30)} contra ${fmtMoeda(pagar.aVencer30)} de saídas — folga de ${fmtMoeda(saldo30)}.`,
    });
  if (receber.pontualidade !== null && receber.pontualidade < 70)
    a.push({
      nivel: 'atencao',
      texto: `Só ${fmtPercentual(receber.pontualidade)} dos recebimentos chegam no prazo (atraso médio de ${dias(receber.atrasoMedio)} nos demais). Vale rever política de cobrança e prazos concedidos.`,
    });
  if (receber.prazoMedio !== null && pagar.prazoMedio !== null && receber.prazoMedio > pagar.prazoMedio)
    a.push({
      nivel: 'atencao',
      texto: `Você recebe em ${dias(receber.prazoMedio)} e paga em ${dias(pagar.prazoMedio)}: o caixa financia o cliente. Negociar prazo com fornecedores ou antecipar recebíveis reduz a pressão.`,
    });
  if (top3Pagar > 80)
    a.push({
      nivel: 'info',
      texto: `As 3 maiores categorias concentram ${fmtPercentual(top3Pagar)} das despesas — onde o corte ou a renegociação rende mais.`,
    });
  return a;
}

const estiloAlerta: Record<Alerta['nivel'], string> = {
  critico: 'border-l-[#d03b3b]',
  atencao: 'border-l-[#fab219]',
  info: 'border-l-slate-300',
};

function PainelTipo({
  itens,
  tipo,
  ano,
  nomeCategoria,
  nomeEmpresa,
}: {
  itens: Lancamento[];
  tipo: 'debito' | 'credito';
  ano: number;
  nomeCategoria: (id: string) => string;
  nomeEmpresa: (id: string) => string;
}) {
  const pagar = tipo === 'debito';
  const cor = pagar ? COR_PAGAR : COR_RECEBER;
  const ind = useMemo(() => calcIndicadores(itens), [itens]);
  const aging = useMemo(() => calcAging(itens), [itens]);
  const serie = useMemo(() => calcSerieMensal(itens, ano), [itens, ano]);
  const porCategoria = useMemo(
    () => calcRanking(itens, (l) => ({ id: l.categoriaId, nome: nomeCategoria(l.categoriaId) })),
    [itens, nomeCategoria],
  );
  const porEmpresa = useMemo(
    () => calcRanking(itens, (l) => ({ id: l.empresaId, nome: nomeEmpresa(l.empresaId) })),
    [itens, nomeEmpresa],
  );
  const maiores = useMemo(() => maioresAbertos(itens), [itens]);
  const verbo = pagar ? 'pagamento' : 'recebimento';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] min-w-0">
        <Destaque
          rotulo={pagar ? 'A pagar em aberto' : 'A receber em aberto'}
          valor={fmtMoeda(ind.totalAberto)}
          apoio={`${itens.filter(emAberto).length} título(s) pendentes ou vencidos`}
          cor={cor}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
          <Indicador
            titulo="Vencido"
            valor={fmtMoeda(ind.totalVencido)}
            dica={`${ind.qtdVencido} título(s) · atraso médio ${dias(ind.atrasoMedioAberto)}`}
            critico={ind.totalVencido > 0}
          />
          <Indicador titulo="Vence em 7 dias" valor={fmtMoeda(ind.aVencer7)} />
          <Indicador titulo="Vence em 30 dias" valor={fmtMoeda(ind.aVencer30)} />
          <Indicador
            titulo={pagar ? 'Prazo médio de pagamento' : 'Prazo médio de recebimento'}
            valor={dias(ind.prazoMedio)}
            dica="Da emissão à liquidação, títulos já liquidados"
          />
          <Indicador
            titulo={pagar ? 'Pagos no prazo' : 'Recebidos no prazo'}
            valor={pctOuTraco(ind.pontualidade)}
            dica={ind.atrasoMedio === null ? `Nenhum ${verbo} em atraso` : `Atraso médio dos demais: ${dias(ind.atrasoMedio)}`}
          />
          <Indicador
            titulo={pagar ? 'Contas em atraso (% do devido)' : 'Taxa de inadimplência'}
            valor={fmtPercentual(ind.taxaInadimplencia)}
            dica="Vencido ÷ tudo que já venceu (inclui liquidado)"
            critico={ind.taxaInadimplencia >= 10}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AgingChart dados={aging} cor={cor} />
        <PrevistoRealizadoChart dados={serie} cor={cor} rotuloRealizado={pagar ? 'Pago' : 'Recebido'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RankingBars
          titulo="Por categoria"
          subtitulo={`Participação no total ${pagar ? 'a pagar' : 'a receber'} · top 3 = ${fmtPercentual(concentracaoTop3(porCategoria))}`}
          dados={porCategoria}
          cor={cor}
        />
        <RankingBars titulo="Por empresa" subtitulo="Participação no total" dados={porEmpresa} cor={cor} />
      </div>

      <ChartCard
        titulo="Maiores títulos em aberto"
        subtitulo="Onde está o dinheiro que depende de ação"
        grafico={
          maiores.length ? (
            <TabelaSimples
              colunas={['Descrição', 'Empresa', 'Vencimento', 'Status', 'Valor']}
              linhas={maiores.map((l) => [
                l.descricao,
                nomeEmpresa(l.empresaId),
                fmtData(l.dataVencimento),
                STATUS_LABEL[l.status] ?? l.status,
                fmtMoeda(l.valor),
              ])}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum título em aberto.</p>
          )
        }
        tabela={
          <TabelaSimples
            colunas={['Descrição', 'Vencimento', 'Valor']}
            linhas={maiores.map((l) => [l.descricao, fmtData(l.dataVencimento), fmtMoeda(l.valor)])}
          />
        }
      />
    </div>
  );
}

export default function AnaliseGerencial() {
  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();

  const [empresaId, setEmpresaId] = useState('');
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);

  const anos = useMemo(() => {
    const set = new Set<number>([anoAtual]);
    lancamentos.forEach((l) => set.add(Number(l.competencia.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [lancamentos, anoAtual]);

  const escopo = useMemo(
    () => lancamentos.filter((l) => !empresaId || l.empresaId === empresaId),
    [lancamentos, empresaId],
  );
  const pagarItens = useMemo(() => escopo.filter((l) => l.tipo === 'debito'), [escopo]);
  const receberItens = useMemo(() => escopo.filter((l) => l.tipo === 'credito'), [escopo]);

  const nomeCategoria = useMemo(() => {
    const m = new Map(categorias.map((c) => [c.id, c.nome]));
    return (id: string) => m.get(id) ?? 'Sem categoria';
  }, [categorias]);
  const nomeEmpresa = useMemo(() => {
    const m = new Map(empresas.map((e) => [e.id, e.nomeFantasia || e.razaoSocial]));
    return (id: string) => m.get(id) ?? 'Sem empresa';
  }, [empresas]);

  const indPagar = useMemo(() => calcIndicadores(pagarItens), [pagarItens]);
  const indReceber = useMemo(() => calcIndicadores(receberItens), [receberItens]);
  const projecao = useMemo(() => calcProjecaoSemanal(escopo), [escopo]);
  const top3Pagar = useMemo(
    () => concentracaoTop3(calcRanking(pagarItens, (l) => ({ id: l.categoriaId, nome: nomeCategoria(l.categoriaId) }))),
    [pagarItens, nomeCategoria],
  );
  const alertas = useMemo(() => gerarAlertas(indPagar, indReceber, top3Pagar), [indPagar, indReceber, top3Pagar]);

  const posicao = indReceber.totalAberto - indPagar.totalAberto;
  const cobertura = indPagar.aVencer30 > 0 ? indReceber.aVencer30 / indPagar.aVencer30 : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label="Empresa"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            placeholder="Todas as empresas"
            options={empresas.map((e) => ({ value: e.id, label: e.nomeFantasia || e.razaoSocial }))}
          />
        </div>
        <div className="w-32">
          <Select
            label="Ano (gráfico mensal)"
            value={String(ano)}
            onChange={(e) => setAno(Number(e.target.value))}
            options={anos.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </div>
        <p className="text-xs text-muted-foreground pb-2">
          Indicadores consideram toda a carteira da empresa; o ano filtra apenas o previsto × realizado.
        </p>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral"><Layers size={14} className="mr-1.5" />Visão geral</TabsTrigger>
          <TabsTrigger value="pagar"><ArrowDownCircle size={14} className="mr-1.5" />Contas a pagar</TabsTrigger>
          <TabsTrigger value="receber"><ArrowUpCircle size={14} className="mr-1.5" />Contas a receber</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] min-w-0">
            <Destaque
              rotulo="Posição líquida em aberto"
              valor={fmtMoeda(posicao)}
              apoio={`${fmtMoeda(indReceber.totalAberto)} a receber − ${fmtMoeda(indPagar.totalAberto)} a pagar`}
              cor={posicao >= 0 ? COR_RECEBER : COR_PAGAR}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
              <Indicador titulo="A receber em aberto" valor={fmtMoeda(indReceber.totalAberto)} dica={`Vencido: ${fmtMoeda(indReceber.totalVencido)}`} />
              <Indicador titulo="A pagar em aberto" valor={fmtMoeda(indPagar.totalAberto)} dica={`Vencido: ${fmtMoeda(indPagar.totalVencido)}`} />
              <Indicador
                titulo="Cobertura 30 dias"
                valor={cobertura === null ? '—' : `${cobertura.toFixed(2).replace('.', ',')}×`}
                dica="A receber ÷ a pagar nos próximos 30 dias. Abaixo de 1× há déficit."
                critico={cobertura !== null && cobertura < 1}
              />
              <Indicador titulo="Inadimplência (receber)" valor={fmtPercentual(indReceber.taxaInadimplencia)} critico={indReceber.taxaInadimplencia >= 10} />
              <Indicador titulo="Prazo médio de recebimento" valor={dias(indReceber.prazoMedio)} />
              <Indicador titulo="Prazo médio de pagamento" valor={dias(indPagar.prazoMedio)} />
            </div>
          </div>

          {alertas.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Lightbulb size={15} /> Pontos de atenção
              </h3>
              <ul className="space-y-2">
                {alertas.map((a, i) => (
                  <li key={i} className={`text-sm border-l-4 pl-3 py-1 ${estiloAlerta[a.nivel]}`}>
                    {a.texto}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProjecaoChart dados={projecao} />

          <div className="grid gap-5 xl:grid-cols-2">
            <AgingChart dados={calcAging(receberItens)} cor={COR_RECEBER} />
            <AgingChart dados={calcAging(pagarItens)} cor={COR_PAGAR} />
          </div>
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <PainelTipo itens={pagarItens} tipo="debito" ano={ano} nomeCategoria={nomeCategoria} nomeEmpresa={nomeEmpresa} />
        </TabsContent>
        <TabsContent value="receber" className="mt-4">
          <PainelTipo itens={receberItens} tipo="credito" ano={ano} nomeCategoria={nomeCategoria} nomeEmpresa={nomeEmpresa} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
