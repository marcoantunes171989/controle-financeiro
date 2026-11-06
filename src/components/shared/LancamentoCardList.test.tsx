// Testes do layout em cards (fallback mobile da Table) usado em
// Contas a Pagar e Contas a Receber. Garante que valor, vencimento,
// situacao, empresa, descricao e as acoes permitidas sao preservados.
import { render, screen, fireEvent } from "@testing-library/react";
import LancamentoCardList from "./LancamentoCardList";
import type { Lancamento } from "../../types";

const lancamento: Lancamento = {
  id: "1",
  tipo: "debito",
  descricao: "Conta de energia",
  empresaId: "e1",
  empresa: { id: "e1", razaoSocial: "Empresa Um Ltda", nomeFantasia: "Empresa Um", cnpj: "", telefone: "", email: "", cidade: "", estado: "", cor: "#111111", ativo: true, createdAt: "" },
  categoriaId: "c1",
  categoria: { id: "c1", nome: "Utilidades", tipo: "debito", cor: "#ff0000", icone: "", ativo: true },
  valor: 150.5,
  valorTotal: 150.5,
  dataEmissao: "2026-01-01",
  dataVencimento: "2026-01-10",
  status: "pendente",
  tipoRecorrencia: "avista",
  anexos: [],
  competencia: "2026-01",
  createdAt: "",
  updatedAt: "",
};

describe("LancamentoCardList - layout em cards (mobile)", () => {
  it("mostra mensagem vazia quando nao ha itens", () => {
    render(
      <LancamentoCardList
        itens={[]}
        emptyMessage="Nenhuma conta a pagar encontrada"
        valorClassName="text-destructive"
        acaoLabel="Baixar"
        onRowClick={jest.fn()}
        onAnexos={jest.fn()}
        onBaixa={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.getByText("Nenhuma conta a pagar encontrada")).toBeInTheDocument();
  });

  it("preserva valor, vencimento, situacao, empresa e descricao no card", () => {
    render(
      <LancamentoCardList
        itens={[lancamento]}
        emptyMessage="Nenhuma conta a pagar encontrada"
        valorClassName="text-destructive"
        acaoLabel="Baixar"
        onRowClick={jest.fn()}
        onAnexos={jest.fn()}
        onBaixa={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.getByText("Conta de energia")).toBeInTheDocument();
    expect(screen.getByText("Empresa Um")).toBeInTheDocument();
    expect(screen.getByText("Utilidades")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*150,50/)).toBeInTheDocument();
  });

  it("aciona onRowClick ao clicar no card e aciona acoes sem propagar para o card", () => {
    const onRowClick = jest.fn();
    const onBaixa = jest.fn();
    const onExcluir = jest.fn();
    render(
      <LancamentoCardList
        itens={[lancamento]}
        emptyMessage="Nenhuma conta a pagar encontrada"
        valorClassName="text-destructive"
        acaoLabel="Baixar"
        onRowClick={onRowClick}
        onAnexos={jest.fn()}
        onBaixa={onBaixa}
        onExcluir={onExcluir}
      />
    );

    fireEvent.click(screen.getByText("Baixar"));
    expect(onBaixa).toHaveBeenCalledWith(lancamento);
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Excluir"));
    expect(onExcluir).toHaveBeenCalledWith(lancamento);

    fireEvent.click(screen.getByText("Conta de energia"));
    expect(onRowClick).toHaveBeenCalledWith(lancamento);
  });

  it('nao exibe a acao "Baixar" quando o status ja foi liquidado', () => {
    render(
      <LancamentoCardList
        itens={[{ ...lancamento, status: "pago" }]}
        emptyMessage="Nenhuma conta a pagar encontrada"
        valorClassName="text-destructive"
        acaoLabel="Baixar"
        onRowClick={jest.fn()}
        onAnexos={jest.fn()}
        onBaixa={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.queryByText("Baixar")).not.toBeInTheDocument();
    expect(screen.getByText("Excluir")).toBeInTheDocument();
  });
});
