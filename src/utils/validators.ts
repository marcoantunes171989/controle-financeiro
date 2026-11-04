import { z } from 'zod';
import { validarCnpj } from './masks';

const nanToUndefined = (v: unknown) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v);

export const lancamentoSchema = z.object({
  tipo: z.enum(['credito', 'debito']),
  descricao: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  empresaId: z.string().min(1, 'Selecione uma empresa'),
  categoriaId: z.string().min(1, 'Selecione uma categoria'),
  valor: z.number({ invalid_type_error: 'Informe o valor' }).positive('Valor deve ser positivo'),
  dataEmissao: z.string().min(1, 'Informe a data de emissão'),
  dataVencimento: z.string().min(1, 'Informe o vencimento'),
  tipoRecorrencia: z.enum(['avista', 'fixo', 'parcelas']),
  numeroParcelas: z.number().int().min(2).max(120).optional(),
  recorrencia: z.enum(['mensal', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
  diaVencimento: z.number().int().min(1).max(31).optional(),
  quantidadeMeses: z.preprocess(nanToUndefined, z.number().int().min(1, 'Mínimo 1 mês').max(120, 'Máximo 120 meses').optional()),
  diasAntecipacao: z.preprocess(nanToUndefined, z.number().int().min(0, 'Não pode ser negativo').max(60, 'Máximo 60 dias').optional()),
  observacoes: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.tipoRecorrencia === 'fixo') {
    if (!val.recorrencia) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione a recorrência', path: ['recorrencia'] });
    }
    if (!val.diaVencimento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o dia de vencimento', path: ['diaVencimento'] });
    }
    if (!val.quantidadeMeses) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a quantidade de meses', path: ['quantidadeMeses'] });
    }
  }
});

export type LancamentoFormData = z.infer<typeof lancamentoSchema>;

export const empresaSchema = z.object({
  razaoSocial: z.string().min(3),
  nomeFantasia: z.string().min(2),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
    .refine(validarCnpj, 'CNPJ inválido'),
  telefone: z.string().refine((val) => {
    const d = val.replace(/\D/g, '');
    if (d.startsWith('0800')) return d.length === 11;
    return d.length === 10 || d.length === 11;
  }, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  cidade: z.string().min(2),
  estado: z.string().length(2, 'Use a sigla do estado'),
  cor: z.string(),
});

export type EmpresaFormData = z.infer<typeof empresaSchema>;
