// Suíte de contrato de erro/carregamento do hook de empresas (Microgate 05-B).
// Mesma lógica de useLancamentos.test.tsx: falha do Supabase nunca pode ser
// lida como "nenhuma empresa cadastrada". Nenhuma chamada de rede real.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEmpresas } from './useEmpresas';
import { supabase } from '../integrations/supabase/client';

jest.mock('../integrations/supabase/client');

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function mockFromResolvedValue(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ order }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
}

describe('useEmpresas — estados de consulta', () => {
  it('04 falha do Supabase ao consultar empresas é exposta via isError/error, não como lista vazia', async () => {
    mockFromResolvedValue({ data: null, error: { message: 'serviço indisponível' } });
    const { result } = renderHook(() => useEmpresas(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.empresas).toEqual([]);
  });

  it('07 estado de carregamento inicial expõe isLoading=true antes da resolução', () => {
    let resolveQuery: (value: { data: unknown; error: unknown }) => void = () => {};
    const order = jest.fn(
      () => new Promise((resolve) => { resolveQuery = resolve; })
    );
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useEmpresas(), { wrapper: buildWrapper() });

    expect(result.current.isLoading).toBe(true);
    resolveQuery({ data: [], error: null });
  });

  it('16 compatibilidade: preserva empresas/isLoading e as mutações já usadas pela tela de Empresas', async () => {
    mockFromResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useEmpresas(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current).toHaveProperty('empresas');
    expect(result.current).toHaveProperty('isLoading');
    expect(typeof result.current.addEmpresa).toBe('function');
    expect(typeof result.current.updateEmpresa).toBe('function');
    expect(typeof result.current.deleteEmpresa).toBe('function');
  });
});
