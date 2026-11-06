// Suíte de acessibilidade do Table.
//
// Objetivo: garantir que colunas ordenáveis sejam operáveis por teclado
// (Enter/Espaço), não apenas por clique do mouse, e exponham aria-sort
// corretamente — parte da auditoria de UI/UX global (requisito de não
// depender exclusivamente de hover/mouse).
import { render, screen, fireEvent } from '@testing-library/react';
import Table from './Table';

interface Row {
  id: string;
  nome: string;
  valor: number;
}

const data: Row[] = [
  { id: '1', nome: 'Beta', valor: 20 },
  { id: '2', nome: 'Alfa', valor: 10 },
];

function renderTable() {
  return render(
    <Table<Row>
      columns={[
        { key: 'nome', header: 'Nome', sortable: true },
        { key: 'valor', header: 'Valor', sortable: true },
      ]}
      data={data}
    />
  );
}

describe('Table - acessibilidade de ordenacao', () => {
  it('cabecalhos ordenaveis sao focaveis e expoem role=button', () => {
    renderTable();
    const header = screen.getByRole('button', { name: /nome/i });
    expect(header).toHaveAttribute('tabIndex', '0');
  });

  it('expoe aria-sort=none antes de ordenar e atualiza ao ordenar via teclado', () => {
    renderTable();
    const header = screen.getByRole('button', { name: /nome/i });
    expect(header).toHaveAttribute('aria-sort', 'none');

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('ordena via tecla Espaco, nao apenas clique do mouse', () => {
    renderTable();
    const header = screen.getByRole('button', { name: /nome/i });
    fireEvent.keyDown(header, { key: ' ' });

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Alfa');
    expect(rows[1]).toHaveTextContent('Beta');
  });

  it('colunas nao ordenaveis nao recebem role=button nem tabIndex', () => {
    render(
      <Table<Row>
        columns={[{ key: 'nome', header: 'Nome' }]}
        data={data}
      />
    );
    const header = screen.getByText('Nome').closest('th');
    expect(header).not.toHaveAttribute('role');
    expect(header).not.toHaveAttribute('tabindex');
  });
});
