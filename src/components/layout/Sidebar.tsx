import { NavLink } from "react-router-dom";
import { TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../../hooks/useLancamentos";
import { useEmpresas } from "../../hooks/useEmpresas";
import type { Lancamento, Empresa } from "../../types";
import { buildNavGroups } from "./navConfig";

interface SidebarProps {
  isOpen?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ isOpen = false, onNavigate, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();

  const vencidosPagar = lancamentos.filter((l: Lancamento) => l.tipo === "debito" && l.status === "vencido").length;
  const vencidosReceber = lancamentos.filter((l: Lancamento) => l.tipo === "credito" && l.status === "vencido").length;

  const groups = buildNavGroups(vencidosPagar, vencidosReceber);

  return (
    <aside
      className={cn(
        "w-60 shrink-0 h-screen flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out motion-reduce:transition-none",
        "md:static md:translate-x-0 md:transition-[width] md:duration-200 md:ease-in-out md:motion-reduce:transition-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "md:w-16" : "md:w-60"
      )}
      style={{ backgroundColor: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))", borderRight: "1px solid hsl(var(--sidebar-border))", paddingLeft: "env(safe-area-inset-left, 0px)" }}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]", collapsed && "md:justify-center md:px-0")} style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(var(--sidebar-primary))" }}>
          <TrendingDown size={16} style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
        </div>
        <span className={cn("font-bold text-sm", collapsed && "md:hidden")} style={{ color: "hsl(var(--sidebar-foreground))" }}>Finance Control</span>
      </div>

      {/* Botao recolher/expandir (apenas desktop) */}
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menu de navegacao" : "Recolher menu de navegacao"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-2 mx-3 mt-2 rounded-lg text-xs transition-colors hover:opacity-100 opacity-70 shrink-0",
            collapsed && "md:justify-center md:mx-auto"
          )}
          style={{ color: "hsl(var(--sidebar-foreground))" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Recolher menu</span>}
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className={cn("text-[10px] font-semibold tracking-widest px-2 mb-1.5", collapsed && "md:hidden")} style={{ color: "hsl(var(--sidebar-foreground) / 0.5)" }}>{group.label.toUpperCase()}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative",
                        collapsed && "md:justify-center md:px-2",
                        isActive
                          ? "font-medium"
                          : "opacity-70 hover:opacity-100"
                      )
                    }
                    style={({ isActive }) => isActive ? {
                      backgroundColor: "hsl(var(--sidebar-accent))",
                      color: "hsl(var(--sidebar-primary))",
                    } : {
                      color: "hsl(var(--sidebar-foreground))",
                    }}
                  >
                    <span className="relative shrink-0 flex items-center justify-center">
                      {item.icon}
                      {collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span
                          className="hidden md:block absolute -top-1 -right-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: "hsl(var(--destructive))" }}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className={cn("flex-1", collapsed && "md:hidden")}>{item.label}</span>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={cn("text-xs rounded-full w-5 h-5 flex items-center justify-center leading-none font-semibold", collapsed && "md:hidden")}
                        style={{ backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
                      >
                        {item.badgeCount > 9 ? "9+" : item.badgeCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Empresas ativas */}
      <div className={cn("px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]", collapsed && "md:hidden")} style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        <p className="text-xs mb-2 opacity-50" style={{ color: "hsl(var(--sidebar-foreground))" }}>Empresas ativas</p>
        <div className="space-y-1">
          {empresas.filter((e: Empresa) => e.ativo).slice(0, 3).map((e: Empresa) => (
            <div key={e.id} className="flex items-center gap-2 text-xs opacity-70" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
              <span className="truncate">{e.nomeFantasia}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
