import { USUARIO_FICTICIO_ID } from './usuario';
import type { Database } from '../integrations/supabase/types';

type EmpresaRow = Database['public']['Tables']['empresas']['Row'];

export const EMPRESA_ALFA_ID = '10000000-0000-4000-8000-000000000001';
export const EMPRESA_BETA_ID = '10000000-0000-4000-8000-000000000002';

export const empresasFixture: EmpresaRow[] = [
  {
    id: EMPRESA_ALFA_ID,
    razao_social: 'Alfa Comércio Fictício Ltda',
    nome_fantasia: 'Alfa Visual',
    cnpj: '00.000.000/0001-91',
    telefone: '(11) 0000-0001',
    email: 'contato@alfa.visual.local',
    cidade: 'São Paulo',
    estado: 'SP',
    cor: '#2563eb',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
    created_at: '2026-01-05T00:00:00.000Z',
  },
  {
    id: EMPRESA_BETA_ID,
    razao_social: 'Beta Serviços Fictícios S.A.',
    nome_fantasia: 'Beta Visual',
    cnpj: '00.000.000/0002-72',
    telefone: '(21) 0000-0002',
    email: 'contato@beta.visual.local',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    cor: '#16a34a',
    ativo: true,
    user_id: USUARIO_FICTICIO_ID,
    created_at: '2026-01-06T00:00:00.000Z',
  },
];
