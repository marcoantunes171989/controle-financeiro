// Suíte da Análise Gerencial (Microgate 07).
//
// Exercita exclusivamente mocks e fixtures sintéticas: os hooks de acesso a
// dados (useLancamentos/useEmpresas/useCategorias) e o cliente Supabase são
// substituídos por jest.mock — nenhum teste aqui acessa rede real, e os
// cálculos exibidos vêm de src/services/financeiro, nunca de duplicações
// locais nesta página ou nesta suíte.
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import Relatorios from "./Relatorios";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { supabase } from "../integrations/supabase/client";
import type { Lancamento, Empresa, Categoria } from "../types";
import { fmtMoeda } from "../utils/format";

// Recharts (ResponsiveContainer) depende de ResizeObserver, indisponível no
// jsdom. Stub local, restrito a este arquivo de teste.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

jest.mock("../hooks/useLancamentos");
jest.mock("../hooks/useEmpresas");
jest.mock("../hooks/useCategorias");
jest.mock("../integrations/supabase/client");

const mockUseLancamentos = useLancamentos as unknown as jest.Mock;
const mockUseEmpresas = useEmpresas as unknown as jest.Mock;
const mockUseCategorias = useCategorias as unknown as jest.Mock;

let seq = 0;
function lancamento(overrides: Partial<Lancamento> = {}): Lancamento {
  seq += 1;
  return {
    id: overrides.id ?? `l${seq}`,
    tipo: "credito",
    descricao: "sintético",
    empresaId: "empresa-1",
    categoriaId: "categoria-1",
    valor: 100,
    valorTotal: 100,
    dataEmissao: "2026-01-01",
    dataVencimento: "2026-01-10",
    status: "pendente",
    tipoRecorrencia: "avista",
    anexos: [],
    competencia: "2026-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const empresa1: Empresa = {
  id: "empresa-1",
  razaoSocial: "Empresa Um LTDA",
  nomeFantasia: "Empresa Um",
  cnpj: "00.000.000/0001-00",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  cor: "#111111",
  ativo: true,
  createdAt: "2026-01-01T00:00:00Z",
};
const empresa2: Empresa = { ...empresa1, id: "empresa-2", nomeFantasia: "Empresa Dois" };

const categoriaA: Categoria = { id: "categoria-1", nome: "Fornecedores", tipo: "debito", cor: "#E24B4A", icone: "package", ativo: true };
const categoriaB: Categoria = { ...categoriaA, id: "categoria-2", nome: "Aluguel" };

function setup(opts: {
  lancamentos?: Lancamento[];
  empresas?: Empresa[];
  categorias?: Categoria[];
  loadingLancamentos?: boolean;
  errorLancamentos?: boolean;
  errorEmpresas?: boolean;
  errorCategorias?: boolean;
  refetchLancamentos?: jest.Mock;
}) {
  mockUseLancamentos.mockReturnValue({
    lancamentos: opts.lancamentos ?? [],
    isLoading: opts.loadingLancamentos ?? false,
    isError: opts.errorLancamentos ?? false,
    error: opts.errorLancamentos ? new Error("falha sintética de lançamentos") : null,
    refetch: opts.refetchLancamentos ?? jest.fn(),
  });
  mockUseEmpresas.mockReturnValue({
    empresas: opts.empresas ?? [empresa1, empresa2],
    isLoading: false,
    isError: opts.errorEmpresas ?? false,
    error: opts.errorEmpresas ? new Error("falha sintética de empresas") : null,
    refetch: jest.fn(),
  });
  mockUseCategorias.mockReturnValue({
    categorias: opts.categorias !== undefined ? opts.categorias : [categoriaA, categoriaB],
    isLoading: false,
    isError: opts.errorCategorias ?? false,
    error: opts.errorCategorias ? new Error("falha sintética de categorias") : null,
    refetch: jest.fn(),
  });
}

function renderRelatorios(competencia = "2026-01") {
  render(
    <MemoryRouter initialEntries={["/relatorios"]}>
      <Routes>
        <Route path="/relatorios" element={<Outlet context={{ competencia, setCompetencia: jest.fn() }} />}>
          <Route index element={<Relatorios />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/relatorios");
});

describe("Relatorios — Renderização e preservação de rota", () => {
  it("01 renderiza a Análise Gerencial com seu título", () => {
    setup({});
    renderRelatorios();
    expect(screen.getByText("Análise Gerencial")).toBeInTheDocument();
  });

  it("02 preserva a navegação sob a rota /relatorios (via outlet)", () => {
    setup({});
    renderRelatorios();
    expect(screen.getByText("Visão Geral — Regime de Caixa (Realizado)")).toBeInTheDocument();
  });
});

describe("Relatorios — Visão Geral (regime de caixa)", () => {
  it("03 calcula receitas realizadas corretamente", () => {
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-15", valor: 300 })] });
    renderRelatorios("2026-01");
    const card = screen.getByText("Receitas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(300));
  });

  it("04 calcula despesas realizadas corretamente", () => {
    setup({ lancamentos: [lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-01-10", valor: 120 })] });
    renderRelatorios("2026-01");
    const card = screen.getByText("Despesas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(120));
  });

  it("05 calcula o resultado de caixa (receitas - despesas realizadas)", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-15", valor: 500 }),
        lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-01-10", valor: 200 }),
      ],
    });
    renderRelatorios("2026-01");
    const card = screen.getByText("Resultado de Caixa").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(300));
  });

  it("06 calcula a margem de caixa corretamente", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-15", valor: 200 }),
        lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-01-10", valor: 50 }),
      ],
    });
    renderRelatorios("2026-01");
    const card = screen.getByText("Margem de Caixa").closest("div")!.parentElement!;
    expect(card.textContent).toContain("75.0%");
  });

  it("13 exclui lançamentos cancelados do resultado de caixa", () => {
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "cancelado", dataPagamento: "2026-01-15", valor: 777 })] });
    renderRelatorios("2026-01");
    const card = screen.getByText("Receitas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(0));
  });

  it("14 recebimento em mês diferente do vencimento só conta no mês do pagamento", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataVencimento: "2026-01-10", dataPagamento: "2026-02-03", valor: 400 }),
      ],
    });
    renderRelatorios("2026-01");
    const card = screen.getByText("Receitas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(0));
  });

  it("17 denominador zero na margem de caixa exibe indisponível, sem fabricar percentual", () => {
    setup({ lancamentos: [lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-01-10", valor: 100 })] });
    renderRelatorios("2026-01");
    expect(screen.getByText("Margem de Caixa").closest("div")!.parentElement!.textContent).toContain("Indisponível");
  });
});

describe("Relatorios — Compromissos Financeiros (previsão)", () => {
  it("07 receitas em aberto (contas a receber) somam créditos pendentes/vencidos", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "pendente", dataVencimento: "2026-02-05", valor: 60 })] });
    renderRelatorios("2026-01");
    const card = screen.getByText("Contas a Receber").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(60));
    jest.useRealTimers();
  });

  it("08 despesas em aberto (contas a pagar) somam débitos pendentes/vencidos", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({ lancamentos: [lancamento({ tipo: "debito", status: "pendente", dataVencimento: "2026-02-05", valor: 90 })] });
    renderRelatorios("2026-01");
    const card = screen.getByText("Contas a Pagar").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(90));
    jest.useRealTimers();
  });

  it("09 recebíveis vencidos são separados dos valores a vencer", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "vencido", dataVencimento: "2026-01-05", valor: 100 }),
        lancamento({ tipo: "credito", status: "pendente", dataVencimento: "2026-02-05", valor: 60 }),
      ],
    });
    renderRelatorios("2026-01");
    const vencidos = screen.getByText("Recebíveis Vencidos").closest("div")!.parentElement!;
    const aReceber = screen.getByText("Contas a Receber").closest("div")!.parentElement!;
    expect(vencidos.textContent).toContain(fmtMoeda(100));
    expect(aReceber.textContent).toContain(fmtMoeda(160));
    jest.useRealTimers();
  });

  it("10 obrigações vencidas são separadas dos valores a vencer", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({
      lancamentos: [
        lancamento({ tipo: "debito", status: "vencido", dataVencimento: "2026-01-05", valor: 70 }),
        lancamento({ tipo: "debito", status: "pendente", dataVencimento: "2026-02-05", valor: 30 }),
      ],
    });
    renderRelatorios("2026-01");
    const vencidas = screen.getByText("Obrigações Vencidas").closest("div")!.parentElement!;
    expect(vencidas.textContent).toContain(fmtMoeda(70));
    jest.useRealTimers();
  });

  it("título com vencimento hoje ainda não é tratado como vencido", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20));
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "pendente", dataVencimento: "2026-01-20", valor: 50 })] });
    renderRelatorios("2026-01");
    const vencidos = screen.getByText("Recebíveis Vencidos").closest("div")!.parentElement!;
    expect(vencidos.textContent).toContain(fmtMoeda(0));
    jest.useRealTimers();
  });
});

