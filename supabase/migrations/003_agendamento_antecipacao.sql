-- Agendamento: quantidade de meses e antecipação por título
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS quantidade_meses  INTEGER CHECK (quantidade_meses IS NULL OR quantidade_meses BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS dias_antecipacao  INTEGER CHECK (dias_antecipacao IS NULL OR dias_antecipacao BETWEEN 0 AND 60),
  ADD COLUMN IF NOT EXISTS data_antecipacao  DATE;
