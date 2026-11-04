import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodoOpcao =
  | "selecionado"
  | "mes_atual"
  | "mes_ano_atual"
  | "mes_anterior"
  | "mes_ano_anterior"
  | "todos";

const pad = (n: number) => String(n).padStart(2, "0");

function alvo(hoje: Date, deslocamento: 0 | -1) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamento, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, data: d };
}

/**
 * Regras do combo de período (competencia no formato yyyy-MM):
 * - selecionado: mês escolhido na barra superior
 * - mes_atual / mes_anterior: o mês (de hoje / do mês passado) em qualquer ano
 * - mes_ano_atual / mes_ano_anterior: mês e ano exatos
 * - todos: sem filtro de período
 */
export function periodoPassa(
  opcao: PeriodoOpcao,
  competenciaLancamento: string,
  competenciaBarra: string,
  hoje: Date = new Date()
): boolean {
  if (opcao === "todos") return true;
  if (opcao === "selecionado") return competenciaLancamento === competenciaBarra;
  const a = alvo(hoje, opcao.includes("anterior") ? -1 : 0);
  if (opcao === "mes_atual" || opcao === "mes_anterior") {
    return competenciaLancamento.slice(5, 7) === pad(a.mes);
  }
  return competenciaLancamento === `${a.ano}-${pad(a.mes)}`;
}

export function opcoesPeriodo(
  competenciaBarra: string,
  hoje: Date = new Date()
): { value: PeriodoOpcao; label: string }[] {
  const [anoB, mesB] = competenciaBarra.split("-");
  const atual = alvo(hoje, 0);
  const anterior = alvo(hoje, -1);
  const nome = (d: Date) => format(d, "MMMM", { locale: ptBR });
  return [
    { value: "selecionado", label: `Mês da barra superior (${mesB}/${anoB})` },
    { value: "mes_atual", label: `Mês atual (${nome(atual.data)}, todos os anos)` },
    { value: "mes_ano_atual", label: `Mês e ano atual (${pad(atual.mes)}/${atual.ano})` },
    { value: "mes_anterior", label: `Mês anterior (${nome(anterior.data)}, todos os anos)` },
    { value: "mes_ano_anterior", label: `Mês e ano anterior (${pad(anterior.mes)}/${anterior.ano})` },
    { value: "todos", label: "Todos" },
  ];
}

export function rotuloPeriodo(opcao: PeriodoOpcao, competenciaBarra: string, hoje: Date = new Date()): string {
  return opcoesPeriodo(competenciaBarra, hoje).find((o) => o.value === opcao)?.label ?? "";
}