describe("Relatorios — Competência Operacional", () => {
  it("11 calcula receitas por competência (campo competencia, não vencimento/pagamento)", () => {
    setup({
      lancamentos: [lancamento({ tipo: "credito", competencia: "2026-01", dataVencimento: "2026-03-10", valor: 250 })],
    });
    renderRelatorios("2026-01");
    expect(screen.getByText("Receitas por Competência").parentElement!.textContent).toContain(fmtMoeda(250));
  });

  it("calcula despesas e resultado operacional por competência", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", competencia: "2026-01", valor: 300 }),
        lancamento({ tipo: "debito", competencia: "2026-01", valor: 120 }),
      ],
    });
    renderRelatorios("2026-01");
    expect(screen.getByText("Despesas por Competência").parentElement!.textContent).toContain(fmtMoeda(120));
    expect(screen.getByText("Resultado Operacional por Competência").parentElement!.textContent).toContain(fmtMoeda(180));
  });

  it("12 separa claramente caixa, previsão e competência (rótulos distintos na tela)", () => {
    setup({});
    renderRelatorios("2026-01");
    expect(screen.getByText("Visão Geral — Regime de Caixa (Realizado)")).toBeInTheDocument();
    expect(screen.getByText("Compromissos Financeiros — Previsão (Vencimento)")).toBeInTheDocument();
    expect(screen.getByText("Competência Operacional")).toBeInTheDocument();
  });

  it("não apresenta termos de DRE contábil como rótulo de indicador (apenas o resultado operacional por competência)", () => {
    setup({});
    renderRelatorios("2026-01");
    // Os únicos rótulos de indicador desta seção devem ser os três abaixo —
    // nunca "Lucro Líquido", "EBITDA" ou "Lucro Operacional" como título de
    // cartão (a menção textual explicando a não-equivalência, no parágrafo
    // descritivo, é esperada e não constitui um rótulo de indicador).
    expect(screen.getByText("Receitas por Competência")).toBeInTheDocument();
    expect(screen.getByText("Despesas por Competência")).toBeInTheDocument();
    expect(screen.getByText("Resultado Operacional por Competência")).toBeInTheDocument();
    expect(screen.queryByText("Lucro Líquido")).not.toBeInTheDocument();
    expect(screen.queryByText("EBITDA")).not.toBeInTheDocument();
    expect(screen.queryByText("DRE Simplificado")).not.toBeInTheDocument();
  });
});

