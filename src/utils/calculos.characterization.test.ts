// Suíte de caracterização financeira (Microgate 04.3).
//
// IMPORTANTE: testes de caracterização documentam o comportamento ATUAL
// de src/utils/calculos.ts. Eles NÃO afirmam que o comportamento é
// financeiramente correto. Nenhuma fórmula de produção é alterada aqui.
//
// Cada bloco de asserção é marcado com uma das tags:
//   LEGACY_BEHAVIOR            — comportamento atual, sem julgamento de correção.
//   EXPECTED_FINANCIAL_BEHAVIOR — comportamento atual que também é o esperado.
//   KNOWN_DEFECT                — comportamento atual é financeiramente incorreto
//                                  ou inconsistente; registrado, não corrigido.
//
// Relógio determinístico: "hoje" é fixado em 2026-06-15T12:00:00 (hora local)
// via jest fake timers, para que os testes nunca dependam da data real de
// execução da suíte.
import {
  calcularParcelasValor,
  calcularTotalParcelado,
  calcularSaldo,
  calcularPercentual,
  isVencido,
  diasParaVencer,
  calcKpis,
  calcFluxoMensal,
} from './calculos';
import type { Lancamento } from '../types';

const HOJE_FIXO = new Date(2026, 5, 15, 12, 0, 0); // 15/06/2026 12:00 local

function criarLancamento(overrides: Partial<Lancamento> & Pick<Lancamento, 'id'>): Lancamento {
  return {
    tipo: 'credito',
    descricao: 'Lançamento de teste',
    empresaId: 'empresa-a',
    categoriaId: 'categoria-a',
    valor: 0,
    valorTotal: 0,
    dataEmissao: '2026-06-01',
    dataVencimento: '2026-06-01',
    status: 'pendente',
    tipoRecorrencia: 'avista',
    anexos: [],
    competencia: '2026-06',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Precisão monetária (caracterização — Seção 07)', () => {
  // Nenhuma fórmula monetária usa representação exata (ex.: inteiros em
  // centavos ou biblioteca decimal). As somas usam `number` (IEEE-754)
  // diretamente, herdando as imprecisões clássicas de ponto flutuante.

  it('0,10 + 0,20 não resulta em 0,30 exato — LEGACY_BEHAVIOR / KNOWN_DEFECT', () => {
    const resultado = 0.1 + 0.2;
    expect(resultado).not.toBe(0.3);
    expect(resultado).toBeCloseTo(0.3, 10);
    expect(resultado).toBe(0.30000000000000004);
  });

  it('1.999,99 + 0,01 resulta em 2000 exato neste caso — LEGACY_BEHAVIOR', () => {
    expect(1999.99 + 0.01).toBe(2000);
  });

  it('10.000,01 - 0,01 resulta em 10000 exato neste caso — LEGACY_BEHAVIOR', () => {
    expect(10000.01 - 0.01).toBe(10000);
  });

  it('calcularSaldo não corrige imprecisão de ponto flutuante — KNOWN_DEFECT', () => {
    // receitas = 0.10, despesas = -0.20 (equivalente a soma 0.10 + 0.20)
    const saldo = calcularSaldo(0.1, -0.2);
    expect(saldo).toBe(0.30000000000000004);
  });

  it('calcularParcelasValor(300, 3) divide exatamente — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(calcularParcelasValor(300, 3)).toBe(100);
  });

  it('calcularParcelasValor com total não divisível gera dízima de ponto flutuante — LEGACY_BEHAVIOR', () => {
    const parcela = calcularParcelasValor(100, 3);
    // A parcela em si carrega uma dízima de ponto flutuante, e cada parcela
    // seria exibida/gravada com essa imprecisão caso não seja arredondada
    // antes da apresentação.
    expect(parcela).toBe(33.333333333333336);
    // Neste caso específico, a imprecisão de ponto flutuante acaba se
    // cancelando ao multiplicar de volta por 3, reconstituindo o valor
    // exato — mas isso não é garantido pela função para todo par
    // (valorTotal, nParcelas); é uma coincidência de representação, não
    // uma propriedade assegurada pelo código.
    expect(calcularTotalParcelado(parcela, 3)).toBe(100);
  });

  it('calcularParcelasValor com nParcelas = 0 retorna 0 em vez de lançar erro de divisão — LEGACY_BEHAVIOR', () => {
    expect(calcularParcelasValor(500, 0)).toBe(0);
  });

  it('calcularSaldo aceita valores negativos sem validação — LEGACY_BEHAVIOR', () => {
    expect(calcularSaldo(-100, 50)).toBe(-150);
  });

  it('calcularPercentual com total = 0 retorna 0 em vez de NaN/Infinity — LEGACY_BEHAVIOR', () => {
    expect(calcularPercentual(100, 0)).toBe(0);
  });

  it('calcularPercentual com valor negativo não é bloqueado — LEGACY_BEHAVIOR', () => {
    expect(calcularPercentual(-50, 100)).toBe(-50);
  });
});

