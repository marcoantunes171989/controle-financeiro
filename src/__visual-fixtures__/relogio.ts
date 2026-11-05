// Relógio de referência exclusivo das fixtures sintéticas do Microgate 09-C.
//
// Todas as datas das fixtures (empresas, categorias, lançamentos) são
// calculadas a partir desta constante, e não de `new Date()` real, para que
// o conjunto de dados seja determinístico independentemente do dia em que
// a validação visual (09-D) for efetivamente executada.
export const RELOGIO_REFERENCIA_ISO = '2026-11-05T09:00:00.000Z';

export const RELOGIO_REFERENCIA = new Date(RELOGIO_REFERENCIA_ISO);

function paraYyyyMmDd(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function diasAPartirDoRelogio(deslocamentoDias: number): string {
  const data = new Date(RELOGIO_REFERENCIA);
  data.setUTCDate(data.getUTCDate() + deslocamentoDias);
  return paraYyyyMmDd(data);
}

export function mesesAPartirDoRelogio(deslocamentoMeses: number, dia = 5): string {
  const data = new Date(RELOGIO_REFERENCIA);
  data.setUTCMonth(data.getUTCMonth() + deslocamentoMeses, dia);
  return paraYyyyMmDd(data);
}

export function competenciaAPartirDoRelogio(deslocamentoMeses: number): string {
  const data = new Date(RELOGIO_REFERENCIA);
  data.setUTCMonth(data.getUTCMonth() + deslocamentoMeses, 1);
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}
