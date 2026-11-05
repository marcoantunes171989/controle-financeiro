// Núcleo financeiro compartilhado (Microgate 04.4).
//
// Módulo público: todas as funções financeiras puras e seus tipos são
// reexportados a partir daqui. Implementações vivem em
// src/services/financeiro/*.ts — nenhum cálculo é implementado duas vezes.
//
// Regras de design (ver pasted spec do Microgate 04.4):
// - Funções puras, sem efeitos colaterais, sem rede, sem localStorage.
// - Recebem lançamentos, períodos, filtros e datas de referência
//   explicitamente — nunca leem estado global implícito.
// - Nunca modificam os lançamentos recebidos.
// - Não substituem nem alteram src/utils/calculos.ts (funções legadas
//   consumidas pelas telas atuais permanecem intocadas).
export * from './financeiro/dinheiro';
export * from './financeiro/tipos';
export * from './financeiro/helpers';
export * from './financeiro/regimeCaixa';
export * from './financeiro/previsao';
export * from './financeiro/competencia';
export * from './financeiro/indicadores';
export * from './financeiro/inconsistencias';
