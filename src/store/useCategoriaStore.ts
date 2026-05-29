import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Categoria } from '../types';

const categoriasSeed: Categoria[] = [
  { id: 'c1',  nome: 'Aluguel',    tipo: 'debito',  cor: '#E24B4A', icone: 'building-2',    ativo: true },
  { id: 'c2',  nome: 'Energia',    tipo: 'debito',  cor: '#BA7517', icone: 'zap',           ativo: true },
  { id: 'c3',  nome: 'Internet',   tipo: 'debito',  cor: '#7F77DD', icone: 'wifi',          ativo: true },
  { id: 'c4',  nome: 'Pessoal',    tipo: 'debito',  cor: '#D4537E', icone: 'users',         ativo: true },
  { id: 'c5',  nome: 'Fornecedor', tipo: 'debito',  cor: '#888780', icone: 'truck',         ativo: true },
  { id: 'c6',  nome: 'Impostos',   tipo: 'debito',  cor: '#E24B4A', icone: 'file-text',     ativo: true },
  { id: 'c7',  nome: 'Manutenção', tipo: 'debito',  cor: '#BA7517', icone: 'tool',          ativo: true },
  { id: 'c8',  nome: 'Marketing',  tipo: 'debito',  cor: '#7F77DD', icone: 'megaphone',     ativo: true },
  { id: 'c9',  nome: 'Serviços',   tipo: 'credito', cor: '#1D9E75', icone: 'briefcase',     ativo: true },
  { id: 'c10', nome: 'Vendas',     tipo: 'credito', cor: '#1D9E75', icone: 'shopping-cart', ativo: true },
  { id: 'c11', nome: 'Comissões',  tipo: 'credito', cor: '#378ADD', icone: 'coins',         ativo: true },
  { id: 'c12', nome: 'Outros',     tipo: 'credito', cor: '#888780', icone: 'more-horizontal', ativo: true },
];

interface CategoriaState {
  categorias: Categoria[];
  addCategoria: (c: Omit<Categoria, 'id'>) => void;
  updateCategoria: (id: string, dados: Partial<Categoria>) => void;
  deleteCategoria: (id: string) => void;
}

export const useCategoriaStore = create<CategoriaState>()(
  persist(
    (set) => ({
      categorias: categoriasSeed,
      addCategoria: (dados) =>
        set((s) => ({ categorias: [...s.categorias, { ...dados, id: crypto.randomUUID() }] })),
      updateCategoria: (id, dados) =>
        set((s) => ({ categorias: s.categorias.map((c) => (c.id === id ? { ...c, ...dados } : c)) })),
      deleteCategoria: (id) =>
        set((s) => ({ categorias: s.categorias.filter((c) => c.id !== id) })),
    }),
    { name: 'categoria-store' }
  )
);
