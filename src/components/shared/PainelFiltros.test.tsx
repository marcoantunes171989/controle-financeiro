// Testes do painel de filtros recolhivel em smartphones.
//
// Objetivo: no mobile, o painel abre recolhido por padrao (ou aberto se ja
// houver filtro ativo) e pode ser expandido/recolhido sem perder valores
// selecionados; no desktop permanece sempre visivel (md:block).
import { render, screen, fireEvent } from "@testing-library/react";
import PainelFiltros from "./PainelFiltros";
import { useFiltrosLancamentos } from "../../hooks/useFiltrosLancamentos";

function Wrapper() {
  const f = useFiltrosLancamentos({ tipo: "debito", lancamentos: [], empresas: [], categorias: [], competencia: "2026-01" });
  return <PainelFiltros f={f} />;
}

describe("PainelFiltros - painel recolhivel (mobile)", () => {
  it("comeca recolhido no mobile quando nao ha filtro ativo", () => {
    render(<Wrapper />);
    const toggle = screen.getByRole("button", { name: /^filtros$/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByPlaceholderText("Buscar...").closest("#painel-filtros-conteudo")).toHaveClass("hidden", "md:block");
  });

  it("expande e recolhe ao clicar no cabecalho, preservando os campos", () => {
    render(<Wrapper />);
    const toggle = screen.getByRole("button", { name: /^filtros$/i });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const busca = screen.getByPlaceholderText("Buscar...") as HTMLInputElement;
    fireEvent.change(busca, { target: { value: "energia" } });
    expect(busca.value).toBe("energia");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(busca.value).toBe("energia");
  });

  it("o conteudo permanece sempre visivel no desktop (md:block) independente do estado", () => {
    render(<Wrapper />);
    const conteudo = document.getElementById("painel-filtros-conteudo");
    expect(conteudo).toHaveClass("md:block");
  });
});
