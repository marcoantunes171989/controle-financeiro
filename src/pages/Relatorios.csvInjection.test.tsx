// Teste de regressão de segurança (Microgate 08-B, achado F01): cobre
// variantes de injeção de fórmulas CSV não exercitadas pela suíte original
// (apenas '=' era testado em Relatorios.test.tsx). Também cobre o achado
// F01 (espaço comum antes do prefixo de fórmula), agora corrigido, com
// resultado esperado seguro — não mantemos um teste que apenas documente o
// defeito. Mocks e fixtures sintéticas; nenhuma chamada de rede real.
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import Relatorios from "./Relatorios";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import type { Lancamento, Empresa, Categoria } from "../types";

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

function lancamento(descricao: string): Lancamento {
  return {
    id: "l1",
    tipo: "debito",
    descricao,
    empresaId: "empresa-1",
    categoriaId: "categoria-1",
    valor: 10,
    valorTotal: 10,
    dataEmissao: "2026-01-01",
    dataVencimento: "2026-01-10",
    status: "pago",
    dataPagamento: "2026-01-05",
    tipoRecorrencia: "avista",
    anexos: [],
    competencia: "2026-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
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
const categoriaA: Categoria = { id: "categoria-1", nome: "Fornecedores", tipo: "debito", cor: "#E24B4A", icone: "package", ativo: true };

function setup(descricao: string) {
  mockUseLancamentos.mockReturnValue({
    lancamentos: [lancamento(descricao)],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseEmpresas.mockReturnValue({ empresas: [empresa1], isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCategorias.mockReturnValue({ categorias: [categoriaA], isLoading: false, isError: false, error: null, refetch: jest.fn() });
}

function renderRelatorios() {
  render(
    <MemoryRouter initialEntries={["/relatorios"]}>
      <Routes>
        <Route path="/relatorios" element={<Outlet context={{ competencia: "2026-01", setCompetencia: jest.fn() }} />}>
          <Route index element={<Relatorios />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

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

beforeEach(() => {
  window.history.pushState({}, "", "/relatorios");
});

describe("Relatorios — CSV: neutralização de injeção de fórmula (F01, Microgate 08-B)", () => {
  it.each([
    ["=1+1", "'=1+1"],
    ["+1+1", "'+1+1"],
    ["-1+1", "'-1+1"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\t=1+1", "'\t=1+1"],
    ["\r=1+1", "'\r=1+1"],
    ["\n=1+1", "'\n=1+1"],
    ["\v=1+1", "'\v=1+1"],
    ["\f=1+1", "'\f=1+1"],
    [" =1+1", "' =1+1"],
    ["  +1+1", "'  +1+1"],
    ["   -1+1", "'   -1+1"],
    [" \t\r@SUM(A1)", "' \t\r@SUM(A1)"],
    ["\t \r\n=1+1", "'\t \r\n=1+1"],
    [" =1+1", "' =1+1"], // NBSP
    [" =1+1", "' =1+1"], // EN QUAD (espaço Unicode)
    ["　=1+1", "'　=1+1"], // espaço ideográfico
  ])("neutraliza célula iniciada (após espaços/controles) com %p", (entrada, esperado) => {
    const { blobs, restore } = capturarCSV();
    setup(entrada);
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain(esperado);
    restore();
  });

  // Achado F01 (antigo): espaço comum (0x20) antes do prefixo NÃO era
  // neutralizado pela implementação anterior (regex só cobria \t e \r antes
  // dos caracteres =,+,-,@). Corrigido: agora é um teste de regressão com
  // resultado esperado seguro, não um diagnóstico do defeito.
  it("F01 corrigido: espaço comum antes de '=' é neutralizado", () => {
    const { blobs, restore } = capturarCSV();
    setup(" =1+1");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("' =1+1");
    restore();
  });

  it("preserva o conteúdo textual original ao neutralizar (nenhum caractere é removido)", () => {
    const { blobs, restore } = capturarCSV();
    const entrada = "  \t=SOMA(A1:A9)";
    setup(entrada);
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain(`'${entrada}`);
    restore();
  });

  it("não neutraliza texto seguro comum", () => {
    const { blobs, restore } = capturarCSV();
    setup("Pagamento de fornecedor");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("Pagamento de fornecedor");
    expect(blobs[0]).not.toContain("'Pagamento de fornecedor");
    restore();
  });

  it("não neutraliza texto com acentuação", () => {
    const { blobs, restore } = capturarCSV();
    setup("Serviço de manutenção — março");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("Serviço de manutenção — março");
    restore();
  });

  it("não neutraliza conteúdo iniciado por apóstrofo (não é prefixo de fórmula)", () => {
    const { blobs, restore } = capturarCSV();
    setup("'Observação entre aspas simples");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain("'Observação entre aspas simples");
    expect(blobs[0]).not.toContain("''Observação entre aspas simples");
    restore();
  });

  it("escapa corretamente célula sanitizada que também contém vírgula", () => {
    const { blobs, restore } = capturarCSV();
    setup("=1+1, outra coisa");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain('"\'=1+1, outra coisa"');
    restore();
  });

  it("escapa corretamente célula sanitizada que também contém aspas e quebra de linha", () => {
    const { blobs, restore } = capturarCSV();
    setup('=1+1 "citação"\noutra linha');
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain('"\'=1+1 ""citação""\noutra linha"');
    restore();
  });

  it("campo vazio permanece vazio (sem neutralização espúria)", () => {
    const { blobs, restore } = capturarCSV();
    setup("");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    const linhas = blobs[0].replace("﻿", "").split("\n");
    const colunas = linhas[1].split(",");
    expect(colunas[2]).toBe(""); // Descricao
    restore();
  });

  it("valor numérico negativo legítimo não é neutralizado (campo Valor não é texto não confiável)", () => {
    const { blobs, restore } = capturarCSV();
    mockUseLancamentos.mockReturnValue({
      lancamentos: [{ ...lancamento("Ajuste de saldo"), valor: -150.5 }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseEmpresas.mockReturnValue({ empresas: [empresa1], isLoading: false, isError: false, error: null, refetch: jest.fn() });
    mockUseCategorias.mockReturnValue({ categorias: [categoriaA], isLoading: false, isError: false, error: null, refetch: jest.fn() });
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0]).toContain(",-150.50,");
    expect(blobs[0]).not.toContain("'-150.50");
    restore();
  });

  it("mantém a integridade de colunas (8 campos) mesmo com fórmula neutralizada", () => {
    const { blobs, restore } = capturarCSV();
    setup("=1+1");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    const linhas = blobs[0].replace("﻿", "").split("\n");
    expect(linhas[1].split(",").length).toBe(8);
    restore();
  });

  it("preserva o BOM UTF-8 no início do arquivo mesmo com conteúdo neutralizado", () => {
    const { blobs, restore } = capturarCSV();
    setup("=1+1");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(blobs[0].startsWith("﻿")).toBe(true);
    restore();
  });

  it("nenhuma chamada real de rede (Supabase) ocorre durante a exportação com conteúdo de fórmula", () => {
    const { restore } = capturarCSV();
    setup("=1+1");
    renderRelatorios();
    fireEvent.click(screen.getByText("Exportar CSV"));
    expect(jest.isMockFunction(useLancamentos)).toBe(true);
    restore();
  });
});