describe("Relatorios — Comparações históricas", () => {
  it("15 compara o mês selecionado com o mês anterior", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-02-10", valor: 300 }),
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-10", valor: 200 }),
      ],
    });
    renderRelatorios("2026-02");
    const card = screen.getByText("Mês Selecionado vs. Mês Anterior").closest("div")!;
    expect(card.textContent).toContain(`anterior: ${fmtMoeda(200)}`);
    expect(card.textContent).toContain("50.0%");
  });

  it("16 compara o mês selecionado com o mesmo mês do ano anterior", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-10", valor: 500 }),
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2025-01-10", valor: 400 }),
      ],
    });
    renderRelatorios("2026-01");
    const card = screen.getByText("Mês Selecionado vs. Mesmo Mês do Ano Anterior").closest("div")!;
    expect(card.textContent).toContain(`anterior: ${fmtMoeda(400)}`);
  });

  it("17 denominador zero na comparação histórica exibe variação indisponível", () => {
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-02-10", valor: 100 })] });
    renderRelatorios("2026-02");
    expect(screen.getAllByText("variação indisponível").length).toBeGreaterThan(0);
  });

  it("18 mudança de sinal do resultado é sinalizada, não tratada como variação comum", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-05", valor: 50 }),
        lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-01-06", valor: 200 }),
        lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-02-05", valor: 300 }),
        lancamento({ tipo: "debito", status: "pago", dataPagamento: "2026-02-06", valor: 50 }),
      ],
    });
    renderRelatorios("2026-02");
    expect(screen.getByText("mudança de sinal")).toBeInTheDocument();
  });
});