describe('Controle de datas — isVencido / diasParaVencer (caracterização — Seção 06)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOJE_FIXO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('vencimento anterior à data atual é vencido — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(isVencido('2026-06-14')).toBe(true);
  });

  it('vencimento igual à data atual NÃO é considerado vencido — LEGACY_BEHAVIOR', () => {
    // isBefore(hoje, hoje) é false: o dia do vencimento ainda não é tratado
    // como vencido pela função.
    expect(isVencido('2026-06-15')).toBe(false);
  });

  it('vencimento futuro não é vencido — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(isVencido('2026-06-16')).toBe(false);
  });

  it('diasParaVencer retorna 0 no dia do vencimento — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(diasParaVencer('2026-06-15')).toBe(0);
  });

  it('diasParaVencer retorna negativo para vencimento já passado — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(diasParaVencer('2026-06-10')).toBe(-5);
  });

  it('diasParaVencer retorna positivo para vencimento futuro — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    expect(diasParaVencer('2026-06-20')).toBe(5);
  });

  it('diasParaVencer atravessa virada de mês corretamente — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    jest.setSystemTime(new Date(2026, 5, 30, 12, 0, 0)); // 30/06/2026
    expect(diasParaVencer('2026-07-01')).toBe(1);
    expect(isVencido('2026-07-01')).toBe(false);
  });

  it('diasParaVencer atravessa virada de ano corretamente — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    jest.setSystemTime(new Date(2026, 11, 31, 12, 0, 0)); // 31/12/2026
    expect(diasParaVencer('2027-01-01')).toBe(1);
    expect(isVencido('2027-01-01')).toBe(false);
    expect(isVencido('2026-12-30')).toBe(true);
  });
});

