// Teste de infraestrutura (Microgate 04.3).
//
// Substitui o teste obsoleto do Create React App ("learn react link"),
// que não pertence ao Finance Control, por um teste que valida uma
// propriedade real da aplicação: um usuário sem sessão autenticada é
// redirecionado para a tela de login, e toda a árvore de providers
// (QueryClientProvider > AuthProvider > Router) consegue renderizar
// sem acesso à rede, sem credenciais reais e sem o cliente Supabase real.
//
// O cliente Supabase é substituído pelo mock de teste em
// src/integrations/supabase/__mocks__/client.ts. App.tsx não é alterado.
import { render, screen } from '@testing-library/react';
import App from './App';
import { supabase } from './integrations/supabase/client';

jest.mock('./integrations/supabase/client');

// O preset Jest do CRA define `resetMocks: true`, que zera a implementação
// de todo jest.fn() antes de cada teste — inclusive a definida em
// src/integrations/supabase/__mocks__/client.ts no momento do import.
// Por isso o comportamento do mock precisa ser reafirmado aqui a cada teste.
beforeEach(() => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
});

describe('App', () => {
  it('renderiza a árvore principal e redireciona usuário não autenticado para /login sem acessar a rede', async () => {
    render(<App />);

    expect(await screen.findByText('Finance Control')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
