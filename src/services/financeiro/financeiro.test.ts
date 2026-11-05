// Suíte do núcleo financeiro compartilhado (Microgate 04.4).
// Dados exclusivamente sintéticos — nenhum acesso a Supabase ou rede.
import type { Lancamento } from '../../types';
import { paraCentavos, somarCentavos, centavosParaNumber } from './dinheiro';
import {
  calcularReceitasRealizadas,
  calcularDespesasRealizadas,
  calcularResultadoCaixa,
  identificarRealizadosSemDataPagamento,
} from './regimeCaixa';
import {
  calcularReceitasPrevistas,
  calcularDespesasPrevistas,
  calcularContasReceber,
  calcularContasPagar,
  calcularTitulosVencidos,
} from './previsao';
import {
  calcularReceitasPorCompetencia,
  calcularDespesasPorCompetencia,
  calcularResultadoPorCompetencia,
  calcularEvolucaoMensal,
} from './competencia';
import {
  calcularDespesasCategoria,
  calcularResultadoEmpresa,
  calcularVariacaoPercentual,
  calcularMargemFinanceira,
  calcularConcentracaoDespesas,
  calcularInadimplenciaRecebiveis,
} from './indicadores';
import { gerarRelatorioInconsistencias } from './inconsistencias';

let seq = 0;
function lancamento(overrides: Partial<Lancamento> = {}): Lancamento {
  seq += 1;
  return {
    id: overrides.id ?? `l${seq}`,
    tipo: 'credito',
    descricao: 'sintético',
    empresaId: 'empresa-1',
    categoriaId: 'categoria-1',
    valor: 100,
    valorTotal: 100,
    dataEmissao: '2026-01-01',
    dataVencimento: '2026-01-10',
    status: 'pendente',
    tipoRecorrencia: 'avista',
    anexos: [],
    competencia: '2026-01',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const periodoJaneiro = { inicio: '2026-01-01', fim: '2026-01-31' };

describe('01-08: regime de caixa', () => {
  it('01 receita recebida entra nas receitas realizadas', () => {
    const l = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-15', valor: 100 });
    const r = calcularReceitasRealizadas([l], periodoJaneiro);
    expect(r.totalCentavos).toBe(10000);
    expect(r.quantidade).toBe(1);
  });

  it('02 receita pendente é excluída das receitas realizadas', () => {
    const l = lancamento({ tipo: 'credito', status: 'pendente' });
    const r = calcularReceitasRealizadas([l], periodoJaneiro);
    expect(r.quantidade).toBe(0);
  });

  it('03 receita vencida é excluída das receitas realizadas', () => {
    const l = lancamento({ tipo: 'credito', status: 'vencido' });
    const r = calcularReceitasRealizadas([l], periodoJaneiro);
    expect(r.quantidade).toBe(0);
  });

  it('04 receita cancelada é excluída das receitas realizadas', () => {
    const l = lancamento({ tipo: 'credito', status: 'cancelado' });
    const r = calcularReceitasRealizadas([l], periodoJaneiro);
    expect(r.quantidade).toBe(0);
  });

  it('05 despesa paga entra nas despesas realizadas', () => {
    const l = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-20', valor: 50 });
    const r = calcularDespesasRealizadas([l], periodoJaneiro);
    expect(r.totalCentavos).toBe(5000);
  });

  it('06 despesa pendente é excluída das despesas realizadas', () => {
    const l = lancamento({ tipo: 'debito', status: 'pendente' });
    expect(calcularDespesasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
  });

  it('07 despesa vencida é excluída das despesas realizadas', () => {
    const l = lancamento({ tipo: 'debito', status: 'vencido' });
    expect(calcularDespesasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
  });

  it('08 despesa cancelada é excluída das despesas realizadas', () => {
    const l = lancamento({ tipo: 'debito', status: 'cancelado' });
    expect(calcularDespesasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
  });

  it('09 pagamento em outro mês não entra no período consultado', () => {
    const l = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-02-05', valor: 50 });
    expect(calcularDespesasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
  });

  it('10 recebimento em outro mês não entra no período consultado', () => {
    const l = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2025-12-20', valor: 50 });
    expect(calcularReceitasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
  });

  it('11 realizado sem dataPagamento é sinalizado como inconsistente e excluído dos totais', () => {
    const l = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: undefined, valor: 100 });
    expect(calcularReceitasRealizadas([l], periodoJaneiro).quantidade).toBe(0);
    const inconsistentes = identificarRealizadosSemDataPagamento([l]);
    expect(inconsistentes).toEqual([{ lancamentoId: l.id, tipo: 'credito', status: 'recebido' }]);
  });

  it('18/19 resultado de caixa negativo e positivo', () => {
    const receita = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', valor: 100 });
    const despesaGrande = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', valor: 300 });
    const negativo = calcularResultadoCaixa([receita, despesaGrande], periodoJaneiro);
    expect(negativo.resultadoCentavos).toBe(-20000);

    const despesaPequena = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', valor: 30 });
    const positivo = calcularResultadoCaixa([receita, despesaPequena], periodoJaneiro);
    expect(positivo.resultadoCentavos).toBe(7000);
  });

  it('20 mês sem lançamentos retorna totais zerados', () => {
    const r = calcularResultadoCaixa([], periodoJaneiro);
    expect(r.resultadoCentavos).toBe(0);
    expect(r.receitasRealizadas.quantidade).toBe(0);
  });

  it('22 título vencendo exatamente na data de referência não é tratado como vencido', () => {
    const l = lancamento({ tipo: 'credito', status: 'pendente', dataVencimento: '2026-01-10' });
    const previsao = calcularReceitasPrevistas([l], '2026-01-10');
    expect(previsao.aVencer.quantidade).toBe(1);
    expect(previsao.vencidasEmAberto.quantidade).toBe(0);
  });
});

describe('previsão financeira', () => {
  it('títulos a vencer e vencidos são corretamente separados; cancelados são excluídos', () => {
    const aVencer = lancamento({ tipo: 'debito', status: 'pendente', dataVencimento: '2026-02-01', valor: 100 });
    const vencido = lancamento({ tipo: 'debito', status: 'vencido', dataVencimento: '2026-01-01', valor: 50 });
    const cancelado = lancamento({ tipo: 'debito', status: 'cancelado', dataVencimento: '2026-01-01', valor: 999 });
    const previsao = calcularDespesasPrevistas([aVencer, vencido, cancelado], '2026-01-15');
    expect(previsao.aVencer.totalCentavos).toBe(10000);
    expect(previsao.vencidasEmAberto.totalCentavos).toBe(5000);
    expect(previsao.total.totalCentavos).toBe(15000);
  });

  it('contas a receber e a pagar somam apenas títulos em aberto', () => {
    const credAberto = lancamento({ tipo: 'credito', status: 'pendente', valor: 100 });
    const credRecebido = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', valor: 999 });
    const debAberto = lancamento({ tipo: 'debito', status: 'vencido', valor: 40 });
    const r = calcularContasReceber([credAberto, credRecebido]);
    const p = calcularContasPagar([debAberto]);
    expect(r.totalCentavos).toBe(10000);
    expect(p.totalCentavos).toBe(4000);
  });

  it('títulos vencidos são reportados separadamente por tipo', () => {
    const credVencido = lancamento({ tipo: 'credito', status: 'vencido', dataVencimento: '2026-01-01', valor: 10 });
    const debVencido = lancamento({ tipo: 'debito', status: 'vencido', dataVencimento: '2026-01-01', valor: 20 });
    const r = calcularTitulosVencidos([credVencido, debVencido], '2026-01-15');
    expect(r.receitasVencidas.totalCentavos).toBe(1000);
    expect(r.despesasVencidas.totalCentavos).toBe(2000);
  });
});

describe('12: competência inválida', () => {
  it('registro com competência fora do formato YYYY-MM é identificado e excluído dos totais', () => {
    const invalido = lancamento({ tipo: 'credito', status: 'pendente', competencia: '2026-13' });
    const r = calcularReceitasPorCompetencia([invalido], '2026-13');
    expect(r.competenciasInvalidas).toEqual([{ lancamentoId: invalido.id, competencia: '2026-13' }]);
    expect(r.quantidade).toBe(0);
  });

  it('competência válida é computada corretamente, excluindo cancelados', () => {
    const valido = lancamento({ tipo: 'debito', status: 'pago', competencia: '2026-01', valor: 70 });
    const cancelado = lancamento({ tipo: 'debito', status: 'cancelado', competencia: '2026-01', valor: 999 });
    const r = calcularDespesasPorCompetencia([valido, cancelado], '2026-01');
    expect(r.totalCentavos).toBe(7000);
  });

  it('resultado por competência = receitas - despesas da mesma competência', () => {
    const receita = lancamento({ tipo: 'credito', status: 'pendente', competencia: '2026-01', valor: 100 });
    const despesa = lancamento({ tipo: 'debito', status: 'pendente', competencia: '2026-01', valor: 40 });
    const r = calcularResultadoPorCompetencia([receita, despesa], '2026-01');
    expect(r.resultadoCentavos).toBe(6000);
  });
});

describe('13: parcelamento de três vezes', () => {
  it('cada parcela é somada pelo seu valor individual, nunca pelo valorTotal repetido', () => {
    const parcelas = [1, 2, 3].map((n) =>
      lancamento({
        tipo: 'debito',
        status: 'pago',
        dataPagamento: `2026-0${n}-10`,
        valor: 100,
        valorTotal: 300,
        tipoRecorrencia: 'parcelas',
        numeroParcelas: 3,
        parcelaAtual: n,
        competencia: `2026-0${n}`,
      }),
    );
    const janeiro = calcularDespesasRealizadas(parcelas, { inicio: '2026-01-01', fim: '2026-01-31' });
    expect(janeiro.totalCentavos).toBe(10000);

    const todas = calcularDespesasRealizadas(parcelas, { inicio: '2026-01-01', fim: '2026-03-31' });
    expect(todas.totalCentavos).toBe(30000);
  });
});

describe('14-17: empresas e categorias', () => {
  const empresaA = 'empresa-A';
  const empresaB = 'empresa-B';

  it('14/15 filtro individual por empresa isola os lançamentos daquela empresa', () => {
    const lA = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', empresaId: empresaA, valor: 100 });
    const lB = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', empresaId: empresaB, valor: 200 });
    const r = calcularReceitasRealizadas([lA, lB], periodoJaneiro, { empresaId: empresaA });
    expect(r.totalCentavos).toBe(10000);
  });

  it('16 consolidação sem filtro soma lançamentos de todas as empresas fornecidas', () => {
    const lA = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', empresaId: empresaA, valor: 100 });
    const lB = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', empresaId: empresaB, valor: 200 });
    const r = calcularReceitasRealizadas([lA, lB], periodoJaneiro);
    expect(r.totalCentavos).toBe(30000);
  });

  it('17 filtro de categoria isola apenas a categoria informada', () => {
    const l1 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', categoriaId: 'cat-1', valor: 10 });
    const l2 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', categoriaId: 'cat-2', valor: 20 });
    const r = calcularDespesasRealizadas([l1, l2], periodoJaneiro, { categoriaId: 'cat-1' });
    expect(r.totalCentavos).toBe(1000);
  });

  it('calcularResultadoEmpresa reporta resultado individual e consolidado', () => {
    const lA = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', empresaId: empresaA, valor: 100 });
    const lB = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', empresaId: empresaB, valor: 40 });
    const r = calcularResultadoEmpresa([lA, lB], periodoJaneiro);
    const a = r.porEmpresa.find((e) => e.empresaId === empresaA)!;
    const b = r.porEmpresa.find((e) => e.empresaId === empresaB)!;
    expect(a.resultadoCentavos).toBe(10000);
    expect(b.resultadoCentavos).toBe(-4000);
    expect(r.consolidado.resultadoCentavos).toBe(6000);
  });
});

describe('21: virada de ano', () => {
  it('evolução mensal atravessa dezembro/2025 para janeiro/2026 corretamente', () => {
    const dez = lancamento({ tipo: 'credito', status: 'pendente', competencia: '2025-12', valor: 50 });
    const jan = lancamento({ tipo: 'credito', status: 'pendente', competencia: '2026-01', valor: 70 });
    const evolucao = calcularEvolucaoMensal([dez, jan], '2025-12', '2026-01');
    expect(evolucao.map((p) => p.competencia)).toEqual(['2025-12', '2026-01']);
    expect(evolucao[0].receitas.totalCentavos).toBe(5000);
    expect(evolucao[1].receitas.totalCentavos).toBe(7000);
  });
});

describe('23-25, 29: exatidão monetária', () => {
  it('23 arredondamento monetário: string com duas casas é convertida exatamente', () => {
    const r = paraCentavos('19.99');
    expect(r).toEqual({ valido: true, centavos: 1999 });
  });

  it('24 soma de muitos lançamentos permanece exata em centavos (sem soma em float)', () => {
    const lancamentos = Array.from({ length: 1000 }, () =>
      lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', valor: 0.1 }),
    );
    const r = calcularReceitasRealizadas(lancamentos, periodoJaneiro);
    expect(r.totalCentavos).toBe(10000);
    expect(centavosParaNumber(r.totalCentavos)).toBe(100);
  });

  it('25 valores extremos acima do limite seguro são rejeitados, não truncados', () => {
    const r = paraCentavos('999999999999999999.99');
    expect(r.valido).toBe(false);
  });

  it('29 exatidão em centavos: soma de centavos nunca usa ponto flutuante', () => {
    expect(somarCentavos([1999, 2001, 1])).toBe(4001);
  });
});

describe('26: percentual com denominador zero', () => {
  it('variação percentual com base zero retorna não calculável', () => {
    expect(calcularVariacaoPercentual(0, 500)).toEqual({ calculavel: false, motivo: 'denominador_zero' });
  });

  it('margem financeira sem receitas retorna não calculável', () => {
    const l = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', valor: 50 });
    expect(calcularMargemFinanceira([l], periodoJaneiro)).toEqual({ calculavel: false, motivo: 'denominador_zero' });
  });

  it('inadimplência sem contas a receber retorna não calculável', () => {
    expect(calcularInadimplenciaRecebiveis([], '2026-01-15')).toEqual({ calculavel: false, motivo: 'denominador_zero' });
  });
});

describe('27: categorias sem classificação', () => {
  it('lançamentos sem categoriaId reconhecida ainda são agrupados por seu identificador', () => {
    const l = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', categoriaId: '', valor: 30 });
    const r = calcularDespesasCategoria([l], periodoJaneiro);
    expect(r.porCategoria).toEqual([{ categoriaId: '', resultado: { totalCentavos: 3000, total: 30, quantidade: 1 } }]);
  });
});

describe('28: registros inconsistentes', () => {
  it('relatório de inconsistências não oculta nenhum registro inválido', () => {
    const valorInvalido = lancamento({ valor: NaN });
    const competenciaInvalida = lancamento({ competencia: 'abc' });
    const semDataPagamento = lancamento({ status: 'pago', dataPagamento: undefined });
    const relatorio = gerarRelatorioInconsistencias([valorInvalido, competenciaInvalida, semDataPagamento]);
    expect(relatorio.valoresInvalidos).toHaveLength(1);
    expect(relatorio.competenciasInvalidas).toHaveLength(1);
    expect(relatorio.realizadosSemDataPagamento).toHaveLength(1);
  });
});

describe('30: reconciliação entre indicadores', () => {
  it('soma de despesas por categoria == total de despesas do mesmo período/filtros', () => {
    const cat1 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', categoriaId: 'cat-1', valor: 30 });
    const cat2 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', categoriaId: 'cat-2', valor: 70 });
    const r = calcularDespesasCategoria([cat1, cat2], periodoJaneiro);
    const somaCategorias = r.porCategoria.reduce((acc, c) => acc + c.resultado.totalCentavos, 0);
    expect(somaCategorias).toBe(r.total.totalCentavos);
    expect(r.total.totalCentavos).toBe(calcularDespesasRealizadas([cat1, cat2], periodoJaneiro).totalCentavos);
  });

  it('receitas realizadas - despesas realizadas == resultado de caixa', () => {
    const receita = lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', valor: 500 });
    const despesa = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', valor: 120 });
    const resultado = calcularResultadoCaixa([receita, despesa], periodoJaneiro);
    expect(resultado.resultadoCentavos).toBe(
      resultado.receitasRealizadas.totalCentavos - resultado.despesasRealizadas.totalCentavos,
    );
  });

  it('concentração de despesas soma 100% quando todas as categorias são consideradas', () => {
    const cat1 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', categoriaId: 'cat-1', valor: 25 });
    const cat2 = lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', categoriaId: 'cat-2', valor: 75 });
    const concentracao = calcularConcentracaoDespesas([cat1, cat2], periodoJaneiro);
    const somaPercentuais = concentracao.reduce(
      (acc, c) => acc + (c.percentual.calculavel ? c.percentual.percentual : 0),
      0,
    );
    expect(somaPercentuais).toBeCloseTo(100, 10);
  });
});
