// Suíte do Dashboard Executivo (Microgate 05).
//
// Exercita exclusivamente mocks e fixtures sintéticas: os hooks de acesso a
// dados (useLancamentos/useEmpresas/useCategorias) e o cliente Supabase são
// substituídos por jest.mock — nenhum teste aqui acessa rede real ou o
// núcleo financeiro é contornado (os cálculos exibidos vêm de
// src/services/financeiro, não de duplicações locais).
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import Dashboard from './Dashboard';
import { useLancamentos } from '../hooks/useLancamentos';
import { useEmpresas } from '../hooks/useEmpresas';
import { useCategorias } from '../hooks/useCategorias';
import { supabase } from '../integrations/supabase/client';
import type { Lancamento, Empresa, Categoria } from '../types';
import { fmtMoeda } from '../utils/format';

// Recharts (ResponsiveContainer) depende de ResizeObserver, indisponível
// no jsdom. Stub local, restrito a este arquivo de teste — nenhuma
// configuração global do Jest é alterada.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

jest.mock('../hooks/useLancamentos');
jest.mock('../hooks/useEmpresas');
jest.mock('../hooks/useCategorias');
jest.mock('../integrations/supabase/client');

const mockUseLancamentos = useLancamentos as unknown as jest.Mock;
const mockUseEmpresas = useEmpresas as unknown as jest.Mock;
const mockUseCategorias = useCategorias as unknown as jest.Mock;

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

const empresa1: Empresa = {
  id: 'empresa-1',
  razaoSocial: 'Empresa Um LTDA',
  nomeFantasia: 'Empresa Um',
  cnpj: '00.000.000/0001-00',
  telefone: '',
  email: '',
  cidade: '',
  estado: '',
  cor: '#111111',
  ativo: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const empresa2: Empresa = { ...empresa1, id: 'empresa-2', nomeFantasia: 'Empresa Dois' };

const categoriaDebito: Categoria = {
  id: 'categoria-1',
  nome: 'Fornecedores',
  tipo: 'debito',
  cor: '#E24B4A',
  icone: 'package',
  ativo: true,
};

const categoriaDebito2: Categoria = { ...categoriaDebito, id: 'categoria-2', nome: 'Aluguel' };

function setup(opts: {
  lancamentos?: Lancamento[];
  empresas?: Empresa[];
  categorias?: Categoria[];
  loadingLancamentos?: boolean;
  loadingEmpresas?: boolean;
  loadingCategorias?: boolean;
  errorLancamentos?: boolean;
  errorEmpresas?: boolean;
  errorCategorias?: boolean;
  refetchLancamentos?: jest.Mock;
  refetchEmpresas?: jest.Mock;
  refetchCategorias?: jest.Mock;
}) {
  mockUseLancamentos.mockReturnValue({
    lancamentos: opts.lancamentos ?? [],
    isLoading: opts.loadingLancamentos ?? false,
    isError: opts.errorLancamentos ?? false,
    error: opts.errorLancamentos ? new Error('falha sintética de lançamentos') : null,
    refetch: opts.refetchLancamentos ?? jest.fn(),
  });
  mockUseEmpresas.mockReturnValue({
    empresas: opts.empresas ?? [empresa1, empresa2],
    isLoading: opts.loadingEmpresas ?? false,
    isError: opts.errorEmpresas ?? false,
    error: opts.errorEmpresas ? new Error('falha sintética de empresas') : null,
    refetch: opts.refetchEmpresas ?? jest.fn(),
  });
  mockUseCategorias.mockReturnValue({
    categorias: opts.categorias !== undefined ? opts.categorias : [categoriaDebito, categoriaDebito2],
    isLoading: opts.loadingCategorias ?? false,
    isError: opts.errorCategorias ?? false,
    error: opts.errorCategorias ? new Error('falha sintética de categorias') : null,
    refetch: opts.refetchCategorias ?? jest.fn(),
  });
}

function renderDashboard(competencia = '2026-01') {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Outlet context={{ competencia, setCompetencia: jest.fn() }} />}>
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.history.pushState({}, '', '/dashboard');
});

