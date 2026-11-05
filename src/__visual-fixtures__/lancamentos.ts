import { USUARIO_FICTICIO_ID } from './usuario';
import { EMPRESA_ALFA_ID, EMPRESA_BETA_ID } from './empresas';
import {
  CATEGORIA_VENDAS_ID,
  CATEGORIA_SERVICOS_ID,
  CATEGORIA_FOLHA_ID,
  CATEGORIA_FORNECEDORES_ID,
  CATEGORIA_DESCONHECIDA_ID,
} from './categorias';
import { diasAPartirDoRelogio, mesesAPartirDoRelogio, competenciaAPartirDoRelogio } from './relogio';
import type { Database } from '../integrations/supabase/types';

type LancamentoRow = Database['public']['Tables']['lancamentos']['Row'];

// Todos os valores monetários são definidos em centavos (inteiros) e só
// convertidos para reais no momento de montar a linha, evitando arredondamento
// cumulativo de ponto flutuante ao reconciliar parcelas e totais.
function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

const CRIADO_EM = '2026-10-01T00:00:00.000Z';

function linhaBase(
  overrides: Partial<LancamentoRow> & Pick<LancamentoRow, 'id' | 'tipo' | 'descricao' | 'empresa_id' | 'categoria_id' | 'status' | 'data_emissao' | 'data_vencimento' | 'competencia'>,
  valorCentavos: number,
  valorTotalCentavos: number = valorCentavos,
): LancamentoRow {
  return {
    valor: centavosParaReais(valorCentavos),
    valor_total: centavosParaReais(valorTotalCentavos),
    data_pagamento: null,
    tipo_recorrencia: 'avista',
    recorrencia: null,
    numero_parcelas: null,
    parcela_atual: null,
    dia_vencimento: null,
    quantidade_meses: null,
    dias_antecipacao: null,
    data_antecipacao: null,
    observacoes: null,
    user_id: USUARIO_FICTICIO_ID,
    created_at: CRIADO_EM,
    updated_at: CRIADO_EM,
    ...overrides,
  };
}

// 01 — Receita recebida
const receitaRecebida = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000001',
    tipo: 'credito',
    descricao: 'Venda de mercadorias — recebida',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_VENDAS_ID,
    status: 'recebido',
    data_emissao: diasAPartirDoRelogio(-20),
    data_vencimento: diasAPartirDoRelogio(-10),
    data_pagamento: diasAPartirDoRelogio(-10),
    competencia: competenciaAPartirDoRelogio(0),
  },
  350000, // R$ 3.500,00
);

// 02 — Receita pendente
const receitaPendente = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000002',
    tipo: 'credito',
    descricao: 'Prestação de serviço — a receber',
    empresa_id: EMPRESA_BETA_ID,
    categoria_id: CATEGORIA_SERVICOS_ID,
    status: 'pendente',
    data_emissao: diasAPartirDoRelogio(-5),
    data_vencimento: diasAPartirDoRelogio(15),
    competencia: competenciaAPartirDoRelogio(0),
  },
  180000, // R$ 1.800,00
);

// 03 — Despesa paga
const despesaPaga = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000003',
    tipo: 'debito',
    descricao: 'Folha de pagamento — paga',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_FOLHA_ID,
    status: 'pago',
    data_emissao: diasAPartirDoRelogio(-15),
    data_vencimento: diasAPartirDoRelogio(-8),
    data_pagamento: diasAPartirDoRelogio(-8),
    competencia: competenciaAPartirDoRelogio(0),
  },
  420000, // R$ 4.200,00
);

// 04 — Despesa pendente
const despesaPendente = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000004',
    tipo: 'debito',
    descricao: 'Pagamento a fornecedor — a pagar',
    empresa_id: EMPRESA_BETA_ID,
    categoria_id: CATEGORIA_FORNECEDORES_ID,
    status: 'pendente',
    data_emissao: diasAPartirDoRelogio(-3),
    data_vencimento: diasAPartirDoRelogio(20),
    competencia: competenciaAPartirDoRelogio(0),
  },
  97500, // R$ 975,00
);

// 05 — Recebível vencido (não recebido, vencimento no passado)
const recebivelVencido = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000005',
    tipo: 'credito',
    descricao: 'Venda de mercadorias — vencida sem recebimento',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_VENDAS_ID,
    status: 'vencido',
    data_emissao: diasAPartirDoRelogio(-40),
    data_vencimento: diasAPartirDoRelogio(-25),
    competencia: competenciaAPartirDoRelogio(-1),
  },
  260000, // R$ 2.600,00
);

// 06 — Obrigação vencida (não paga, vencimento no passado)
const obrigacaoVencida = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000006',
    tipo: 'debito',
    descricao: 'Fornecedor — obrigação vencida sem pagamento',
    empresa_id: EMPRESA_BETA_ID,
    categoria_id: CATEGORIA_FOLHA_ID,
    status: 'vencido',
    data_emissao: diasAPartirDoRelogio(-35),
    data_vencimento: diasAPartirDoRelogio(-18),
    competencia: competenciaAPartirDoRelogio(-1),
  },
  158000, // R$ 1.580,00
);

