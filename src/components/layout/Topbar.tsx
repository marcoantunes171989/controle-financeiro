import { useLocation, useNavigate } from "react-router-dom";
import { Plus, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "../ui/Button";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { useAuth } from "../../contexts/AuthContext";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/lancamentos": "Lancamentos",
  "/pagar": "Contas a Pagar",
  "/receber": "Contas a Receber",
  "/agendamento": "Agendamento",
  "/empresas": "Empresas",
  "/categorias": "Categorias",
  "/relatorios": "Relatorios",
};

interface TopbarProps {
  competencia: string;
  onCompetenciaChange: (c: string) => void;
}

export default function Topbar({ competencia, onCompetenciaChange }: TopbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const title = routeTitles[pathname] ?? "Finance Control";

  const [ano, mes] = competencia.split("-").map(Number);
  const dataCompetencia = new Date(ano, mes - 1, 1);

  const prev = () => {
    const d = new Date(ano, mes - 2, 1);
    onCompetenciaChange(format(d, "yyyy-MM"));
  };

  const next = () => {
    const d = new Date(ano, mes, 1);
    onCompetenciaChange(format(d, "yyyy-MM"));
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "FC";

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Competencia selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
          <button onClick={prev} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium text-foreground w-24 text-center capitalize">
            {format(dataCompetencia, "MMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={next} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>

        <Button size="sm" onClick={() => navigate("/lancamentos")}>
          <Plus size={14} />
          Novo lancamento
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium text-sm truncate">{user?.email ?? "Usuario"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut().then(() => navigate("/login"))}
            >
              <LogOut size={14} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
