// Suíte da Análise Gerencial — regressão de overflow horizontal mobile e
// consistência tipográfica (correção pós-dee339a).
//
// JSDOM não executa layout real, então não é possível medir scrollWidth vs.
// clientWidth aqui (ver registro de pendência no relatório final da tarefa:
// a validação visual real precisa ocorrer em smartphone/navegador real).
// Em vez disso, estes testes travam a estrutura que PREVINE o overflow —
// a barra de abas confinada ao seu próprio scroll horizontal — e garantem
// que ninguém reintroduza `overflow-x-hidden` global como atalho.
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AnaliseGerencial from './AnaliseGerencial';
import { useLancamentos } from '../hooks/useLancamentos';
import { useEmpresas } from '../hooks/useEmpresas';
import { useCategorias } from '../hooks/useCategorias';
import type { Lancamento, Empresa, Categoria } from '../types';
import { fmtMoeda } from '../utils/format';

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
    tipo: 'debito',
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

const categoria1: Categoria = {
  id: 'categoria-1',
  nome: 'Fornecedores',
  tipo: 'debito',
  cor: '#E24B4A',
  icone: 'package',
  ativo: true,
};

function setup(lancamentos: Lancamento[] = [], empresas: Empresa[] = [empresa1], categorias: Categoria[] = [categoria1]) {
  mockUseLancamentos.mockReturnValue({ lancamentos, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseEmpresas.mockReturnValue({ empresas, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCategorias.mockReturnValue({ categorias, isLoading: false, isError: false, error: null, refetch: jest.fn() });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/analise']}>
      <Routes>
        <Route path="/analise" element={<Outlet context={{ competencia: '2026-01', setCompetencia: jest.fn() }} />}>
          <Route index element={<AnaliseGerencial />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.history.pushState({}, '', '/analise');
});

describe('Análise Gerencial — barra de abas confinada (overflow mobile)', () => {
  it('01 a lista de abas tem seu próprio contêiner de rolagem horizontal, não a página', () => {
    setup();
    renderPage();
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('overflow-x-auto');
    expect(tablist.className).toContain('w-full');
  });

  it('02 cada aba preserva o rótulo completo (sem abreviação forçada) e não encolhe', () => {
    setup();
    renderPage();
    const geral = screen.getByRole('tab', { name: /visão geral/i });
    const pagar = screen.getByRole('tab', { name: /contas a pagar/i });
    const receber = screen.getByRole('tab', { name: /contas a receber/i });
    [geral, pagar, receber].forEach((tab) => expect(tab.className).toContain('shrink-0'));
  });

  it('03 troca de aba continua funcional com a barra confinada', async () => {
    setup([lancamento({ tipo: 'credito', categoriaId: 'categoria-1' })]);
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /contas a receber/i }));
    expect(screen.getByRole('tab', { name: /contas a receber/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('04 nenhum overflow-x-hidden global foi usado como atalho na página ou nos componentes da análise', () => {
    const pageSrc = fs.readFileSync(path.join(__dirname, 'AnaliseGerencial.tsx'), 'utf-8');
    const componentesSrc = fs.readFileSync(
      path.join(__dirname, '../components/analise/AnaliseComponentes.tsx'),
      'utf-8',
    );
    expect(pageSrc).not.toMatch(/overflow-x-hidden/);
    expect(componentesSrc).not.toMatch(/overflow-x-hidden/);
  });
});

describe('Análise Gerencial — valores financeiros preservados', () => {
  it('05 formata e exibe valores grandes, negativos e com centavos sem perder precisão', () => {
    setup([
      lancamento({ tipo: 'credito', status: 'pendente', valor: 20165.19, dataVencimento: '2026-02-01' }),
      lancamento({ tipo: 'credito', status: 'pendente', valor: 1234567.89, dataVencimento: '2026-02-02' }),
      lancamento({ tipo: 'debito', status: 'pendente', valor: 987654321.09, dataVencimento: '2026-02-03' }),
    ]);
    renderPage();
    const texto = document.body.textContent ?? '';
    expect(texto).toContain(fmtMoeda(20165.19 + 1234567.89));
    expect(texto).toContain(fmtMoeda(987654321.09));
  });

  it('06 o número de destaque usa a tipografia padronizada (TYPOGRAPHY.valueLg) com quebra segura', () => {
    setup([lancamento({ tipo: 'credito', valor: 1234567.89 })]);
    renderPage();
    const rotulo = screen.getByText('Posição líquida em aberto');
    const card = rotulo.closest('div')!;
    const valor = card.querySelector('p:nth-of-type(2)')!;
    expect(valor.className).toContain('break-words');
    expect(valor.className).toContain('tabular-nums');
    expect(valor.className).toContain('text-3xl');
  });
});

describe('Análise Gerencial — tipografia consistente entre seções', () => {
  it('07 painéis de Contas a Pagar e Contas a Receber usam os mesmos tokens de tipografia da visão geral', async () => {
    setup([lancamento({ tipo: 'debito' }), lancamento({ tipo: 'credito' })]);
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /contas a pagar/i }));
    const titulos = screen.getAllByText('Vencido');
    expect(titulos.length).toBeGreaterThan(0);
    titulos.forEach((el) => expect(el.className).toContain('uppercase'));
  });
});
