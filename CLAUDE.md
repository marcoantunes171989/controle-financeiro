# Controle Financeiro — CLAUDE.md

## Visão Geral
Sistema de controle financeiro multi-empresa com lançamentos, contas a pagar/receber, categorias, agendamentos e relatórios.

## Stack
- **Frontend:** React 19 + TypeScript + TailwindCSS v3 + Radix UI
- **Build:** CRACO (Create React App + customizações)
- **Roteamento:** React Router DOM v6
- **Estado global:** Zustand
- **Dados server-side:** TanStack React Query
- **Formulários:** React Hook Form + Zod
- **Gráficos:** Recharts
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Vercel (deploy automático via push para `master`)

## Repositórios e Serviços
- **GitHub:** https://github.com/marcoantunes171989/controle-financeiro (branch `master`)
- **Vercel:** https://controle-financeiro-iota-kohl.vercel.app — deploy automático a cada push para `master`
- **Supabase:** Projeto `luuqslqqncjsvekjkpnd` — credenciais em `.env` (não commitado)

## Variáveis de Ambiente
Criar `.env` na raiz com:
```
REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key>
```

## Estrutura
```
src/
  components/
    layout/      # AppLayout, Sidebar, Topbar, ProtectedRoute
    shared/      # KpiCard, LancamentoRow, gráficos, modais
    ui/          # Componentes base (Button, Input, Modal, etc.)
  contexts/      # AuthContext (Supabase Auth)
  hooks/         # useLancamentos, useCategorias, useEmpresas
  integrations/
    supabase/    # client.ts, types.ts
  pages/         # Dashboard, Lancamentos, ContasPagar, ContasReceber,
                 # Categorias, Empresas, Agendamento, Relatorios, Login
  services/      # anexos.ts (upload Supabase Storage)
  store/         # Zustand stores (finance, empresa, categoria)
  types/         # index.ts — tipos globais
  utils/         # calculos.ts, format.ts, masks.ts, validators.ts
supabase/
  migrations/    # 001_initial_schema.sql, 002_storage_bucket.sql
```

## Banco de Dados (Supabase)
Tabelas: `empresas`, `categorias`, `lancamentos`, `anexos`
Todas com RLS — dados isolados por `user_id = auth.uid()`.
Migrations em `supabase/migrations/`.

## Comandos
```bash
npm start      # dev server em localhost:3000
npm run build  # build de produção
```

## Deploy
Push para `master` → Vercel detecta e faz deploy automático.
O hook Stop do Claude Code já faz isso automaticamente ao final de cada sessão.

## Convenções
- Nomes de arquivos: PascalCase para componentes, camelCase para utils/hooks
- Datas: formato brasileiro (dd/MM/yyyy) na UI, ISO no banco
- Valores monetários: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Status de lançamentos: `pendente | pago | recebido | vencido | cancelado`
- Tipos: `credito` (receita) | `debito` (despesa)