describe('calcKpis — caracterização financeira (Seção 05)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOJE_FIXO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('período sem lançamentos retorna todos os KPIs zerados — EXPECTED_FINANCIAL_BEHAVIOR', () => {
    const kpis = calcKpis([]);
    expect(kpis).toEqual({
      receitasMes: 0,
      despesasMes: 0,
      saldoLiquido: 0,
      totalVencer7dias: 0,
      totalVencer30dias: 0,
      titulosPendentes: 0,
    });
  });

  it('agrega receitas, despesas e pendências do mês corrente segundo as regras atuais', () => {
    const lancamentos: Lancamento[] = [
      criarLancamento({ id: 'A', tipo: 'credito', status: 'recebido', valor: 1000, dataVencimento: '2026-06-01' }),
      criarLancamento({ id: 'B', tipo: 'credito', status: 'pendente', valor: 500, dataVencimento: '2026-06-20' }),
      criarLancamento({ id: 'C', tipo: 'credito', status: 'vencido', valor: 300, dataVencimento: '2026-06-01' }),
      criarLancamento({ id: 'D', tipo: 'debito', status: 'pago', valor: 400, dataVencimento: '2026-06-05' }),
      criarLancamento({ id: 'E', tipo: 'debito', status: 'pendente', valor: 200, dataVencimento: '2026-06-18' }),
      criarLancamento({ id: 'F', tipo: 'debito', status: 'vencido', valor: 150, dataVencimento: '2026-06-10' }),
      criarLancamento({ id: 'G', tipo: 'debito', status: 'cancelado', valor: 999, dataVencimento: '2026-06-20' }),
      criarLancamento({ id: 'H', tipo: 'credito', status: 'recebido', valor: 5000, competencia: '2026-05', dataVencimento: '2026-05-01' }),
      criarLancamento({ id: 'I', tipo: 'credito', status: 'recebido', valor: 250, empresaId: 'empresa-b', dataVencimento: '2026-06-02' }),
      criarLancamento({
        id: 'J',
        tipo: 'debito',
        status: 'pago',
        valor: 120,
        dataVencimento: '2026-06-01',
        dataPagamento: '2026-06-10',
      }),
      criarLancamento({
        id: 'K',
        tipo: 'credito',
        status: 'pendente',
        valor: calcularParcelasValor(300, 3),
        valorTotal: 300,
        numeroParcelas: 3,
        parcelaAtual: 1,
        tipoRecorrencia: 'parcelas',
        dataVencimento: '2026-06-25',
      }),
    ];

    const kpis = calcKpis(lancamentos);

    // receitasMes considera apenas status 'recebido' ou 'pendente' da
    // competência atual: A(1000) + B(500) + I(250) + K(100) = 1850.
    // EXPECTED_FINANCIAL_BEHAVIOR: receita cancelada e de outra competência são ignoradas.
    // KNOWN_DEFECT: receita C (status 'vencido') é ignorada em receitasMes —
    // uma receita vencida some do total financeiro do mês, embora ainda
    // apareça em titulosPendentes.
    expect(kpis.receitasMes).toBe(1850);

    // despesasMes considera apenas status 'pago' ou 'pendente': D(400) + E(200) + J(120) = 720.
    // KNOWN_DEFECT: despesa F (status 'vencido') também não entra em despesasMes,
    // pelo mesmo motivo acima — mesma inconsistência do lado da despesa.
    // EXPECTED_FINANCIAL_BEHAVIOR: despesa cancelada (G) não entra no total.
    expect(kpis.despesasMes).toBe(720);

    expect(kpis.saldoLiquido).toBe(1130);

    // titulosPendentes conta status 'pendente' OU 'vencido', sem filtrar
    // por competência nem por tipo: B, C, E, F, K = 5.
    // LEGACY_BEHAVIOR: inclui títulos de receita e despesa vencidos cujos
    // valores não aparecem em receitasMes/despesasMes.
    expect(kpis.titulosPendentes).toBe(5);

    // totalVencer7dias: pendentes com vencimento entre hoje (exclusive) e
    // hoje+7 (exclusive): B(20/06) e E(18/06) = 700. K (25/06) está fora
    // da janela de 7 dias. C e F já venceram, portanto não entram.
    expect(kpis.totalVencer7dias).toBe(700);

    // totalVencer30dias: mesma janela, até hoje+30: B + E + K = 800.
    expect(kpis.totalVencer30dias).toBe(800);
  });

  it('calcKpis não filtra por empresaId — soma lançamentos de todas as empresas — LEGACY_BEHAVIOR', () => {
    const lancamentos: Lancamento[] = [
      criarLancamento({ id: 'emp-a', tipo: 'credito', status: 'recebido', valor: 100, empresaId: 'empresa-a' }),
      criarLancamento({ id: 'emp-b', tipo: 'credito', status: 'recebido', valor: 50, empresaId: 'empresa-b' }),
    ];
    // A função assume que o chamador já filtrou por empresa antes de invocar calcKpis.
    expect(calcKpis(lancamentos).receitasMes).toBe(150);
  });

  it('calcKpis ignora dataPagamento — usa apenas o campo competencia — LEGACY_BEHAVIOR', () => {
    const pagoForaDoMesPorDataPagamento = criarLancamento({
      id: 'pagamento-tardio',
      tipo: 'debito',
      status: 'pago',
      valor: 77,
      competencia: '2026-06',
      dataVencimento: '2026-06-01',
      dataPagamento: '2026-07-20', // pago em julho, mas competência é junho
    });
    expect(calcKpis([pagoForaDoMesPorDataPagamento]).despesasMes).toBe(77);
  });
});

