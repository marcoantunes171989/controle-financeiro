import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import type { Categoria } from '../types';
import type { Database } from '../integrations/supabase/types';

type Row = Database['public']['Tables']['categorias']['Row'];

function toCategoria(row: Row): Categoria {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    cor: row.cor,
    icone: row.icone,
    ativo: row.ativo,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

export function useCategorias() {
  const qc = useQueryClient();

  const { data: categoriasData, isLoading } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toCategoria);
    },
  });
  const categorias: Categoria[] = categoriasData ?? [];

  const createMutation = useMutation({
    mutationFn: async (dados: Omit<Categoria, 'id'>) => {
      const userId = await getUserId();
      const { error } = await supabase.from('categorias').insert({
        nome: dados.nome,
        tipo: dados.tipo,
        cor: dados.cor,
        icone: dados.icone,
        ativo: dados.ativo,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Categoria> }) => {
      const { error } = await supabase
        .from('categorias')
        .update({ nome: dados.nome, tipo: dados.tipo, cor: dados.cor, icone: dados.icone, ativo: dados.ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });

  return {
    categorias,
    isLoading,
    addCategoria: (dados: Omit<Categoria, 'id'>) => createMutation.mutateAsync(dados),
    updateCategoria: (id: string, dados: Partial<Categoria>) => updateMutation.mutateAsync({ id, dados }),
    deleteCategoria: (id: string) => deleteMutation.mutateAsync(id),
  };
}
