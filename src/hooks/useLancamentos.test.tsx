// Suíte de contrato de erro/carregamento do hook de lançamentos (Microgate 05-B).
//
// Objetivo: garantir que falhas de consulta ao Supabase nunca sejam
// interpretadas como ausência de registros, e que os novos campos de
// estado (isError/error/isSuccess/isFetching/refetch) coexistam com o
// contrato já usado pelas telas atuais (lancamentos/isLoading/mutations).
//
// O cliente Supabase é substituído por um mock local — nenhuma chamada de
// rede real ocorre nesta suíte (ver asserts "ausência de chamadas reais").
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLancamentos } from './useLancamentos';
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
  return { select, order };
}

const rowSintetico = {
  id: 'l1',
  tipo: 'credito',
  descricao: 'sintético',
  empresa_id: 'empresa-1',
  categoria_id: 'categoria-1',
  valor: 100,
  valor_total: 100,
  data_emissao: '2026-01-01',
  data_vencimento: '2026-01-10',
  data_pagamento: null,
  status: 'pendente',
  tipo_recorrencia: 'avista',
  recorrencia: null,
  numero_parcelas: null,
  parcela_atual: null,
  dia_vencimento: null,
  quantidade_meses: null,
  dias_antecipacao: null,
  data_antecipacao: null,
  observacoes: null,
  competencia: '2026-01',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useLancamentos — estados de consulta', () => {
  it('01 consulta bem-sucedida retorna os lançamentos convertidos e isSuccess=true', async () => {
    mockFromResolvedValue({ data: [rowSintetico], error: null });
    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isError).toBe(false);
    expect(result.current.lancamentos).toHaveLength(1);
    expect(result.current.lancamentos[0].id).toBe('l1');
  });

  it('02 consulta sem registros retorna lista vazia com sucesso (não é erro)', async () => {
    mockFromResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isError).toBe(false);
    expect(result.current.lancamentos).toEqual([]);
  });

  it('03 falha do Supabase é propagada como erro, nunca mascarada como lista vazia confiável', async () => {
    mockFromResolvedValue({ data: null, error: { message: 'conexão recusada' } });
    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeTruthy();
    // O array de conveniência existe (para não quebrar os consumidores
    // atuais que fazem `lancamentos.map(...)` sem guarda), mas o chamador
    // deve checar isError antes de confiar nele como "sem lançamentos".
    expect(result.current.lancamentos).toEqual([]);
  });

  it('06 estado de carregamento inicial expõe isLoading=true antes da resolução', () => {
    let resolveQuery: (value: { data: unknown; error: unknown }) => void = () => {};
    const order = jest.fn(
      () => new Promise((resolve) => { resolveQuery = resolve; })
    );
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    resolveQuery({ data: [], error: null });
  });

  it('09 recuperação após refetch: erro inicial seguido de sucesso ao tentar novamente', async () => {
    const order = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } })
      .mockResolvedValueOnce({ data: [rowSintetico], error: null });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.lancamentos).toEqual([]);

    await result.current.refetch();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.lancamentos).toHaveLength(1);
  });

  it('11 isolamento por usuário: a consulta não aplica filtro manual de usuário — depende exclusivamente da RLS (user_id = auth.uid()) do Supabase', async () => {
    const { order } = mockFromResolvedValue({ data: [], error: null });
    renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('lancamentos'));
    // Nenhum .eq('user_id', ...) é encadeado na leitura: a tabela inteira
    // visível pela conexão é solicitada e a RLS do Postgres restringe o
    // resultado às linhas do usuário autenticado.
    expect(order).toHaveBeenCalledWith('data_vencimento', { ascending: false });
  });

  it('15 nenhuma chamada de rede real ocorre — apenas o mock local do cliente Supabase é exercitado', async () => {
    mockFromResolvedValue({ data: [], error: null });
    renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(supabase.from).toHaveBeenCalled());
    expect(supabase.from).toHaveBeenCalledWith('lancamentos');
  });

  it('16 compatibilidade: o retorno preserva lancamentos/isLoading e as funções de mutação já usadas pelas telas', async () => {
    mockFromResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useLancamentos(), { wrapper: buildWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current).toHaveProperty('lancamentos');
    expect(result.current).toHaveProperty('isLoading');
    expect(typeof result.current.addLancamento).toBe('function');
    expect(typeof result.current.updateLancamento).toBe('function');
    expect(typeof result.current.deleteLancamento).toBe('function');
    expect(typeof result.current.baixarLancamento).toBe('function');
    expect(typeof result.current.getLancamentosPagar).toBe('function');
    expect(typeof result.current.getLancamentosReceber).toBe('function');
  });
});