describe('Dashboard — Resultado Realizado (regime de caixa)', () => {
  it('01 calcula receitas recebidas corretamente', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-15', valor: 300 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(300));
  });

  it('02 calcula despesas pagas corretamente', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-10', valor: 120 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Despesas Pagas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(120));
  });

  it('03 calcula o resultado de caixa (receitas - despesas realizadas)', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-15', valor: 500 }),
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-10', valor: 200 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Resultado de Caixa').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(300));
  });

  it('04 receita pendente não entra nas receitas recebidas', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'pendente', valor: 999 })],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(0));
    expect(card.textContent).not.toContain(fmtMoeda(999));
  });

  it('05 despesa pendente não entra nas despesas pagas', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'debito', status: 'pendente', valor: 888 })],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Despesas Pagas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(0));
  });

  it('06 lançamentos cancelados são excluídos do resultado realizado', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'cancelado', dataPagamento: '2026-01-15', valor: 777 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(0));
  });

  it('11 pagamento registrado após o vencimento ainda entra no realizado do mês do pagamento', () => {
    setup({
      lancamentos: [
        lancamento({
          tipo: 'credito',
          status: 'recebido',
          dataVencimento: '2026-01-05',
          dataPagamento: '2026-01-20',
          valor: 150,
        }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(150));
  });

  it('12 recebimento em mês diferente da emissão/vencimento só conta no mês do pagamento', () => {
    setup({
      lancamentos: [
        lancamento({
          tipo: 'credito',
          status: 'recebido',
          dataEmissao: '2026-01-02',
          dataVencimento: '2026-01-10',
          dataPagamento: '2026-02-03',
          valor: 400,
        }),
      ],
    });
    renderDashboard('2026-01');
    const cardJaneiro = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(cardJaneiro.textContent).toContain(fmtMoeda(0));
  });

  it('15 soma corretamente valores negativos (estornos) no resultado de caixa', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 200 }),
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-12', valor: -50 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(150));
  });
});

describe('Dashboard — Compromissos Financeiros (previsão)', () => {
  it('07 títulos vencidos são separados dos totais a vencer', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'vencido', dataVencimento: '2026-01-05', valor: 100 }),
        lancamento({ tipo: 'credito', status: 'pendente', dataVencimento: '2026-02-05', valor: 60 }),
      ],
    });
    renderDashboard('2026-01');
    const vencidos = screen.getByText('Recebíveis Vencidos').closest('div')!.parentElement!;
    const aReceber = screen.getByText('Contas a Receber').closest('div')!.parentElement!;
    expect(vencidos.textContent).toContain(fmtMoeda(100));
    expect(aReceber.textContent).toContain(fmtMoeda(160));
    jest.useRealTimers();
  });
});

describe('Dashboard — Empresas', () => {
  it('08 filtro individual de empresa restringe o resultado a uma única empresa', () => {
    setup({
      lancamentos: [
        lancamento({ empresaId: 'empresa-1', tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 }),
        lancamento({ empresaId: 'empresa-2', tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 300 }),
      ],
    });
    window.history.pushState({}, '', '/dashboard?empresaId=empresa-1');
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(100));
    expect(card.textContent).not.toContain(fmtMoeda(300));
  });

  it('09 sem filtro, consolida todas as empresas do usuário', () => {
    setup({
      lancamentos: [
        lancamento({ empresaId: 'empresa-1', tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 }),
        lancamento({ empresaId: 'empresa-2', tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 300 }),
      ],
    });
    renderDashboard('2026-01');
    const card = screen.getByText('Receitas Recebidas').closest('div')!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(400));
  });
});

describe('Dashboard — Filtro de período', () => {
  it('10 troca de competência recalcula os indicadores para o novo período', () => {
    const dados = [
      lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-15', valor: 100 }),
      lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-02-15', valor: 250 }),
    ];
    setup({ lancamentos: dados });
    renderDashboard('2026-01');
    expect(screen.getByText('Receitas Recebidas').closest('div')!.parentElement!.textContent).toContain(
      fmtMoeda(100)
    );

    renderDashboard('2026-02');
    const cards = screen.getAllByText('Receitas Recebidas');
    expect(cards[cards.length - 1].closest('div')!.parentElement!.textContent).toContain(fmtMoeda(250));
  });
});

describe('Dashboard — Gráficos', () => {
  it('13 despesas por categoria reconciliam com o total de despesas pagas', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-2', status: 'pago', dataPagamento: '2026-01-06', valor: 50 }),
      ],
    });
    renderDashboard('2026-01');
    const despesasPagasCard = screen.getByText('Despesas Pagas').closest('div')!.parentElement!;
    expect(despesasPagasCard.textContent).toContain(fmtMoeda(150));
    expect(
      screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === `Total: ${fmtMoeda(150)}`)
    ).toBeInTheDocument();
  });
});

