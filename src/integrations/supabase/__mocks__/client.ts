// Mock exclusivo de teste do cliente Supabase.
//
// Finalidade (Microgate 04.3): permitir que a suíte Jest renderize a
// aplicação sem inicializar o cliente real do Supabase, sem exigir
// variáveis de ambiente (.env) e sem efetuar qualquer chamada de rede.
//
// Este arquivo NUNCA é usado em produção: só entra em vigor quando um
// teste chama explicitamente `jest.mock('.../integrations/supabase/client')`.
//
// Qualquer integração que não tenha sido simulada aqui falha de forma
// explícita (ver `chamadaNaoSimulada`), em vez de tentar uma chamada real.

function chamadaNaoSimulada(metodo: string): never {
  throw new Error(
    `[supabase mock] Chamada não simulada em teste: "${metodo}". ` +
      'Esta integração externa não foi mockada. Adicione o comportamento ' +
      'esperado ao mock de teste antes de exercitar este caminho.'
  );
}

export const supabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(async () => chamadaNaoSimulada('auth.signInWithPassword')),
    signUp: jest.fn(async () => chamadaNaoSimulada('auth.signUp')),
    signOut: jest.fn(async () => undefined),
  },
  from: jest.fn(() => chamadaNaoSimulada('from(...)')),
  storage: {
    from: jest.fn(() => chamadaNaoSimulada('storage.from(...)')),
  },
};
