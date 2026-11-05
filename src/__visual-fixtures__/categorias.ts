import { USUARIO_FICTICIO_ID } from './usuario';
import type { Database } from '../integrations/supabase/types';

type CategoriaRow = Database['public']['Tables']['categorias']['Row'];

export const CATEGORIA_VENDAS_ID = '20000000-0000-4000-8000-000000000001';
export const CATEGORIA_SERVICOS_ID = '20000000-0000-4000-8000-000000000002';
export const CATEGORIA_FOLHA_ID = '20000000-0000-4000-8000-000000000003';
export const CATEGORIA_FORNECEDORES_ID = '20000000-0000-4000-8000-000000000004';

// Id propositalmente ausente da lista abaixo: usado em um lançamento
// sintético para exercitar o cenário "categoria desconhecida" (requisito
// 08 do microgate 09-C), sem precisar de um registro de categoria real.
export const CATEGORIA_DESCONHECIDA_ID = '20000000-0000-4000-8000-0000000000ff';

export const categoriasFixture: CategoriaRow[] = [
  {
    id: CATEGORIA_VENDAS_ID,
    nome: 'Vendas',
    tipo: 'credito',
    cor: '#2563eb',
    icone: 'trending-up',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
  },
  {
    id: CATEGORIA_SERVICOS_ID,
    nome: 'Serviços Prestados',
    tipo: 'credito',
    cor: '#0891b2',
    icone: 'briefcase',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
  },
  {
    id: CATEGORIA_FOLHA_ID,
    nome: 'Folha de Pagamento',
    tipo: 'debito',
    cor: '#dc2626',
    icone: 'users',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
  },
  {
    id: CATEGORIA_FORNECEDORES_ID,
    nome: 'Fornecedores',
    tipo: 'debito',
    cor: '#ea580c',
    icone: 'truck',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
  },
];
