import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isBefore, startOfMonth, addMonths } from 'date-fns';
import { supabase } from '../integrations/supabase/client';
import { uploadAnexos } from '../services/anexos';
import type { Lancamento } from '../types';
import type { Database } from '../integrations/supabase/types';

type Row = Database['public']['Tables']['lancamentos']['Row'];

function toLancamento(row: Row): Lancamento {
  return {
    id: row.id,
    tipo: row.tipo as 'credito' | 'debito',
    descricao: row.descricao,
    empresaId: row.empresa_id,
    categoriaId: row.categoria_id,
    valor: Number(row.valor),
    valorTotal: Number(row.valor_total),
    dataEmissao: row.data_emissao,
    dataVencimento: row.data_vencimento,
    dataPagamento: row.data_pagamento ?? undefined,
    status: resolveStatus(row),
    tipoRecorrencia: row.tipo_recorrencia as 'avista' | 'fixo' | 'parcelas',
    recorrencia: row.recorrencia as Lancamento['recorrencia'],
    numeroParcelas: row.numero_parcelas ?? undefined,
    parcelaAtual: row.parcela_atual ?? undefined,
    diaVencimento: row.dia_vencimento ?? undefined,
    observacoes: row.observacoes ?? undefined,
    competencia: row.competencia,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    anexos: [],
  };
}

