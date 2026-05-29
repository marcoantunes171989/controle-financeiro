import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import type { Empresa } from '../types';
import type { Database } from '../integrations/supabase/types';

type Row = Database['public']['Tables']['empresas']['Row'];

function toEmpresa(row: Row): Empresa {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    telefone: row.telefone,
    email: row.email,
    cidade: row.cidade,
    estado: row.estado,
    cor: row.cor,
    ativo: row.ativo,
    createdAt: row.created_at,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

export function useEmpresas() {
  const qc = useQueryClient();

  const { data: empresasData, isLoading } = useQuery<Empresa[]>({
    queryKey: ['empresas'],
    queryFn: async (): Promise<Empresa[]> => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome_fantasia');
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toEmpresa);
    },
  });
  const empresas: Empresa[] = empresasData ?? [];

  const createMutation = useMutation({
    mutationFn: async (dados: Omit<Empresa, 'id' | 'createdAt'>) => {
      const userId = await getUserId();
      const { error } = await supabase.from('empresas').insert({
        razao_social: dados.razaoSocial,
        nome_fantasia: dados.nomeFantasia,
        cnpj: dados.cnpj,
        telefone: dados.telefone,
        email: dados.email,
        cidade: dados.cidade,
        estado: dados.estado,
        cor: dados.cor,
        ativo: dados.ativo,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Empresa> }) => {
      const patch: Record<string, unknown> = {};
      if (dados.razaoSocial !== undefined) patch.razao_social = dados.razaoSocial;
      if (dados.nomeFantasia !== undefined) patch.nome_fantasia = dados.nomeFantasia;
      if (dados.cnpj !== undefined) patch.cnpj = dados.cnpj;
      if (dados.telefone !== undefined) patch.telefone = dados.telefone;
      if (dados.email !== undefined) patch.email = dados.email;
      if (dados.cidade !== undefined) patch.cidade = dados.cidade;
      if (dados.estado !== undefined) patch.estado = dados.estado;
      if (dados.cor !== undefined) patch.cor = dados.cor;
      if (dados.ativo !== undefined) patch.ativo = dados.ativo;
      const { error } = await supabase.from('empresas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  });

  return {
    empresas,
    isLoading,
    addEmpresa: (dados: Omit<Empresa, 'id' | 'createdAt'>) => createMutation.mutateAsync(dados),
    updateEmpresa: (id: string, dados: Partial<Empresa>) => updateMutation.mutateAsync({ id, dados }),
    deleteEmpresa: (id: string) => deleteMutation.mutateAsync(id),
  };
}
