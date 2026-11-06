// Suíte de navegação responsiva do AppLayout (sidebar + menu mobile).
//
// Objetivo: confirmar que a sidebar permanece fixa no desktop e passa a
// ser um menu recolhível (drawer) acionado por um botão hambúrguer em
// telas estreitas, sem alterar dados financeiros — os hooks de dados são
// mockados e nenhuma chamada real ao Supabase ocorre.
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './AppLayout';
import { useLancamentos } from '../../hooks/useLancamentos';
import { useEmpresas } from '../../hooks/useEmpresas';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../integrations/supabase/client';

jest.mock('../../hooks/useLancamentos');
jest.mock('../../hooks/useEmpresas');
jest.mock('../../integrations/supabase/client');
jest.mock('../../contexts/AuthContext');

const mockUseLancamentos = useLancamentos as unknown as jest.Mock;
const mockUseEmpresas = useEmpresas as unknown as jest.Mock;
const mockUseAuth = useAuth as unknown as jest.Mock;

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="dashboard" element={<div>Conteudo do Dashboard</div>} />
          <Route path="lancamentos" element={<div>Conteudo de Lancamentos</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUseLancamentos.mockReturnValue({ lancamentos: [] });
  mockUseEmpresas.mockReturnValue({ empresas: [] });
  mockUseAuth.mockReturnValue({ user: { email: 'teste@exemplo.com' }, signOut: jest.fn() });
});

describe('AppLayout - navegacao responsiva', () => {
  it('mantem a sidebar visivel e o botao de menu oculto no desktop', () => {
    renderLayout();

    expect(screen.getByText('Finance Control')).toBeInTheDocument();
    const menuButton = screen.getByRole('button', { name: /abrir menu de navegacao/i });
    expect(menuButton).toHaveClass('md:hidden');
  });

  it('a sidebar comeca fechada (fora da tela) no mobile', () => {
    renderLayout();

    const aside = screen.getByText('Finance Control').closest('aside');
    expect(aside).toHaveClass('-translate-x-full');
  });

  it('abre a sidebar ao clicar no botao hamburguer e exibe o backdrop', () => {
    renderLayout();

    const menuButton = screen.getByRole('button', { name: /abrir menu de navegacao/i });
    fireEvent.click(menuButton);

    const aside = screen.getByText('Finance Control').closest('aside');
    expect(aside).toHaveClass('translate-x-0');
    expect(aside).not.toHaveClass('-translate-x-full');
  });

  it('fecha a sidebar ao clicar no backdrop', () => {
    const { container } = renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /abrir menu de navegacao/i }));
    const backdrop = container.querySelector('[aria-hidden="true"].bg-black\\/50') as HTMLElement;
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop);
    const aside = screen.getByText('Finance Control').closest('aside');
    expect(aside).toHaveClass('-translate-x-full');
  });

  it('fecha a sidebar com a tecla Escape', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /abrir menu de navegacao/i }));
    expect(screen.getByText('Finance Control').closest('aside')).toHaveClass('translate-x-0');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Finance Control').closest('aside')).toHaveClass('-translate-x-full');
  });

  it('fecha a sidebar automaticamente ao navegar para outra pagina', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /abrir menu de navegacao/i }));
    expect(screen.getByText('Finance Control').closest('aside')).toHaveClass('translate-x-0');

    fireEvent.click(screen.getByRole('link', { name: /novo lancamento/i }));

    expect(screen.getByText('Finance Control').closest('aside')).toHaveClass('-translate-x-full');
    expect(screen.getByText('Conteudo de Lancamentos')).toBeInTheDocument();
  });

  it('preserva o conteudo do Dashboard dentro do layout', () => {
    renderLayout();
    expect(screen.getByText('Conteudo do Dashboard')).toBeInTheDocument();
  });

  it('renderiza a barra de navegacao inferior (mobile), oculta no desktop', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: /navegacao principal/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('md:hidden');
  });

  it('abre o menu completo (drawer) ao clicar em "Menu" na barra inferior', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /abrir menu completo/i }));
    const aside = screen.getByText('Finance Control').closest('aside');
    expect(aside).toHaveClass('translate-x-0');
  });

  it('reserva espaco inferior no conteudo para a barra nao cobrir botoes/formularios', () => {
    renderLayout();
    const main = screen.getByText('Conteudo do Dashboard').closest('main');
    expect(main).toHaveClass('pb-bottom-nav');
  });
});
