import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Empresa } from '../types';

const empresasSeed: Empresa[] = [
  { id: '1', razaoSocial: 'TechSol Ltda', nomeFantasia: 'TechSol', cnpj: '12.345.678/0001-90', telefone: '(11) 98765-4321', email: 'contato@techsol.com.br', cidade: 'São Paulo', estado: 'SP', cor: '#1D9E75', ativo: true, createdAt: '2024-01-01' },
  { id: '2', razaoSocial: 'Mercado Bom Ltda', nomeFantasia: 'Mercado Bom', cnpj: '98.765.432/0001-01', telefone: '(11) 91234-5678', email: 'financeiro@mercadobom.com.br', cidade: 'Campinas', estado: 'SP', cor: '#378ADD', ativo: true, createdAt: '2024-01-01' },
  { id: '3', razaoSocial: 'Construtora ABC S/A', nomeFantasia: 'ABC Construções', cnpj: '11.222.333/0001-44', telefone: '(11) 94567-8901', email: 'abc@construtora.com.br', cidade: 'São Paulo', estado: 'SP', cor: '#BA7517', ativo: true, createdAt: '2024-01-01' },
];

interface EmpresaState {
  empresas: Empresa[];
  addEmpresa: (e: Omit<Empresa, 'id' | 'createdAt'>) => void;
  updateEmpresa: (id: string, dados: Partial<Empresa>) => void;
  deleteEmpresa: (id: string) => void;
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresas: empresasSeed,
      addEmpresa: (dados) =>
        set((s) => ({
          empresas: [...s.empresas, { ...dados, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateEmpresa: (id, dados) =>
        set((s) => ({ empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...dados } : e)) })),
      deleteEmpresa: (id) =>
        set((s) => ({ empresas: s.empresas.filter((e) => e.id !== id) })),
    }),
    { name: 'empresa-store' }
  )
);
