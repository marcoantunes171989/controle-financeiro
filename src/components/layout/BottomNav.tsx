import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, LineChart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

interface BottomNavProps {
  onMenuClick?: () => void;
}

const ANALISES_PATHS = ["/relatorios", "/analise"];

/**
 * Barra de navegacao inferior, visivel apenas em smartphones (md:hidden).
 * Reutiliza as rotas reais do app; "Analises" agrupa Relatorios e Analise
 * Gerencial sem eliminar nenhuma das duas paginas. "Menu" aciona o mesmo
 * drawer da Sidebar (empresas, categorias, agendamento, lancamentos).
 */
export default function BottomNav({ onMenuClick }: BottomNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const analisesAtivo = ANALISES_PATHS.includes(pathname);

  const itemClass = (active: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] text-[11px] font-medium transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav
      aria-label="Navegacao principal"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-background border-t border-border flex items-stretch h-14 safe-bottom"
    >
      <NavLink
        to="/dashboard"
        className={({ isActive }) => itemClass(isActive)}
        aria-label="Inicio"
      >
        {({ isActive }) => (
          <>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span aria-current={isActive ? "page" : undefined}>Inicio</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/pagar"
        className={({ isActive }) => itemClass(isActive)}
        aria-label="Contas a Pagar"
      >
        {({ isActive }) => (
          <>
            <ArrowDownCircle size={20} aria-hidden="true" />
            <span aria-current={isActive ? "page" : undefined}>Pagar</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/receber"
        className={({ isActive }) => itemClass(isActive)}
        aria-label="Contas a Receber"
      >
        {({ isActive }) => (
          <>
            <ArrowUpCircle size={20} aria-hidden="true" />
            <span aria-current={isActive ? "page" : undefined}>Receber</span>
          </>
        )}
      </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={itemClass(analisesAtivo)}
            aria-label="Analises: Relatorios e Analise Gerencial"
            aria-current={analisesAtivo ? "page" : undefined}
          >
            <LineChart size={20} aria-hidden="true" />
            <span>Analises</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/relatorios")} className="cursor-pointer">
            Relatorios
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/analise")} className="cursor-pointer">
            Analise Gerencial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onMenuClick}
        className={itemClass(false)}
        aria-label="Abrir menu completo"
      >
        <Menu size={20} aria-hidden="true" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
