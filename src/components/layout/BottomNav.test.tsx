// Testes da barra de navegacao inferior (mobile).
//
// Objetivo: garantir que a barra mostra as rotas reais do app (Inicio,
// Pagar, Receber, Analises, Menu), indica a rota ativa, permite acesso a
// Relatorios e Analise Gerencial sem eliminar nenhuma das duas, e aciona
// o mesmo menu completo (drawer) via onMenuClick.
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./BottomNav";

// jsdom nao implementa PointerEvent nem hasPointerCapture, usados pelo
// Radix DropdownMenu para abrir o menu "Analises" ao toque/clique.
beforeAll(() => {
  if (!("PointerEvent" in window)) {
    (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
  }
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

function renderBottomNav(initialPath = "/dashboard") {
  const onMenuClick = jest.fn();
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<BottomNav onMenuClick={onMenuClick} />} />
      </Routes>
    </MemoryRouter>
  );
  return { onMenuClick };
}

describe("BottomNav - navegacao inferior mobile", () => {
  it("exibe os destinos principais com rotulos acessiveis", () => {
    renderBottomNav();
    expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /contas a pagar/i })).toHaveAttribute("href", "/pagar");
    expect(screen.getByRole("link", { name: /contas a receber/i })).toHaveAttribute("href", "/receber");
    expect(screen.getByRole("button", { name: /analises/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abrir menu completo/i })).toBeInTheDocument();
  });

  it("marca a rota ativa com aria-current", () => {
    renderBottomNav("/pagar");
    const link = screen.getByRole("link", { name: /contas a pagar/i });
    expect(link.querySelector('[aria-current="page"]')).toBeInTheDocument();
  });

  it("nao marca rotas inativas com aria-current", () => {
    renderBottomNav("/pagar");
    const link = screen.getByRole("link", { name: /contas a receber/i });
    expect(link.querySelector('[aria-current="page"]')).not.toBeInTheDocument();
  });

  it("permite acessar Relatorios e Analise Gerencial a partir de Analises, sem eliminar nenhuma das duas", async () => {
    renderBottomNav();
    await userEvent.click(screen.getByRole("button", { name: /analises/i }));

    expect(await screen.findByText("Relatorios")).toBeInTheDocument();
    expect(await screen.findByText("Analise Gerencial")).toBeInTheDocument();
  });

  it('aciona onMenuClick ao clicar em "Menu", reutilizando o drawer existente', () => {
    const { onMenuClick } = renderBottomNav();
    fireEvent.click(screen.getByRole("button", { name: /abrir menu completo/i }));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("fica oculta em telas desktop (md:hidden)", () => {
    renderBottomNav();
    const nav = screen.getByRole("navigation", { name: /navegacao principal/i });
    expect(nav).toHaveClass("md:hidden");
  });
});
