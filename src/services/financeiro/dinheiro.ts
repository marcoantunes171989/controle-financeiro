// Contrato monetário do núcleo financeiro (Microgate 04.4).
//
// O banco armazena valores em NUMERIC(15,2). A camada de acesso atual
// (src/hooks/useLancamentos.ts) converte esses valores com `Number(row.valor)`
// antes de expor `Lancamento.valor: number` ao restante da aplicação. Essa
// conversão já pode ter introduzido imprecisão de ponto flutuante antes de
// qualquer dado chegar a este módulo — o núcleo financeiro NÃO afirma
// recuperar precisão perdida nessa etapa anterior. Ver Seção 07 do
// characterization test (src/utils/calculos.characterization.test.ts).
//
// Dentro deste módulo, todo valor monetário é representado como um inteiro
// de centavos (Centavos), nunca como float. Entradas são validadas e
// convertidas para centavos de forma exata ou rejeitadas explicitamente.

export type Centavos = number;

export interface ValorInvalido {
  valido: false;
  motivo: 'nao_numerico' | 'escala_invalida' | 'fora_do_limite_seguro' | 'nao_finito';
  entrada: unknown;
}

export interface ValorValido {
  valido: true;
  centavos: Centavos;
}

export type ResultadoConversao = ValorValido | ValorInvalido;

// Number.MAX_SAFE_INTEGER é 2^53 - 1. Qualquer quantidade de centavos acima
// disso não tem representação exata garantida em um `number` IEEE-754.
const LIMITE_SEGURO_CENTAVOS = Number.MAX_SAFE_INTEGER;

/**
 * Converte um valor monetário (string ou number) para centavos exatos.
 *
 * - string: tratada como representação textual confiável (preferível,
 *   pois evita a imprecisão binária de um `number` decimal). Deve ter
 *   no máximo duas casas decimais.
 * - number: aceito por compatibilidade com `Lancamento.valor`/`valorTotal`
 *   (tipados como number nas interfaces existentes). Convertido via
 *   arredondamento para a casa de centavos mais próxima dentro de uma
 *   tolerância de ponto flutuante — não corrige erros de precisão já
 *   presentes no number recebido, apenas evita introduzir novos.
 */
export function paraCentavos(valor: string | number): ResultadoConversao {
  if (typeof valor === 'string') return stringParaCentavos(valor);
  return numberParaCentavos(valor);
}

function stringParaCentavos(valor: string): ResultadoConversao {
  const texto = valor.trim();
  const padrao = /^-?\d+(\.\d{1,2})?$/;
  if (!padrao.test(texto)) {
    return { valido: false, motivo: 'escala_invalida', entrada: valor };
  }
  const [parteInteira, parteDecimal = ''] = texto.replace('-', '').split('.');
  const negativo = texto.startsWith('-');
  const centavosDecimais = parteDecimal.padEnd(2, '0');
  const inteiroStr = parteInteira + centavosDecimais;
  const centavos = Number(inteiroStr) * (negativo ? -1 : 1);
  if (!Number.isFinite(centavos)) {
    return { valido: false, motivo: 'nao_finito', entrada: valor };
  }
  if (Math.abs(centavos) > LIMITE_SEGURO_CENTAVOS) {
    return { valido: false, motivo: 'fora_do_limite_seguro', entrada: valor };
  }
  return { valido: true, centavos };
}

function numberParaCentavos(valor: number): ResultadoConversao {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    return { valido: false, motivo: 'nao_numerico', entrada: valor };
  }
  if (!Number.isFinite(valor)) {
    return { valido: false, motivo: 'nao_finito', entrada: valor };
  }
  if (Math.abs(valor) > LIMITE_SEGURO_CENTAVOS / 100) {
    return { valido: false, motivo: 'fora_do_limite_seguro', entrada: valor };
  }
  // Arredonda para o centavo mais próximo. Isso NÃO corrige imprecisão já
  // acumulada antes da chamada (ex.: Number(row.valor) upstream); apenas
  // garante que a conversão para centavos em si seja a melhor aproximação
  // exata do number recebido, sem acumular erro adicional de soma em float.
  const centavos = Math.round(valor * 100);
  return { valido: true, centavos };
}

/** Soma uma lista de centavos exatamente, como inteiros. */
export function somarCentavos(valores: Centavos[]): Centavos {
  return valores.reduce((acc, v) => acc + v, 0);
}

/** Converte centavos de volta para um number decimal (uso apenas para exibição). */
export function centavosParaNumber(centavos: Centavos): number {
  return centavos / 100;
}
