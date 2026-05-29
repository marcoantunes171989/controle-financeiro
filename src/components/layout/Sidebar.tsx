import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Building2,
  Tag,
  BarChart3,
  TrendingDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../../hooks/useLancamentos";
import { useEmpresas } from "../../hooks/useEmpresas";
import type { Lancamento, Empresa } from "../../types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { lancamentos } = useLancamentos();
  const { empresas } = useEmpresas();

  const vencidosPagar = lancamentos.filter((l: Lancamento) => l.tipo === "debito" && l.status === "vencido").length;
  const vencidosReceber = lancamentos.filter((l: Lancamento) => l.tipo === "credito" && l.status === "vencido").length;

  const groups: NavGroup[] = [
    {
      label: "Dashboard",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      ],
    },
    {
      label: "Lancamentos",
      items: [
        { to: "/lancamentos", label: "Novo Lancamento", icon: <Plus size={16} /> },
        { to: "/pagar", label: "Contas a Pagar", icon: <ArrowDownCircle size={16} />, badgeCount: vencidosPagar },
        { to: "/receber", label: "Contas a Receber", icon: <ArrowUpCircle size={16} />, badgeCount: vencidosReceber },
        { to: "/agendamento", label: "Agendamento", icon: <CalendarDays size={16} /> },
      ],
    },
    {
      label: "Gestao",
      items: [
        { to: "/empresas", label: "Empresas", icon: <Building2 size={16} /> },
        { to: "/categorias", label: "Categorias", icon: <Tag size={16} /> },
      ],
    },
    {
      label: "Relatorios",
      items: [
        { to: "/relatorios", label: "Relatorios", icon: <BarChart3 size={16} /> },
      ],
    },
  ];

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))", borderRight: "1px solid hsl(var(--sidebar-border))" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(var(--sidebar-primary))" }}>
          <TrendingDown size={16} style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
        </div>
        <span className="font-bold text-sm" style={{ color: "hsl(var(--sidebar-foreground))" }}>Finance Control</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold tracking-widest px-2 mb-1.5" style={{ color: "hsl(var(--sidebar-foreground) / 0.5)" }}>{group.label.toUpperCase()}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
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
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className="text-xs rounded-full w-5 h-5 flex items-center justify-center leading-none font-semibold" style={{ backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
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
      <div className="p-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
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
