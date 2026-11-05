import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card — padding', () => {
  it('padding="sm" aplica p-4', () => {
    render(<Card padding="sm" data-testid="card">conteudo</Card>);
    const inner = screen.getByText('conteudo');
    expect(inner).toHaveClass('p-4');
  });

  it('padding="default" aplica p-5', () => {
    render(<Card padding="default" data-testid="card">conteudo</Card>);
    const inner = screen.getByText('conteudo');
    expect(inner).toHaveClass('p-5');
  });

  it('sem prop padding usa o padrão visual existente (p-5)', () => {
    render(<Card data-testid="card">conteudo</Card>);
    const inner = screen.getByText('conteudo');
    expect(inner).toHaveClass('p-5');
  });

  it('não encaminha a prop padding para o elemento DOM', () => {
    render(<Card padding="sm" data-testid="card">conteudo</Card>);
    const outer = screen.getByTestId('card');
    expect(outer).not.toHaveAttribute('padding');
  });

  it('demais props e classes continuam funcionando', () => {
    render(
      <Card data-testid="card" className="custom-class" title="Título do Card">
        conteudo
      </Card>
    );
    const outer = screen.getByTestId('card');
    expect(outer).toHaveClass('custom-class');
    expect(outer).toHaveClass('rounded-xl', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    expect(screen.getByText('Título do Card')).toBeInTheDocument();
  });
});