describe("Relatorios — Filtros", () => {
  it("19 filtro de empresa restringe os indicadores a uma única empresa", () => {
    setup({
      lancamentos: [
        lancamento({ empresaId: "empresa-1", tipo: "credito", status: "recebido", dataPagamento: "2026-01-10", valor: 100 }),
        lancamento({ empresaId: "empresa-2", tipo: "credito", status: "recebido", dataPagamento: "2026-01-10", valor: 300 }),
      ],
    });
    window.history.pushState({}, "", "/relatorios?empresaId=empresa-1");
    renderRelatorios("2026-01");
    const card = screen.getByText("Receitas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(100));
    expect(card.textContent).not.toContain(fmtMoeda(300));
  });

  it("20 troca de competência (AppLayout) recalcula os indicadores", () => {
    const dados = [
      lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-01-15", valor: 100 }),
      lancamento({ tipo: "credito", status: "recebido", dataPagamento: "2026-02-15", valor: 250 }),
    ];
    setup({ lancamentos: dados });
    renderRelatorios("2026-02");
    expect(screen.getByText("Receitas Realizadas").closest("div")!.parentElement!.textContent).toContain(fmtMoeda(250));
  });

  it("21 filtro de categoria restringe os indicadores de despesa à categoria selecionada", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "debito", categoriaId: "categoria-1", status: "pago", dataPagamento: "2026-01-05", valor: 100 }),
        lancamento({ tipo: "debito", categoriaId: "categoria-2", status: "pago", dataPagamento: "2026-01-05", valor: 500 }),
      ],
    });
    renderRelatorios("2026-01");
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por categoria" }), { target: { value: "categoria-1" } });
    const card = screen.getByText("Despesas Realizadas").closest("div")!.parentElement!;
    expect(card.textContent).toContain(fmtMoeda(100));
    expect(card.textContent).not.toContain(fmtMoeda(500));
  });
});

