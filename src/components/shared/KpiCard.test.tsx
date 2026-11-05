// Testes de responsividade dos cards de indicador (mobile 320–430px).
//
// Cobrem apenas propriedades verificáveis por código/DOM: classes Tailwind
// aplicadas e preservação integral do valor monetário exibido (sem
// truncamento introduzido pelo componente). Validação visual real em
// navegador fica registrada como pendente no relatório.
import { render, screen } from '@testing-library/react';
import KpiCard from './KpiCard';
import { fmtMoeda } from '../../utils/format';

// fmtMoeda usa Intl e intercala um espaço NBSP (U+00A0) entre "R$" e o
// número; o normalizador padrão do Testing Library colapsa esse NBSP em
// espaço comum ao ler o texto do DOM, então getByText(fmtMoeda(...)) pode
// falhar por divergência de espaço. Comparar via textContent evita isso.
function valorExibido(container: HTMLElement) {
  return container.querySelector('p.font-semibold')!;
}

describe('KpiCard — responsividade mobile', () => {
  it('não aplica classes de truncamento (truncate/overflow-hidden) ao valor exibido', () => {
    const { container } = render(<KpiCard title="Receitas Recebidas" value={1234.56} />);
    const valor = valorExibido(container);
    expect(valor.textContent).toBe(fmtMoeda(1234.56));
    expect(valor.className).not.toMatch(/truncate|overflow-hidden/);
    expect(valor).toHaveClass('break-words');
  });

  it('preserva centavos e sinal negativo em valores monetários grandes', () => {
    const { container } = render(<KpiCard title="Resultado de Caixa" value={-123456.78} colorVariant="red" />);
    expect(valorExibido(container).textContent).toBe(fmtMoeda(-123456.78));
  });

  it('preserva casas decimais em percentuais', () => {
    render(<KpiCard title="Margem de Caixa" value={-12.345} format="percentual" />);
    expect(screen.getByText('-12.3%')).toBeInTheDocument();
  });

  it('título longo permite quebra de linha em vez de ser cortado', () => {
    const tituloLongo = 'Obrigações Vencidas no Período Consolidado';
    render(<KpiCard title={tituloLongo} value={100} />);
    const titulo = screen.getByText(tituloLongo);
    expect(titulo.className).not.toMatch(/truncate|overflow-hidden/);
    expect(titulo).toHaveClass('break-words');
  });

  it('usa tipografia responsiva no valor (menor em telas pequenas, maior a partir de sm)', () => {
    const { container } = render(<KpiCard title="Despesas Pagas" value={500} />);
    expect(valorExibido(container)).toHaveClass('text-xl', 'sm:text-2xl');
  });

  it('ícone não encolhe (shrink-0) para não comprimir o valor em telas estreitas', () => {
    render(<KpiCard title="Receitas Recebidas" value={100} icon={<span data-testid="icon" />} />);
    const iconWrapper = screen.getByTestId('icon').parentElement;
    expect(iconWrapper).toHaveClass('shrink-0');
  });

  it('valor ocupa linha própria abaixo do ícone/título, sem disputar largura com o ícone', () => {
    const { container } = render(
      <KpiCard title="Resultado de Caixa" value={-1234567.89} icon={<span data-testid="icon" />} />
    );
    const iconWrapper = screen.getByTestId('icon').parentElement!;
    const tituloLinha = iconWrapper.parentElement!;
    const valor = valorExibido(container);

    // valor não é irmão do ícone na mesma linha — está em linha própria, abaixo
    expect(valor.parentElement).not.toBe(tituloLinha);
    expect(valor.parentElement).toBe(tituloLinha.parentElement);
    expect(valor).toHaveClass('w-full');
    expect(valor.textContent).toBe(fmtMoeda(-1234567.89));
  });

  it('preserva valor monetário muito grande (sete dígitos) por completo, sem reticências', () => {
    const { container } = render(<KpiCard title="Receitas Recebidas" value={9876543.21} />);
    const valor = valorExibido(container);
    expect(valor.textContent).toBe(fmtMoeda(9876543.21));
    expect(valor.textContent).not.toMatch(/\.\.\.|…/);
  });
});
