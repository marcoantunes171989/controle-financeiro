-- MIGRATION COMPLETA: controle-financeiro
-- Execute este SQL no Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/znwkxtfssauppnylxqna/sql/new

-- =============================================
-- Tabela: empresas
-- =============================================
CREATE TABLE IF NOT EXISTS empresas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social  TEXT        NOT NULL,
  nome_fantasia TEXT        NOT NULL,
  cnpj          TEXT        NOT NULL DEFAULT '',
  telefone      TEXT        NOT NULL DEFAULT '',
  email         TEXT        NOT NULL DEFAULT '',
  cidade        TEXT        NOT NULL DEFAULT '',
  estado        TEXT        NOT NULL DEFAULT '',
  cor           TEXT        NOT NULL DEFAULT '#1D9E75',
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_empresas" ON empresas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_empresas" ON empresas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_empresas" ON empresas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_empresas" ON empresas
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- Tabela: categorias
-- =============================================
CREATE TABLE IF NOT EXISTS categorias (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    TEXT    NOT NULL,
  tipo    TEXT    NOT NULL CHECK (tipo IN ('credito', 'debito')),
  cor     TEXT    NOT NULL DEFAULT '#1D9E75',
  icone   TEXT    NOT NULL DEFAULT 'briefcase',
  ativo   BOOLEAN NOT NULL DEFAULT true,
  user_id UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_categorias" ON categorias
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_categorias" ON categorias
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_categorias" ON categorias
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_categorias" ON categorias
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- Tabela: lancamentos
-- =============================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             TEXT           NOT NULL CHECK (tipo IN ('credito', 'debito')),
  descricao        TEXT           NOT NULL,
  empresa_id       UUID           NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  categoria_id     UUID           NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  valor            NUMERIC(15,2)  NOT NULL DEFAULT 0,
  valor_total      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  data_emissao     DATE           NOT NULL,
  data_vencimento  DATE           NOT NULL,
  data_pagamento   DATE,
  status           TEXT           NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','pago','recebido','vencido','cancelado')),
  tipo_recorrencia TEXT           NOT NULL DEFAULT 'avista'
                     CHECK (tipo_recorrencia IN ('avista','fixo','parcelas')),
  recorrencia      TEXT           CHECK (recorrencia IN ('mensal','bimestral','trimestral','semestral','anual')),
  numero_parcelas  INTEGER,
  parcela_atual    INTEGER,
  dia_vencimento   INTEGER,
  observacoes      TEXT,
  competencia      TEXT           NOT NULL,
  user_id          UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_lancamentos" ON lancamentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_lancamentos" ON lancamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_lancamentos" ON lancamentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_lancamentos" ON lancamentos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lancamentos_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- Tabela: anexos
-- =============================================
CREATE TABLE IF NOT EXISTS anexos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID        NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  tipo          TEXT        NOT NULL CHECK (tipo IN ('boleto','comprovante','nf','outro')),
  url           TEXT        NOT NULL,
  tamanho       INTEGER     NOT NULL DEFAULT 0,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_anexos" ON anexos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_anexos" ON anexos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_anexos" ON anexos
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Storage bucket: comprovantes
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('comprovantes', 'comprovantes', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Policies (drop first to allow idempotent re-runs)
DROP POLICY IF EXISTS "users_insert_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_select_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_delete_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_update_comprovantes"  ON storage.objects;

CREATE POLICY "users_insert_comprovantes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_select_comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_update_comprovantes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_delete_comprovantes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