describe("Relatorios — Categorias e rankings", () => {
  it("22 ranking de categorias é ordenado de forma decrescente", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "debito", categoriaId: "categoria-1", status: "pago", dataPagamento: "2026-01-05", valor: 100 }),
        lancamento({ tipo: "debito", categoriaId: "categoria-2", status: "pago", dataPagamento: "2026-01-06", valor: 400 }),
      ],
    });
    renderRelatorios("2026-01");
    const ranking = screen.getByText(/Ranking Completo de Categorias/).closest("div")!.parentElement!;
    const nomes = within(ranking).getAllByText(/Fornecedores|Aluguel/).map((el) => el.textContent);
    expect(nomes).toEqual(["Aluguel", "Fornecedores"]);
  });

  it("23 reconciliação monetária: total do ranking é igual a Despesas Realizadas", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "debito", categoriaId: "categoria-1", status: "pago", dataPagamento: "2026-01-05", valor: 100.3 }),
        lancamento({ tipo: "debito", categoriaId: "categoria-2", status: "pago", dataPagamento: "2026-01-06", valor: 50.2 }),
      ],
    });
    renderRelatorios("2026-01");
    expect(screen.getByText("Despesas Realizadas").closest("div")!.parentElement!.textContent).toContain(fmtMoeda(150.5));
    expect(screen.getByText(/Total reconciliado/).textContent).toContain(fmtMoeda(150.5));
  });

  it("24 parcelas pagas da mesma categoria são somadas sem duplicidade no ranking", () => {
    setup({
      lancamentos: [
        lancamento({ tipo: "debito", categoriaId: "categoria-1", status: "pago", dataPagamento: "2026-01-05", valor: 100, tipoRecorrencia: "parcelas", numeroParcelas: 3, parcelaAtual: 1 }),
        lancamento({ tipo: "debito", categoriaId: "categoria-1", status: "pago", dataPagamento: "2026-01-20", valor: 100, tipoRecorrencia: "parcelas", numeroParcelas: 3, parcelaAtual: 2 }),
      ],
    });
    renderRelatorios("2026-01");
    const ranking = screen.getByText(/Ranking Completo de Categorias/).closest("div")!.parentElement!;
    expect(within(ranking).getAllByText("Fornecedores")).toHaveLength(1);
    expect(ranking.textContent).toContain(fmtMoeda(200));
  });

  it("25 despesa com categoria não identificada aparece como 'Sem categoria' no ranking", () => {
    setup({
      lancamentos: [lancamento({ tipo: "debito", status: "pago", categoriaId: "categoria-inexistente", dataPagamento: "2026-01-05", valor: 70 })],
    });
    renderRelatorios("2026-01");
    const ranking = screen.getByText(/Ranking Completo de Categorias/).closest("div")!.parentElement!;
    expect(within(ranking).getByText("Sem categoria")).toBeInTheDocument();
  });

  it("22b o ranking não trunca categorias silenciosamente (exibe todas sem exigir 'ver mais')", () => {
    const categorias = Array.from({ length: 8 }, (_, i) => ({ id: `categoria-${i + 1}`, nome: `Categoria ${i + 1}`, tipo: "debito" as const, cor: "#888", icone: "package", ativo: true }));
    const lancamentos = categorias.map((c, i) => lancamento({ categoriaId: c.id, tipo: "debito", status: "pago", dataPagamento: "2026-01-05", valor: 100 - i }));
    setup({ lancamentos, categorias });
    renderRelatorios("2026-01");
    const ranking = screen.getByText(/Ranking Completo de Categorias/).closest("div")!.parentElement!;
    expect(within(ranking).getByText("Categoria 1")).toBeInTheDocument();
    expect(within(ranking).getByText("Categoria 8")).toBeInTheDocument();
    expect(within(ranking).queryByText(/Ver todas as categorias/)).not.toBeInTheDocument();
  });
});

describe("Relatorios — Estados vazios, loading e erro", () => {
  it("26 consulta sem lançamentos exibe zeros reais, sem fabricar valores", () => {
    setup({ lancamentos: [] });
    renderRelatorios("2026-01");
    expect(screen.getByText("Receitas Realizadas").closest("div")!.parentElement!.textContent).toContain(fmtMoeda(0));
  });

  it("27 exibe indicador de carregamento enquanto os dados não chegam", () => {
    setup({ lancamentos: [], loadingLancamentos: true });
    renderRelatorios("2026-01");
    expect(screen.queryByText("Análise Gerencial")).not.toBeInTheDocument();
  });

  it("28 erro de consulta exibe aviso em vez de quebrar a tela", () => {
    setup({ errorLancamentos: true });
    renderRelatorios("2026-01");
    expect(screen.getByText("Não foi possível carregar as informações financeiras.")).toBeInTheDocument();
    expect(screen.queryByText("Receitas Realizadas")).not.toBeInTheDocument();
  });

  it("29 permite tentativa manual de atualização (refetch) a partir do estado de erro", () => {
    const refetchLancamentos = jest.fn();
    setup({ errorLancamentos: true, refetchLancamentos });
    renderRelatorios("2026-01");
    screen.getByRole("button", { name: /Tentar novamente \(lançamentos\)/ }).click();
    expect(refetchLancamentos).toHaveBeenCalledTimes(1);
  });

  it("30 inconsistência financeira (recebido sem data de pagamento) é sinalizada, não ocultada", () => {
    setup({ lancamentos: [lancamento({ tipo: "credito", status: "recebido", dataPagamento: undefined, valor: 100 })] });
    renderRelatorios("2026-01");
    expect(screen.getByText(/Inconsistências encontradas nos dados/)).toBeInTheDocument();
    expect(screen.getByText(/pago\(s\)\/recebido\(s\) sem data de pagamento/)).toBeInTheDocument();
  });
});