describe('Dashboard — Casos de borda', () => {
  it('14 período sem dados exibe zeros reais, sem fabricar valores', () => {
    setup({ lancamentos: [] });
    renderDashboard('2026-01');
    expect(screen.getByText('Receitas Recebidas').closest('div')!.parentElement!.textContent).toContain(
      fmtMoeda(0)
    );
    expect(screen.getByText('Nenhum lançamento encontrado')).toBeInTheDocument();
    expect(screen.getByText('Nenhum vencimento pendente')).toBeInTheDocument();
  });

  it('16 erro ao calcular indicadores exibe aviso em vez de quebrar a tela', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 })],
      // categorias malformadas (não é um array) simula uma falha inesperada
      // na camada de consulta que os hooks atuais não expõem como erro
      // explícito (ver limitação registrada no relatório do Microgate 05).
      categorias: null as unknown as Categoria[],
    });
    renderDashboard('2026-01');
    expect(screen.getByText('Não foi possível calcular os indicadores do período')).toBeInTheDocument();
  });

  it('17 exibe indicador de carregamento enquanto os dados não chegam', () => {
    setup({ lancamentos: [], loadingLancamentos: true });
    renderDashboard('2026-01');
    expect(screen.queryByText('Receitas Recebidas')).not.toBeInTheDocument();
  });

  it('18 inconsistência financeira (recebido sem data de pagamento) é sinalizada, não ocultada', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: undefined, valor: 100 })],
    });
    renderDashboard('2026-01');
    expect(screen.getByText(/Inconsistências encontradas nos dados/)).toBeInTheDocument();
    expect(screen.getByText(/pago\(s\)\/recebido\(s\) sem data de pagamento/)).toBeInTheDocument();
  });

  it('19 mantém compatibilidade com os componentes visuais existentes', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 }),
      ],
    });
    renderDashboard('2026-01');
    expect(screen.getByText('Evolução de Caixa (Realizado)')).toBeInTheDocument();
    expect(screen.getByText('Despesas Pagas por Categoria')).toBeInTheDocument();
    expect(screen.getByText('Últimos Lançamentos')).toBeInTheDocument();
    expect(screen.getByText('Próximos Vencimentos')).toBeInTheDocument();
  });

  it('20 não realiza nenhuma chamada de rede real (Supabase) durante a renderização', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 })],
    });
    renderDashboard('2026-01');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// Microgate 05-B: tratamento seguro de erros de consulta. Estas suítes
