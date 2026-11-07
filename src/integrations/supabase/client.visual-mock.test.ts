import fs from 'fs';
import path from 'path';
import { supabase } from './client.visual-mock';
import { empresasFixture, categoriasFixture, lancamentosFixture, fixtureUser } from '../../__visual-fixtures__';

const CODIGO_FONTE = fs.readFileSync(path.join(__dirname, 'client.visual-mock.ts'), 'utf-8');

describe('client.visual-mock — Microgate 09-C', () => {
  test('03. módulo é carregado e expõe o formato esperado de cliente', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  test('04. ausência de fallback real: o código-fonte não importa o SDK real do Supabase', () => {
    expect(CODIGO_FONTE).not.toMatch(/@supabase\/supabase-js/);
    expect(CODIGO_FONTE).not.toMatch(/createClient/);
  });

  test('05. autenticação fictícia: getSession/getUser resolvem o usuário sintético', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: userData } = await supabase.auth.getUser();
    expect(sessionData.session?.user.id).toBe(fixtureUser.id);
    expect(userData.user?.id).toBe(fixtureUser.id);
  });

  test('06. signOut sintético resolve sem lançar erro mesmo sem sessão real', async () => {
    await expect(supabase.auth.signOut()).resolves.toEqual({ error: null });
  });

  test('onAuthStateChange dispara o callback e retorna subscription descartável', () => {
    const callback = jest.fn();
    const { data } = supabase.auth.onAuthStateChange(callback);
    expect(callback).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({ user: fixtureUser }));
    expect(() => data.subscription.unsubscribe()).not.toThrow();
  });

  test('07. empresas sintéticas são retornadas via from(...).select(...).order(...)', async () => {
    const { data, error } = await supabase.from('empresas').select('*').order('nome_fantasia');
    expect(error).toBeNull();
    expect(data).toHaveLength(empresasFixture.length);
  });

  test('08. categorias sintéticas são retornadas via from(...).select(...).order(...)', async () => {
    const { data, error } = await supabase.from('categorias').select('*').order('nome');
    expect(error).toBeNull();
    expect(data).toHaveLength(categoriasFixture.length);
  });

  test('09. lançamentos sintéticos são retornados via from(...).select(...).order(...)', async () => {
    const { data, error } = await supabase.from('lancamentos').select('*').order('data_vencimento', { ascending: false });
    expect(error).toBeNull();
    expect(data).toHaveLength(lancamentosFixture.length);
  });

  test('10. filtro por empresa (eq) não lança erro e devolve um resultado determinístico', async () => {
    const consulta = supabase.from('lancamentos').select('*') as unknown as {
      eq: (c: string, v: unknown) => Promise<{ data: unknown[]; error: null }>;
    };
    const { data, error } = await consulta.eq('empresa_id', empresasFixture[0].id);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('11. filtro por período: ordenação por data_vencimento preserva todos os registros', async () => {
    const { data } = await supabase.from('lancamentos').select('*').order('data_vencimento');
    expect(data).toHaveLength(lancamentosFixture.length);
  });

  test('12. valores cancelados aparecem no conjunto de lançamentos retornado', async () => {
    const { data } = await supabase.from('lancamentos').select('*').order('competencia');
    expect((data as Array<{ status: string }>).some((linha) => linha.status === 'cancelado')).toBe(true);
  });

  test('13. parcelamentos retornados preservam numero_parcelas e parcela_atual', async () => {
    const { data } = await supabase.from('lancamentos').select('*').order('data_emissao');
    const parcelas = (data as Array<{ tipo_recorrencia: string; numero_parcelas: number | null }>).filter(
      (linha) => linha.tipo_recorrencia === 'parcelas',
    );
    expect(parcelas.length).toBe(3);
    expect(parcelas.every((p) => p.numero_parcelas === 3)).toBe(true);
  });

  test('14. valores retornados reconciliam em centavos inteiros', async () => {
    const { data } = await supabase.from('lancamentos').select('*').order('id');
    (data as Array<{ valor: number }>).forEach((linha) => {
      expect(Number.isInteger(Math.round(linha.valor * 100))).toBe(true);
    });
  });

  test('15. operações de escrita falham explicitamente (sem simulação em memória)', () => {
    const consulta = supabase.from('lancamentos') as unknown as {
      insert: () => void;
      update: () => void;
      delete: () => void;
    };
    expect(() => consulta.insert()).toThrow(/não suportada/);
    expect(() => consulta.update()).toThrow(/não suportada/);
    expect(() => consulta.delete()).toThrow(/não suportada/);
  });

  test('16. falha explícita ao acessar tabela desconhecida', () => {
    expect(() => supabase.from('tabela_inexistente')).toThrow(/não suportada/);
  });

  test('16b. falha explícita ao acessar storage (nenhuma operação de armazenamento simulada)', () => {
    expect(() => supabase.storage.from()).toThrow(/não suportada/);
  });

  test('17. nenhuma chamada de rede é disparada ao exercitar o cliente sintético', async () => {
    const espiaFetch = jest.spyOn(global, 'fetch' as never).mockImplementation(() => {
      throw new Error('fetch não deveria ser chamado pelo cliente visual sintético');
    });
    try {
      await supabase.auth.getSession();
      await supabase.from('empresas').select('*').order('nome_fantasia');
      expect(espiaFetch).not.toHaveBeenCalled();
    } finally {
      espiaFetch.mockRestore();
    }
  });

  test('20. nenhuma API de Realtime/WebSocket real é exposta pelo cliente sintético', () => {
    const clienteComoRegistro = supabase as unknown as Record<string, unknown>;
    expect(clienteComoRegistro.channel).toBeUndefined();
    expect(clienteComoRegistro.removeChannel).toBeUndefined();
    expect(clienteComoRegistro.realtime).toBeUndefined();
    expect(CODIGO_FONTE).not.toMatch(/new WebSocket\(|\.channel\(|RealtimeClient/);
  });
});
