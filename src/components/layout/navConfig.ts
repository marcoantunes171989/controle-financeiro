import type { ReactNode } from "react";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Building2,
  Tag,
  BarChart3,
  Plus,
  LineChart,
} from "lucide-react";
import { createElement } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function buildNavGroups(vencidosPagar: number, vencidosReceber: number): NavGroup[] {
  return [
    {
      label: "Dashboard",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: createElement(LayoutDashboard, { size: 16 }) },
        { to: "/analise", label: "Analise Gerencial", icon: createElement(LineChart, { size: 16 }) },
      ],
    },
    {
      label: "Lancamentos",
      items: [
        { to: "/lancamentos", label: "Novo Lancamento", icon: createElement(Plus, { size: 16 }) },
        { to: "/pagar", label: "Contas a Pagar", icon: createElement(ArrowDownCircle, { size: 16 }), badgeCount: vencidosPagar },
        { to: "/receber", label: "Contas a Receber", icon: createElement(ArrowUpCircle, { size: 16 }), badgeCount: vencidosReceber },
        { to: "/agendamento", label: "Agendamento", icon: createElement(CalendarDays, { size: 16 }) },
      ],
    },
    {
      label: "Gestao",
      items: [
        { to: "/empresas", label: "Empresas", icon: createElement(Building2, { size: 16 }) },
        { to: "/categorias", label: "Categorias", icon: createElement(Tag, { size: 16 }) },
      ],
    },
    {
      label: "Relatorios",
      items: [
        { to: "/relatorios", label: "Relatorios", icon: createElement(BarChart3, { size: 16 }) },
      ],
    },
  ];
}

/**
 * Subconjunto das rotas reais usado pela barra de navegacao inferior (mobile).
 * "Analises" agrega Relatorios + Analise Gerencial via menu, nao elimina nenhuma das duas paginas.
 */
export const BOTTOM_NAV_PRIMARY: { to: string; label: string; icon: (size: number) => ReactNode }[] = [
  { to: "/dashboard", label: "Inicio", icon: (size) => createElement(LayoutDashboard, { size }) },
  { to: "/pagar", label: "Pagar", icon: (size) => createElement(ArrowDownCircle, { size }) },
  { to: "/receber", label: "Receber", icon: (size) => createElement(ArrowUpCircle, { size }) },
];