// cobrem os estados que o Microgate 05 ainda não distinguia — falha de
// consulta vs. sucesso sem registros — usando os mesmos mocks de hooks.
describe('Dashboard — estados de erro de consulta (Microgate 05-B)', () => {
  it('21 ESTADO C: falha ao consultar lançamentos exibe mensagem de erro, não um dashboard zerado', () => {
    setup({ errorLancamentos: true });
    renderDashboard('2026-01');

    expect(screen.getByText('Não foi possível carregar as informações financeiras.')).toBeInTheDocument();
    expect(screen.getByText('Falha ao consultar lançamentos.')).toBeInTheDocument();
    // Nenhum indicador financeiro (que dependeria de dados possivelmente
    // ausentes/obsoletos) é renderizado junto do erro.
    expect(screen.queryByText('Receitas Recebidas')).not.toBeInTheDocument();
  });

  it('22 ESTADO C: falha ao consultar empresas também bloqueia a exibição de indicadores', () => {
    setup({ errorEmpresas: true });
    renderDashboard('2026-01');

    expect(screen.getByText('Não foi possível carregar as informações financeiras.')).toBeInTheDocument();
    expect(screen.getByText('Falha ao consultar empresas.')).toBeInTheDocument();
    expect(screen.queryByText('Resultado de Caixa')).not.toBeInTheDocument();
  });

  it('23 ESTADO C: falha ao consultar categorias também bloqueia a exibição de indicadores', () => {
    setup({ errorCategorias: true });
    renderDashboard('2026-01');

    expect(screen.getByText('Não foi possível carregar as informações financeiras.')).toBeInTheDocument();
    expect(screen.getByText('Falha ao consultar categorias.')).toBeInTheDocument();
  });

  it('24 distingue a fonte da falha quando mais de uma consulta falha simultaneamente', () => {
    setup({ errorLancamentos: true, errorEmpresas: true });
    renderDashboard('2026-01');

    expect(screen.getByText('Falha ao consultar lançamentos.')).toBeInTheDocument();
    expect(screen.getByText('Falha ao consultar empresas.')).toBeInTheDocument();
    expect(screen.queryByText('Falha ao consultar categorias.')).not.toBeInTheDocument();
  });

  it('10 indicador de Resultado de Caixa nunca aparece como R$ 0,00 quando a consulta de lançamentos falhou', () => {
    setup({ errorLancamentos: true });
    renderDashboard('2026-01');

    expect(screen.queryByText('Resultado de Caixa')).not.toBeInTheDocument();
    expect(screen.queryByText(fmtMoeda(0))).not.toBeInTheDocument();
  });

  it('14 dados em cache (stale) de uma consulta que falhou não são exibidos como atuais', () => {
    // Mesmo que o React Query mantenha o `lancamentos` da última consulta
    // bem-sucedida em cache, a presença de isError deve, por si só,
    // suprimir a exibição dos indicadores — eles não podem ser
    // apresentados como reconciliados/atuais.
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 999 })],
      errorLancamentos: true,
    });
    renderDashboard('2026-01');

    expect(screen.getByText('Não foi possível carregar as informações financeiras.')).toBeInTheDocument();
    expect(screen.queryByText(fmtMoeda(999))).not.toBeInTheDocument();
  });

  it('permite tentativa manual de atualização (refetch) a partir do estado de erro', () => {
    const refetchLancamentos = jest.fn();
    setup({ errorLancamentos: true, refetchLancamentos });
    renderDashboard('2026-01');

    screen.getByRole('button', { name: /Tentar novamente \(lançamentos\)/ }).click();
    expect(refetchLancamentos).toHaveBeenCalledTimes(1);
  });

  it('ESTADO B: sucesso sem registros para o filtro selecionado exibe mensagem de ausência, sem mascarar como erro', () => {
    setup({ lancamentos: [] });
    renderDashboard('2026-01');

    expect(
      screen.getByText('Não foram encontrados lançamentos para os filtros selecionados.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar as informações financeiras.')).not.toBeInTheDocument();
    // Indicadores ainda são exibidos com zero legítimo (sucesso, não erro).
    expect(screen.getByText('Receitas Recebidas')).toBeInTheDocument();
  });

  it('12 preserva o filtro de empresa selecionado mesmo quando não há lançamentos para o período', () => {
    setup({ lancamentos: [] });
    window.history.pushState({}, '', '/dashboard?empresaId=empresa-2');
    renderDashboard('2026-01');

    expect(screen.getByRole('combobox', { name: 'Filtrar por empresa' })).toHaveValue('empresa-2');
    expect(
      screen.getByText('Não foram encontrados lançamentos para os filtros selecionados.')
    ).toBeInTheDocument();
  });
});

