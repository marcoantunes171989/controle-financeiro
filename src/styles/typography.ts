/**
 * Escala tipografica global do Finance Control.
 *
 * Centraliza em um unico lugar as combinacoes de classes Tailwind usadas para
 * titulos, rotulos e valores financeiros, evitando que cada tela declare sua
 * propria variacao. Mantidas como strings de utilitarios Tailwind (em vez de
 * classes customizadas via @apply) para que o className renderizado continue
 * literal e inspecionavel/testavel via toHaveClass/querySelector.
 *
 * `break-words` nas classes de valor evita rolagem horizontal quando um
 * numero formatado (ex.: moeda em pt-BR, que usa espaco nao-quebravel entre
 * "R$" e o numero) nao cabe no container em telas estreitas.
 */
export const TYPOGRAPHY = {
  pageTitle: 'text-base sm:text-lg font-semibold text-foreground truncate',
  sectionTitle: 'text-sm sm:text-base font-semibold text-foreground',
  cardTitle: 'text-sm font-semibold text-foreground',
  label: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  caption: 'text-xs text-muted-foreground',
  valueLg: 'text-3xl sm:text-4xl lg:text-5xl font-semibold tabular-nums tracking-tight break-words',
  valueMd: 'text-xl sm:text-2xl font-semibold tabular-nums break-words',
} as const;
