import { supabase } from '../integrations/supabase/client';

export interface Anexo {
  id: string;
  nome: string;
  signedUrl: string;
  size: number;
  storagePath: string;
  mimeType: string;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

function guessMimeType(nome: string): string {
  const ext = nome.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

export async function uploadAnexo(lancamentoId: string, file: File): Promise<void> {
  const userId = await getUserId();
  const storagePath = `${userId}/${lancamentoId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    console.error('[anexos] Storage upload error:', uploadError);
    throw new Error(`Storage: ${uploadError.message}`);
  }

  const { error: dbError } = await supabase.from('anexos').insert({
    lancamento_id: lancamentoId,
    nome: file.name,
    tipo: 'comprovante' as const,
    url: storagePath,
    tamanho: file.size,
    user_id: userId,
  });

  if (dbError) {
    console.error('[anexos] DB insert error:', dbError);
    throw new Error(`DB: ${dbError.message}`);
  }
}

export async function uploadAnexos(lancamentoId: string, files: File[]): Promise<void> {
  await Promise.allSettled(files.map((f) => uploadAnexo(lancamentoId, f)));
}

export async function getAnexos(lancamentoId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from('anexos')
    .select('id, nome, url, tamanho')
    .eq('lancamento_id', lancamentoId)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  const result = await Promise.all(
    data.map(async (a) => {
      const { data: urlData } = await supabase.storage
        .from('comprovantes')
        .createSignedUrl(a.url, 3600);
      return {
        id: a.id,
        nome: a.nome,
        signedUrl: urlData?.signedUrl ?? '',
        size: a.tamanho,
        storagePath: a.url,
        mimeType: guessMimeType(a.nome),
      };
    })
  );

  return result.filter((a) => a.signedUrl);
}

export async function deleteAnexo(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from('comprovantes').remove([storagePath]);
  await supabase.from('anexos').delete().eq('id', id);
}