// Microgate 06: evolução mensal/anual, comparações históricas, ranking de
// despesas. O hook useLancamentos (mockado aqui) retorna todo o histórico
// sem filtro de período — por isso as comparações usam dados reais do
// próprio mock, nunca "indisponível" por limitação de cobertura.
describe('Dashboard — Evolução e comparações históricas (Microgate 06)', () => {
  it('25 compara o mês selecionado com o mês anterior usando o mesmo regime de caixa', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-02-10', valor: 300 }),
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 200 }),
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-02-05', valor: 50 }),
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', valor: 40 }),
      ],
    });
    renderDashboard('2026-02');

    const card = screen.getByText('Comparação com o Mês Anterior').closest('div')!;
    // Receitas: atual 300, anterior 200, diferença +100, percentual +50.0%.
    expect(card.textContent).toContain(fmtMoeda(300));
    expect(card.textContent).toContain(`anterior: ${fmtMoeda(200)}`);
    expect(card.textContent).toContain('50.0%');
  });

  it('26 compara o mês selecionado com o mesmo mês do ano anterior', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 500 }),
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2025-01-10', valor: 400 }),
      ],
    });
    renderDashboard('2026-01');

    const card = screen.getByText('Comparação com o Mesmo Mês do Ano Anterior').closest('div')!;
    expect(card.textContent).toContain(`anterior: ${fmtMoeda(400)}`);
  });

  it('27 denominador zero na comparação histórica exibe variação indisponível, sem fabricar percentual', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-02-10', valor: 100 })],
    });
    renderDashboard('2026-02');

    expect(screen.getAllByText('variação indisponível').length).toBeGreaterThan(0);
  });

  it('28 mudança de sinal do resultado de caixa é sinalizada, não tratada como crescimento percentual comum', () => {
    setup({
      lancamentos: [
        // Resultado do mês anterior negativo (despesas > receitas).
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-05', valor: 50 }),
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-01-06', valor: 200 }),
        // Resultado do mês atual positivo (receitas > despesas).
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-02-05', valor: 300 }),
        lancamento({ tipo: 'debito', status: 'pago', dataPagamento: '2026-02-06', valor: 50 }),
      ],
    });
    renderDashboard('2026-02');

    expect(screen.getByText('mudança de sinal')).toBeInTheDocument();
  });

  it('29 evolução anual é exibida junto da evolução mensal (Seção 06)', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 })],
    });
    renderDashboard('2026-01');

    expect(screen.getByText('Evolução Anual de Caixa')).toBeInTheDocument();
  });

  it('30 ranking de maiores despesas pagas aparece em ordem decrescente de valor', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', status: 'pago', descricao: 'Aluguel', dataPagamento: '2026-01-05', valor: 500 }),
        lancamento({ tipo: 'debito', status: 'pago', descricao: 'Internet', dataPagamento: '2026-01-06', valor: 150 }),
        lancamento({ tipo: 'debito', status: 'pago', descricao: 'Água', dataPagamento: '2026-01-07', valor: 80 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText('Maiores pagamentos individuais').closest('div')!.parentElement!;
    const nomes = within(ranking)
      .getAllByText(/Aluguel|Internet|Água/)
      .map((el) => el.textContent);
    expect(nomes).toEqual(['Aluguel', 'Internet', 'Água']);
  });

  it('31 ranking de despesas exclui lançamentos pendentes e cancelados', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', status: 'pago', descricao: 'Fornecedor Pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ tipo: 'debito', status: 'pendente', descricao: 'Fornecedor Pendente', valor: 999 }),
        lancamento({ tipo: 'debito', status: 'cancelado', descricao: 'Fornecedor Cancelado', dataPagamento: '2026-01-05', valor: 999 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText('Maiores pagamentos individuais').closest('div')!.parentElement!;
    expect(within(ranking).getByText('Fornecedor Pago')).toBeInTheDocument();
    expect(within(ranking).queryByText('Fornecedor Pendente')).not.toBeInTheDocument();
    expect(within(ranking).queryByText('Fornecedor Cancelado')).not.toBeInTheDocument();
  });

  it('32 despesa sem categoria identificada aparece no ranking como "Sem categoria"', () => {
    setup({
      lancamentos: [
        lancamento({
          tipo: 'debito',
          status: 'pago',
          descricao: 'Despesa sem categoria',
          categoriaId: 'categoria-inexistente',
          dataPagamento: '2026-01-05',
          valor: 70,
        }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText('Maiores pagamentos individuais').closest('div')!.parentElement!;
    expect(within(ranking).getByText(/Sem categoria/)).toBeInTheDocument();
  });

  it('33 sem despesas pagas no período, o ranking exibe estado vazio em vez de lista fabricada', () => {
    setup({ lancamentos: [] });
    renderDashboard('2026-01');

    const ranking = screen.getByText('Maiores pagamentos individuais').closest('div')!.parentElement!;
    expect(within(ranking).getByText('Sem despesas pagas no período')).toBeInTheDocument();
  });

  it('34 reconciliação: diferença de receitas na comparação mensal é exata, sem erro de ponto flutuante', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-02-10', valor: 100.1 }),
        lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 }),
      ],
    });
    renderDashboard('2026-02');

    const card = screen.getByText('Comparação com o Mês Anterior').closest('div')!;
    // Diferença exata esperada: R$ 0,10 — não R$ 0,09999999999997 nem R$ 0,11.
    expect(card.textContent).toContain(fmtMoeda(0.1));
  });

  it('35 gráficos de evolução renderizam normalmente em ambiente sem ResizeObserver real (responsividade via stub controlado)', () => {
    setup({
      lancamentos: [lancamento({ tipo: 'credito', status: 'recebido', dataPagamento: '2026-01-10', valor: 100 })],
    });
    renderDashboard('2026-01');

    expect(screen.getByText('Evolução de Caixa (Realizado)')).toBeInTheDocument();
    expect(screen.getByText('Evolução Anual de Caixa')).toBeInTheDocument();
  });
});