function resolveStatus(row: Row): Lancamento['status'] {
  if (row.status !== 'pendente') return row.status as Lancamento['status'];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (isBefore(parseISO(row.data_vencimento), hoje)) return 'vencido';
  return 'pendente';
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

export function useLancamentos() {
  const qc = useQueryClient();

  const { data: lancamentosData, isLoading } = useQuery<Lancamento[]>({
    queryKey: ['lancamentos'],
    queryFn: async (): Promise<Lancamento[]> => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toLancamento);
    },
  });
  const lancamentos: Lancamento[] = lancamentosData ?? [];

  const createMutation = useMutation({
    mutationFn: async (dados: Omit<Lancamento, 'id' | 'createdAt' | 'updatedAt' | 'empresa' | 'categoria'>) => {
      const userId = await getUserId();
      const now = new Date().toISOString();

      if (dados.tipoRecorrencia === 'parcelas' && dados.numeroParcelas) {
        const rows = Array.from({ length: dados.numeroParcelas }, (_, i) => {
          const venc = new Date(dados.dataVencimento);
          venc.setMonth(venc.getMonth() + i);
          return {
            tipo: dados.tipo,
            descricao: `${dados.descricao} (${i + 1}/${dados.numeroParcelas})`,
            empresa_id: dados.empresaId,
            categoria_id: dados.categoriaId,
            valor: dados.valor,
            valor_total: dados.valorTotal,
            data_emissao: dados.dataEmissao,
            data_vencimento: format(venc, 'yyyy-MM-dd'),
            status: 'pendente' as const,
            tipo_recorrencia: dados.tipoRecorrencia,
            recorrencia: dados.recorrencia ?? null,
            numero_parcelas: dados.numeroParcelas,
            parcela_atual: i + 1,
            dia_vencimento: dados.diaVencimento ?? null,
            observacoes: dados.observacoes ?? null,
            competencia: format(venc, 'yyyy-MM'),
            user_id: userId,
            created_at: now,
            updated_at: now,
          };
        });
        const { error } = await supabase.from('lancamentos').insert(rows);
        if (error) throw error;
        return;
      }

      // Conta Fixa: gera entradas reais para os próximos ~2 anos
      if (dados.tipoRecorrencia === 'fixo') {
        const INTERVALO_MESES: Record<string, number> = {
          mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
        };
        const recorrencia = dados.recorrencia ?? 'mensal';
        const intervalo = INTERVALO_MESES[recorrencia] ?? 1;
        const diaVenc = dados.diaVencimento ?? parseISO(dados.dataVencimento).getDate();
        const specifiedMonth = startOfMonth(parseISO(dados.dataVencimento));
        const currentMonth = startOfMonth(new Date());
        let mesCursor = specifiedMonth >= currentMonth ? specifiedMonth : currentMonth;
        const numEntradas = Math.ceil(24 / intervalo); // ~2 anos de ocorrências
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

        const rows = Array.from({ length: numEntradas }, () => {
          const maxDay = new Date(mesCursor.getFullYear(), mesCursor.getMonth() + 1, 0).getDate();
          const dia = Math.min(diaVenc, maxDay);
          const vencDate = new Date(mesCursor.getFullYear(), mesCursor.getMonth(), dia);
          const row = {
            tipo: dados.tipo,
            descricao: dados.descricao,
            empresa_id: dados.empresaId,
            categoria_id: dados.categoriaId,
            valor: dados.valor,
            valor_total: dados.valorTotal,
            data_emissao: dados.dataEmissao,
            data_vencimento: format(vencDate, 'yyyy-MM-dd'),
            status: (vencDate < hoje ? 'vencido' : 'pendente') as 'vencido' | 'pendente',
            tipo_recorrencia: 'fixo' as const,
            recorrencia: dados.recorrencia ?? null,
            numero_parcelas: null,
            parcela_atual: null,
            dia_vencimento: diaVenc,
            observacoes: dados.observacoes ?? null,
            competencia: format(mesCursor, 'yyyy-MM'),
            user_id: userId,
            created_at: now,
            updated_at: now,
          };
          mesCursor = addMonths(mesCursor, intervalo);
          return row;
        });

        const { data: insertedRows, error: fixoError } = await supabase
          .from('lancamentos').insert(rows).select('id');
        if (fixoError) throw fixoError;
        // Retorna o ID do primeiro (mês atual) para upload de anexo
        return (insertedRows?.[0]?.id ?? undefined) as string | undefined;
      }

      const { data: inserted, error } = await supabase.from('lancamentos').insert({
        tipo: dados.tipo,
        descricao: dados.descricao,
        empresa_id: dados.empresaId,
        categoria_id: dados.categoriaId,
        valor: dados.valor,
        valor_total: dados.valorTotal,
        data_emissao: dados.dataEmissao,
        data_vencimento: dados.dataVencimento,
        status: dados.status,
        tipo_recorrencia: dados.tipoRecorrencia,
        recorrencia: dados.recorrencia ?? null,
        numero_parcelas: dados.numeroParcelas ?? null,
        parcela_atual: dados.parcelaAtual ?? null,
        dia_vencimento: dados.diaVencimento ?? null,
        observacoes: dados.observacoes ?? null,
        competencia: dados.competencia,
        user_id: userId,
        created_at: now,
        updated_at: now,
      }).select('id').single();
      if (error) throw error;
      return inserted.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Lancamento> }) => {
      const patch: Record<string, unknown> = {};
      if (dados.tipo !== undefined) patch.tipo = dados.tipo;
      if (dados.descricao !== undefined) patch.descricao = dados.descricao;
      if (dados.empresaId !== undefined) patch.empresa_id = dados.empresaId;
      if (dados.categoriaId !== undefined) patch.categoria_id = dados.categoriaId;
      if (dados.valor !== undefined) patch.valor = dados.valor;
      if (dados.valorTotal !== undefined) patch.valor_total = dados.valorTotal;
      if (dados.dataEmissao !== undefined) patch.data_emissao = dados.dataEmissao;
      if (dados.dataVencimento !== undefined) patch.data_vencimento = dados.dataVencimento;
      if (dados.dataPagamento !== undefined) patch.data_pagamento = dados.dataPagamento;
      if (dados.status !== undefined) patch.status = dados.status;
      if (dados.tipoRecorrencia !== undefined) patch.tipo_recorrencia = dados.tipoRecorrencia;
      if (dados.recorrencia !== undefined) patch.recorrencia = dados.recorrencia;
      if (dados.numeroParcelas !== undefined) patch.numero_parcelas = dados.numeroParcelas;
      if (dados.parcelaAtual !== undefined) patch.parcela_atual = dados.parcelaAtual;
      if (dados.diaVencimento !== undefined) patch.dia_vencimento = dados.diaVencimento;
      if (dados.observacoes !== undefined) patch.observacoes = dados.observacoes;
      if (dados.competencia !== undefined) patch.competencia = dados.competencia;
      const { error } = await supabase.from('lancamentos').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  const baixarMutation = useMutation({
    mutationFn: async ({ id, dataPagamento, files }: { id: string; dataPagamento: string; files?: File[] }) => {
      const lancamento = (lancamentos as Lancamento[]).find((l: Lancamento) => l.id === id);
      const novoStatus = lancamento?.tipo === 'credito' ? 'recebido' : 'pago';
      const { error } = await supabase
        .from('lancamentos')
        .update({ status: novoStatus, data_pagamento: dataPagamento })
        .eq('id', id);
      if (error) throw error;
      if (files && files.length > 0) {
        await uploadAnexos(id, files);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  return {
    lancamentos,
    isLoading,
    addLancamento: (dados: Omit<Lancamento, 'id' | 'createdAt' | 'updatedAt' | 'empresa' | 'categoria'>) =>
      createMutation.mutateAsync(dados),
    updateLancamento: (id: string, dados: Partial<Lancamento>) =>
      updateMutation.mutateAsync({ id, dados }),
    deleteLancamento: (id: string) => deleteMutation.mutateAsync(id),
    baixarLancamento: (id: string, dataPagamento: string, files?: File[]) =>
      baixarMutation.mutateAsync({ id, dataPagamento, files }),
    getLancamentosPagar: () => (lancamentos as Lancamento[]).filter((l: Lancamento) => l.tipo === 'debito'),
    getLancamentosReceber: () => (lancamentos as Lancamento[]).filter((l: Lancamento) => l.tipo === 'credito'),
  };
}
