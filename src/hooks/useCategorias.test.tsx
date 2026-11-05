// Suíte de contrato de erro/carregamento do hook de categorias (Microgate 05-B).
// Mesma lógica de useLancamentos.test.tsx: falha do Supabase nunca pode ser
// lida como "nenhuma categoria cadastrada". Nenhuma chamada de rede real.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCategorias } from './useCategorias';
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

describe('useCategorias — estados de consulta', () => {
  it('05 falha do Supabase ao consultar categorias é exposta via isError/error, não como lista vazia', async () => {
    mockFromResolvedValue({ data: null, error: { message: 'permissão negada' } });
    const { result } = renderHook(() => useCategorias(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.categorias).toEqual([]);
  });

  it('08 estado de carregamento inicial expõe isLoading=true antes da resolução', () => {
    let resolveQuery: (value: { data: unknown; error: unknown }) => void = () => {};
    const order = jest.fn(
      () => new Promise((resolve) => { resolveQuery = resolve; })
    );
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useCategorias(), { wrapper: buildWrapper() });

    expect(result.current.isLoading).toBe(true);
    resolveQuery({ data: [], error: null });
  });

  it('16 compatibilidade: preserva categorias/isLoading e as mutações já usadas pela tela de Categorias', async () => {
    mockFromResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useCategorias(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current).toHaveProperty('categorias');
    expect(result.current).toHaveProperty('isLoading');
    expect(typeof result.current.addCategoria).toBe('function');
    expect(typeof result.current.updateCategoria).toBe('function');
    expect(typeof result.current.deleteCategoria).toBe('function');
  });
});
