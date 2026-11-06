// Suíte do menu lateral recolhível (desktop).
//
// Objetivo: confirmar que a Sidebar alterna entre os estados expandido e
// recolhido via botão, expõe aria-expanded/aria-label corretos, mantém a
// rota ativa destacada e preserva os itens de navegação (apenas ícones
// ficam visíveis quando recolhida, com rótulo acessível via aria-label).
// Hooks de dados são mockados; nenhuma chamada real ao Supabase ocorre.
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useLancamentos } from '../../hooks/useLancamentos';
import { useEmpresas } from '../../hooks/useEmpresas';

jest.mock('../../hooks/useLancamentos');
jest.mock('../../hooks/useEmpresas');
jest.mock('../../integrations/supabase/client');

const mockUseLancamentos = useLancamentos as unknown as jest.Mock;
const mockUseEmpresas = useEmpresas as unknown as jest.Mock;

beforeEach(() => {
  mockUseLancamentos.mockReturnValue({ lancamentos: [] });
  mockUseEmpresas.mockReturnValue({ empresas: [] });
});

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar {...props} />
    </MemoryRouter>
  );
}

describe('Sidebar - menu recolhivel (desktop)', () => {
  it('nao exibe botao de recolher quando onToggleCollapsed nao e fornecido', () => {
    renderSidebar();
    expect(screen.queryByLabelText(/recolher menu|expandir menu/i)).not.toBeInTheDocument();
  });

  it('exibe o botao de recolher com aria-expanded=true quando expandida', () => {
    renderSidebar({ collapsed: false, onToggleCollapsed: jest.fn() });
    const toggle = screen.getByRole('button', { name: /recolher menu de navegacao/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('exibe o botao de expandir com aria-expanded=false quando recolhida', () => {
    renderSidebar({ collapsed: true, onToggleCollapsed: jest.fn() });
    const toggle = screen.getByRole('button', { name: /expandir menu de navegacao/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('chama onToggleCollapsed ao clicar no botao', () => {
    const onToggleCollapsed = jest.fn();
    renderSidebar({ collapsed: false, onToggleCollapsed });
    fireEvent.click(screen.getByRole('button', { name: /recolher menu de navegacao/i }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('mantem todos os links de navegacao visiveis quando recolhida, com rotulo acessivel', () => {
    renderSidebar({ collapsed: true, onToggleCollapsed: jest.fn() });
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas a Pagar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas a Receber' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empresas' })).toBeInTheDocument();
  });

  it('destaca a rota ativa tanto expandida quanto recolhida', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar collapsed={false} onToggleCollapsed={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveClass('font-medium');

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar collapsed={true} onToggleCollapsed={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('font-medium');
  });
});
