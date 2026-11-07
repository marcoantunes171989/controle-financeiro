// Fixture sintética de anexos (Microgate 09-C) — vazia de propósito: o
// microgate não simula upload/storage real, então nenhum lançamento
// sintético possui anexos associados. Usada apenas para que o cliente
// visual (`client.visual-mock.ts`) responda `from('anexos')` sem erro,
// permitindo auditar visualmente modais que consultam anexos.
export const anexosFixture: Array<{
  id: string;
  lancamento_id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  created_at: string;
}> = [];