describe('calcFluxoMensal — caracterização financeira (Seção 05)', () => {
  it('período sem lançamentos retorna 12 meses com valores zerados e rótulos em inglês — LEGACY_BEHAVIOR', () => {
    const fluxo = calcFluxoMensal([], 2026);
    expect(fluxo).toHaveLength(12);
    expect(fluxo[0]).toEqual({ mes: '2026-01', mesAbrev: 'Jan', receitas: 0, despesas: 0, saldo: 0 });
    // KNOWN_DEFECT: mesAbrev usa abreviação em inglês ('Jun', 'May', ...),
    // não o formato brasileiro exigido pelas convenções do projeto
    // (CLAUDE.md pede datas em formato brasileiro na UI).
    expect(fluxo[5]).toMatchObject({ mes: '2026-06', mesAbrev: 'Jun' });
  });

  it('calcFluxoMensal, diferente de calcKpis, NÃO filtra por status — inclui cancelados e vencidos — KNOWN_DEFECT', () => {
    const lancamentos: Lancamento[] = [
      criarLancamento({ id: 'A', tipo: 'credito', status: 'recebido', valor: 1000 }),
      criarLancamento({ id: 'B', tipo: 'credito', status: 'pendente', valor: 500 }),
      criarLancamento({ id: 'C', tipo: 'credito', status: 'vencido', valor: 300 }),
      criarLancamento({ id: 'I', tipo: 'credito', status: 'recebido', valor: 250, empresaId: 'empresa-b' }),
      criarLancamento({
        id: 'K',
        tipo: 'credito',
        status: 'pendente',
        valor: calcularParcelasValor(300, 3),
        valorTotal: 300,
        numeroParcelas: 3,
      }),
      criarLancamento({ id: 'D', tipo: 'debito', status: 'pago', valor: 400 }),
      criarLancamento({ id: 'E', tipo: 'debito', status: 'pendente', valor: 200 }),
      criarLancamento({ id: 'F', tipo: 'debito', status: 'vencido', valor: 150 }),
      criarLancamento({ id: 'G', tipo: 'debito', status: 'cancelado', valor: 999 }),
      criarLancamento({ id: 'J', tipo: 'debito', status: 'pago', valor: 120, dataPagamento: '2026-06-10' }),
      criarLancamento({ id: 'H', tipo: 'credito', status: 'recebido', valor: 5000, competencia: '2026-05' }),
    ];

    const fluxo = calcFluxoMensal(lancamentos, 2026);
    const junho = fluxo.find((f) => f.mes === '2026-06');
    const maio = fluxo.find((f) => f.mes === '2026-05');

    // receitas de junho somam TODOS os créditos da competência, inclusive
    // o vencido (C, 300): 1000 + 500 + 300 + 250 + 100 = 2150.
    expect(junho?.receitas).toBe(2150);

    // despesas de junho somam TODOS os débitos da competência, inclusive
    // o cancelado (G, 999) e o vencido (F, 150): 400 + 200 + 150 + 999 + 120 = 1869.
    // Isso diverge das regras usadas em calcKpis, que exclui cancelados e vencidos.
    expect(junho?.despesas).toBe(1869);
    expect(junho?.saldo).toBe(2150 - 1869);

    expect(maio?.receitas).toBe(5000);
    expect(maio?.despesas).toBe(0);
  });
});