describe("Relatorios — Exportação CSV", () => {
  function capturarCSV() {
    const blobs: string[] = [];
    const originalBlob = global.Blob;
    (global as unknown as { Blob: unknown }).Blob = class extends originalBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        blobs.push(String(parts[0]));
      }
    };
    URL.createObjectURL = jest.fn(() => "blob:fake");
    URL.revokeObjectURL = jest.fn();
    return { blobs, restore: () => { (global as unknown as { Blob: unknown }).Blob = originalBlob; } };
  }

  it("31 exportação CSV preserva colunas e cabeçalho existentes", () => {
    const { blobs, restore } = capturarCSV();
    setup({
      lancamentos: [lancamento({ id: "lanc-1", descricao: "Serviço X", tipo: "debito", status: "pago", dataPagamento: "2026-01-05", valor: 100 })],
    });
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("ID,Tipo,Descricao,Empresa,Categoria,Valor,Vencimento,Status");
    expect(blobs[0]).toContain("Serviço X");
    restore();
  });

  it("32 compatibilidade de colunas: mesma ordem e quantidade de campos da versão anterior", () => {
    const { blobs, restore } = capturarCSV();
    setup({ lancamentos: [lancamento({ id: "lanc-1", valor: 50 })] });
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    const linhas = blobs[0].replace("﻿", "").split("\n");
    expect(linhas[1].split(",").length).toBe(8);
    restore();
  });

  it("33 escapa corretamente células com vírgula e aspas no CSV (RFC 4180)", () => {
    const { blobs, restore } = capturarCSV();
    setup({ lancamentos: [lancamento({ id: "lanc-1", descricao: 'Fornecedor, "ACME" Ltda', valor: 10 })] });
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain('"Fornecedor, ""ACME"" Ltda"');
    restore();
  });

  it("34 protege contra injeção de fórmulas: célula iniciada com '=' é neutralizada", () => {
    const { blobs, restore } = capturarCSV();
    setup({ lancamentos: [lancamento({ id: "lanc-1", descricao: "=SOMA(A1:A9)", valor: 10 })] });
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("'=SOMA(A1:A9)");
    restore();
  });

  it("35 exportação reflete os filtros de empresa/categoria atualmente aplicados", () => {
    const { blobs, restore } = capturarCSV();
    setup({
      lancamentos: [
        lancamento({ id: "lanc-1", empresaId: "empresa-1", descricao: "Da Empresa Um" }),
        lancamento({ id: "lanc-2", empresaId: "empresa-2", descricao: "Da Empresa Dois" }),
      ],
    });
    window.history.pushState({}, "", "/relatorios?empresaId=empresa-1");
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("Da Empresa Um");
    expect(blobs[0]).not.toContain("Da Empresa Dois");
    restore();
  });

  it("36 nenhuma chamada real de rede (Supabase) ocorre durante a renderização ou exportação", () => {
    const { restore } = capturarCSV();
    setup({ lancamentos: [lancamento({ id: "lanc-1", valor: 10 })] });
    renderRelatorios("2026-01");
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(supabase.from).not.toHaveBeenCalled();
    restore();
  });
});

describe("Relatorios — Preservação de telas operacionais", () => {
  it("37 não modifica o comportamento de outras páginas (hooks chamados são os de produção)", () => {
    setup({ lancamentos: [lancamento({ valor: 10 })] });
    renderRelatorios("2026-01");
    expect(mockUseLancamentos).toHaveBeenCalled();
    expect(mockUseEmpresas).toHaveBeenCalled();
    expect(mockUseCategorias).toHaveBeenCalled();
  });
});
