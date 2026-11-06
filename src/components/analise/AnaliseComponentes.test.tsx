// Testes de responsividade/tipografia da Análise Gerencial (mobile 320–430px).
//
// Cobrem a causa raiz da rolagem horizontal identificada: o valor monetário
// formatado em pt-BR usa espaço não-quebrável (NBSP) entre "R$" e o número,
// então sem `break-words` + `min-w-0` no container um valor grande força o
// grid/flex a exceder a viewport em telas estreitas. Validação visual real
// em navegador fica registrada como pendente no relatório.
import { render } from '@testing-library/react';
import { Destaque, Indicador, ChartCard } from './AnaliseComponentes';
import { TYPOGRAPHY } from '../../styles/typography';
import { fmtMoeda } from '../../utils/format';

describe('AnaliseGerencial — Indicador', () => {
  it('exibe o valor monetário completo, sem truncamento', () => {
    const { container } = render(<Indicador titulo="Vencido" valor={fmtMoeda(-123456789.12)} />);
    const valor = container.querySelector('p.tabular-nums')!;
    expect(valor.textContent).toBe(fmtMoeda(-123456789.12));
    expect(valor.className).not.toMatch(/truncate|overflow-hidden/);
  });

  it('usa a escala tipográfica compartilhada (break-words, tamanho responsivo)', () => {
    const { container } = render(<Indicador titulo="Vence em 30 dias" valor={fmtMoeda(1000)} />);
    const valor = container.querySelector('p.tabular-nums')!;
    for (const cls of TYPOGRAPHY.valueMd.split(' ')) {
      expect(valor).toHaveClass(cls);
    }
  });

  it('o card permite encolher no grid (min-w-0), evitando estourar a viewport', () => {
    const { container } = render(<Indicador titulo="Vencido" valor={fmtMoeda(1000)} />);
    expect(container.firstChild).toHaveClass('min-w-0');
  });
});

describe('AnaliseGerencial — Destaque', () => {
  it('exibe o valor monetário completo, sem truncamento, mesmo em números grandes', () => {
    const valorGrande = fmtMoeda(-9876543210.5);
    const { container } = render(
      <Destaque rotulo="Posição líquida em aberto" valor={valorGrande} apoio="apoio" cor="#2a78d6" />,
    );
    const valor = container.querySelector('p.tabular-nums')!;
    expect(valor.textContent).toBe(valorGrande);
    expect(valor.className).not.toMatch(/truncate|overflow-hidden/);
    expect(valor).toHaveClass('break-words');
  });

  it('usa a escala tipográfica compartilhada de valor grande', () => {
    const { container } = render(<Destaque rotulo="A pagar em aberto" valor={fmtMoeda(1000)} apoio="apoio" cor="#eb6834" />);
    const valor = container.querySelector('p.tabular-nums')!;
    for (const cls of TYPOGRAPHY.valueLg.split(' ')) {
      expect(valor).toHaveClass(cls);
    }
  });

  it('o card permite encolher no grid (min-w-0)', () => {
    const { container } = render(<Destaque rotulo="A receber em aberto" valor={fmtMoeda(1000)} apoio="apoio" cor="#2a78d6" />);
    expect(container.firstChild).toHaveClass('min-w-0');
  });
});

describe('AnaliseGerencial — ChartCard', () => {
  it('permite encolher dentro de um grid (min-w-0), sem forçar rolagem lateral', () => {
    const { container } = render(
      <ChartCard titulo="Aging da carteira" grafico={<div />} tabela={<div />} />,
    );
    expect(container.firstChild).toHaveClass('min-w-0');
  });
});