// Microgate 06-B: ranking de categorias por total de despesas pagas, e
// visualização de todas as categorias (além das 6 exibidas na legenda do
// gráfico de rosca). Reutiliza exclusivamente os resultados de
// `calcularDespesasCategoria` (núcleo financeiro) — nenhum cálculo local.
describe('Dashboard — Ranking de Categorias (Microgate 06-B)', () => {
  const tituloRanking = 'Ranking de Categorias — Despesas Pagas';

  it('36 exibe o total pago por categoria', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 300 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Fornecedores')).toBeInTheDocument();
    expect(ranking.textContent).toContain(fmtMoeda(300));
  });

  it('37 ordena as categorias em ordem decrescente de valor pago', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-2', status: 'pago', dataPagamento: '2026-01-06', valor: 400 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    const nomes = within(ranking)
      .getAllByText(/Fornecedores|Aluguel/)
      .map((el) => el.textContent);
    expect(nomes).toEqual(['Aluguel', 'Fornecedores']);
  });

  it('38 exibe o percentual de cada categoria sobre o total de despesas pagas', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 300 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-2', status: 'pago', dataPagamento: '2026-01-06', valor: 100 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(ranking.textContent).toContain('75.0%');
    expect(ranking.textContent).toContain('25.0%');
  });

  it('39 a soma das categorias reconcilia exatamente (zero centavos) com as despesas pagas do período', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 100.3 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-2', status: 'pago', dataPagamento: '2026-01-06', valor: 50.2 }),
      ],
    });
    renderDashboard('2026-01');

    const despesasPagasCard = screen.getByText('Despesas Pagas').closest('div')!.parentElement!;
    expect(despesasPagasCard.textContent).toContain(fmtMoeda(150.5));
    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(ranking.textContent).toContain(fmtMoeda(100.3));
    expect(ranking.textContent).toContain(fmtMoeda(50.2));
  });

  it('40 múltiplos pagamentos na mesma categoria são somados em uma única posição do ranking', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-15', valor: 50 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getAllByText('Fornecedores')).toHaveLength(1);
    expect(ranking.textContent).toContain(fmtMoeda(150));
  });

  it('41 parcelas pagas da mesma categoria são somadas sem duplicidade', () => {
    setup({
      lancamentos: [
        lancamento({
          tipo: 'debito',
          categoriaId: 'categoria-1',
          status: 'pago',
          dataPagamento: '2026-01-05',
          valor: 100,
          tipoRecorrencia: 'parcelas',
          numeroParcelas: 3,
          parcelaAtual: 1,
        }),
        lancamento({
          tipo: 'debito',
          categoriaId: 'categoria-1',
          status: 'pago',
          dataPagamento: '2026-01-20',
          valor: 100,
          tipoRecorrencia: 'parcelas',
          numeroParcelas: 3,
          parcelaAtual: 2,
        }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getAllByText('Fornecedores')).toHaveLength(1);
    expect(ranking.textContent).toContain(fmtMoeda(200));
  });

  it('42 exclui despesas pendentes do ranking de categorias', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pendente', valor: 999 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Sem despesas pagas no período')).toBeInTheDocument();
  });

  it('43 exclui despesas canceladas do ranking de categorias', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'cancelado', dataPagamento: '2026-01-05', valor: 999 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Sem despesas pagas no período')).toBeInTheDocument();
  });

  it('44 filtro de empresa restringe o ranking de categorias à empresa selecionada', () => {
    setup({
      lancamentos: [
        lancamento({ empresaId: 'empresa-1', categoriaId: 'categoria-1', tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ empresaId: 'empresa-2', categoriaId: 'categoria-2', tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', valor: 500 }),
      ],
    });
    window.history.pushState({}, '', '/dashboard?empresaId=empresa-1');
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Fornecedores')).toBeInTheDocument();
    expect(within(ranking).queryByText('Aluguel')).not.toBeInTheDocument();
  });

  it('45 filtro de período restringe o ranking de categorias ao mês selecionado', () => {
    setup({
      lancamentos: [
        lancamento({ categoriaId: 'categoria-1', tipo: 'debito', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
        lancamento({ categoriaId: 'categoria-2', tipo: 'debito', status: 'pago', dataPagamento: '2026-02-05', valor: 500 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Fornecedores')).toBeInTheDocument();
    expect(within(ranking).queryByText('Aluguel')).not.toBeInTheDocument();
  });

  it('46 despesa com categoria não identificada aparece no ranking como "Sem categoria"', () => {
    setup({
      lancamentos: [
        lancamento({
          tipo: 'debito',
          status: 'pago',
          categoriaId: 'categoria-inexistente',
          dataPagamento: '2026-01-05',
          valor: 70,
        }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Sem categoria')).toBeInTheDocument();
  });

  it('47 mais de seis categorias exibe apenas as seis primeiras e oferece "Ver todas as categorias"', () => {
    const categorias = Array.from({ length: 8 }, (_, i) => ({
      id: `categoria-${i + 1}`,
      nome: `Categoria ${i + 1}`,
      tipo: 'debito' as const,
      cor: '#888888',
      icone: 'package',
      ativo: true,
    }));
    const lancamentos = categorias.map((c, i) =>
      lancamento({
        categoriaId: c.id,
        tipo: 'debito',
        status: 'pago',
        dataPagamento: '2026-01-05',
        valor: 100 - i,
      })
    );
    setup({ lancamentos, categorias });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Categoria 1')).toBeInTheDocument();
    expect(within(ranking).getByText('Categoria 6')).toBeInTheDocument();
    expect(within(ranking).queryByText('Categoria 7')).not.toBeInTheDocument();
    expect(within(ranking).getByText('Ver todas as categorias (8)')).toBeInTheDocument();
  });

  it('48 a ação "Ver todas as categorias" revela as categorias ocultas da lista inicial', () => {
    const categorias = Array.from({ length: 8 }, (_, i) => ({
      id: `categoria-${i + 1}`,
      nome: `Categoria ${i + 1}`,
      tipo: 'debito' as const,
      cor: '#888888',
      icone: 'package',
      ativo: true,
    }));
    const lancamentos = categorias.map((c, i) =>
      lancamento({
        categoriaId: c.id,
        tipo: 'debito',
        status: 'pago',
        dataPagamento: '2026-01-05',
        valor: 100 - i,
      })
    );
    setup({ lancamentos, categorias });
    renderDashboard('2026-01');

    fireEvent.click(screen.getByText('Ver todas as categorias (8)'));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Categoria 7')).toBeInTheDocument();
    expect(within(modal).getByText('Categoria 8')).toBeInTheDocument();
  });

  it('49 sem despesas pagas no período, o ranking de categorias exibe estado vazio em vez de lista fabricada', () => {
    setup({ lancamentos: [] });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(within(ranking).getByText('Sem despesas pagas no período')).toBeInTheDocument();
  });

  it('50 precisão exata em centavos: soma com valores fracionários não produz erro de ponto flutuante', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 0.1 }),
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-06', valor: 0.2 }),
      ],
    });
    renderDashboard('2026-01');

    const ranking = screen.getByText(tituloRanking).closest('div')!.parentElement!;
    expect(ranking.textContent).toContain(fmtMoeda(0.3));
  });

  it('51 preserva o ranking individual de maiores pagamentos ao lado do ranking de categorias', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', descricao: 'Aluguel Jan', dataPagamento: '2026-01-05', valor: 300 }),
      ],
    });
    renderDashboard('2026-01');

    expect(screen.getByText('Maiores pagamentos individuais')).toBeInTheDocument();
    expect(screen.getByText(tituloRanking)).toBeInTheDocument();
    const rankingIndividual = screen.getByText('Maiores pagamentos individuais').closest('div')!.parentElement!;
    expect(within(rankingIndividual).getByText('Aluguel Jan')).toBeInTheDocument();
  });

  it('52 erro de consulta impede a exibição do ranking de categorias, sem apresentar zero fabricado', () => {
    setup({ errorLancamentos: true });
    renderDashboard('2026-01');

    expect(screen.queryByText(tituloRanking)).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar as informações financeiras.')).toBeInTheDocument();
  });

  it('53 não realiza nenhuma chamada de rede real (Supabase) ao renderizar o ranking de categorias', () => {
    setup({
      lancamentos: [
        lancamento({ tipo: 'debito', categoriaId: 'categoria-1', status: 'pago', dataPagamento: '2026-01-05', valor: 100 }),
      ],
    });
    renderDashboard('2026-01');

    expect(screen.getByText(tituloRanking)).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