// 07 — Lançamento cancelado
const lancamentoCancelado = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000007',
    tipo: 'credito',
    descricao: 'Serviço cancelado antes da execução',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_SERVICOS_ID,
    status: 'cancelado',
    data_emissao: diasAPartirDoRelogio(-12),
    data_vencimento: diasAPartirDoRelogio(5),
    competencia: competenciaAPartirDoRelogio(0),
  },
  90000, // R$ 900,00
);

// 08 — Parcelamento em 3x de R$ 500,00 (total R$ 1.500,00, reconciliado em
// centavos inteiros: 50000 * 3 === 150000, sem divisão flutuante).
const VALOR_PARCELA_CENTAVOS = 50000;
const NUMERO_PARCELAS = 3;
const VALOR_TOTAL_PARCELAMENTO_CENTAVOS = VALOR_PARCELA_CENTAVOS * NUMERO_PARCELAS;

const parcelamento: LancamentoRow[] = Array.from({ length: NUMERO_PARCELAS }, (_, indice) =>
  linhaBase(
    {
      id: `30000000-0000-4000-8000-00000000010${indice + 1}`,
      tipo: 'debito',
      descricao: `Equipamento financiado (${indice + 1}/${NUMERO_PARCELAS})`,
      empresa_id: EMPRESA_BETA_ID,
      categoria_id: CATEGORIA_FORNECEDORES_ID,
      status: indice === 0 ? 'pago' : 'pendente',
      tipo_recorrencia: 'parcelas',
      numero_parcelas: NUMERO_PARCELAS,
      parcela_atual: indice + 1,
      data_pagamento: indice === 0 ? diasAPartirDoRelogio(-2) : null,
      data_emissao: diasAPartirDoRelogio(-2),
      data_vencimento: mesesAPartirDoRelogio(indice, 10),
      competencia: competenciaAPartirDoRelogio(indice),
    },
    VALOR_PARCELA_CENTAVOS,
    VALOR_TOTAL_PARCELAMENTO_CENTAVOS,
  ),
);

// 09 — Recebimento em mês diferente do vencimento (vencimento em um mês,
// recebimento efetivo apenas no mês seguinte).
const recebimentoEmMesDiferente = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000020',
    tipo: 'credito',
    descricao: 'Serviço recebido um mês após o vencimento',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_SERVICOS_ID,
    status: 'recebido',
    data_emissao: mesesAPartirDoRelogio(-2, 1),
    data_vencimento: mesesAPartirDoRelogio(-1, 5),
    data_pagamento: mesesAPartirDoRelogio(0, 3),
    competencia: competenciaAPartirDoRelogio(-1),
  },
  128000, // R$ 1.280,00
);

// 10 — Pagamento após o vencimento (mesmo mês, mas com atraso de dias)
const pagamentoAposVencimento = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000021',
    tipo: 'debito',
    descricao: 'Fornecedor pago com atraso',
    empresa_id: EMPRESA_BETA_ID,
    categoria_id: CATEGORIA_FORNECEDORES_ID,
    status: 'pago',
    data_emissao: diasAPartirDoRelogio(-30),
    data_vencimento: diasAPartirDoRelogio(-22),
    data_pagamento: diasAPartirDoRelogio(-14),
    competencia: competenciaAPartirDoRelogio(-1),
  },
  64000, // R$ 640,00
);

// 11 — Categoria desconhecida: referencia um id de categoria que
// deliberadamente não existe em `categoriasFixture`.
const categoriaDesconhecida = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000030',
    tipo: 'debito',
    descricao: 'Lançamento com categoria não cadastrada',
    empresa_id: EMPRESA_ALFA_ID,
    categoria_id: CATEGORIA_DESCONHECIDA_ID,
    status: 'pendente',
    data_emissao: diasAPartirDoRelogio(-1),
    data_vencimento: diasAPartirDoRelogio(10),
    competencia: competenciaAPartirDoRelogio(0),
  },
  15000, // R$ 150,00
);

// 12 — Registro inconsistente, propositalmente: status "pendente" mas com
// `data_pagamento` preenchida — contradição usada para validar que a tela
// de visualização não quebra diante de dados inconsistentes.
const registroInconsistente = linhaBase(
  {
    id: '30000000-0000-4000-8000-000000000031',
    tipo: 'credito',
    descricao: 'Registro inconsistente: pendente com data de pagamento preenchida',
    empresa_id: EMPRESA_BETA_ID,
    categoria_id: CATEGORIA_VENDAS_ID,
    status: 'pendente',
    data_emissao: diasAPartirDoRelogio(-6),
    data_vencimento: diasAPartirDoRelogio(4),
    data_pagamento: diasAPartirDoRelogio(-1),
    competencia: competenciaAPartirDoRelogio(0),
  },
  22000, // R$ 220,00
);

export const lancamentosFixture: LancamentoRow[] = [
  receitaRecebida,
  receitaPendente,
  despesaPaga,
  despesaPendente,
  recebivelVencido,
  obrigacaoVencida,
  lancamentoCancelado,
  ...parcelamento,
  recebimentoEmMesDiferente,
  pagamentoAposVencimento,
  categoriaDesconhecida,
  registroInconsistente,
];
