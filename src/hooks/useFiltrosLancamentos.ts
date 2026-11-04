import { useState } from "react";
import type { Categoria, Empresa, Lancamento, TipoLancamento } from "../types";
import { fmtData, fmtMoeda } from "../utils/format";
import { periodoPassa, rotuloPeriodo, type PeriodoOpcao } from "../utils/periodo";

export type ItemFiltro = Lancamento & { empresa?: Empresa; categoria?: Categoria };
type FiltroKey = "empresa" | "categoria" | "status";

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

interface Args {
  /** Sem `tipo`, considera receitas e despesas (ex.: Relatórios). */
  tipo?: TipoLancamento;
  lancamentos: Lancamento[];
  empresas: Empresa[];
  categorias: Categoria[];
  /** Competência (yyyy-MM) escolhida na barra superior. */
  competencia: string;
}

/**
 * Filtros combinados e dinâmicos: período (combo ou intervalo de datas), empresa, categoria,
 * status e busca. As listas de empresa/categoria/status mostram só o que existe dados os OUTROS filtros.
 */
export function useFiltrosLancamentos({ tipo, lancamentos, empresas, categorias, competencia }: Args) {
  const [busca, setBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoOpcao>("selecionado");
  const [campoData, setCampoData] = useState<"vencimento" | "emissao">("vencimento");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const q = busca.trim().toLowerCase();

  // Intervalo de datas: quando preenchido, substitui o combo de período.
  const intervaloInvalido = !!dataInicio && !!dataFim && dataFim < dataInicio;
  const intervaloAtivo = (!!dataInicio || !!dataFim) && !intervaloInvalido;
  const noIntervalo = (l: Lancamento) => {
    const d = (campoData === "emissao" ? l.dataEmissao : l.dataVencimento).substring(0, 10);
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    return true;
  };

  const base: ItemFiltro[] = lancamentos
    .filter((l) => !tipo || l.tipo === tipo)
    .filter((l) => (intervaloAtivo ? noIntervalo(l) : periodoPassa(periodo, l.competencia, competencia)))
    .map((l) => ({
      ...l,
      empresa: empresas.find((e) => e.id === l.empresaId),
      categoria: categorias.find((c) => c.id === l.categoriaId),
    }));

  const passaBusca = (l: ItemFiltro) => {
    if (!q) return true;
    return [
      l.descricao,
      l.empresa?.nomeFantasia ?? "",
      l.categoria?.nome ?? "",
      fmtData(l.dataEmissao),
      fmtData(l.dataVencimento),
      fmtMoeda(l.valor),
      l.status,
    ].some((v) => v.toLowerCase().includes(q));
  };
  const passa = (l: ItemFiltro, ignorar?: FiltroKey) =>
    (ignorar === "empresa" || !empresaFiltro || l.empresaId === empresaFiltro) &&
    (ignorar === "categoria" || !catFiltro || l.categoriaId === catFiltro) &&
    (ignorar === "status" || !statusFiltro || l.status === statusFiltro) &&
    passaBusca(l);

  const itens = base.filter((l) => passa(l));
  /** Para os cartões de total: tudo menos o filtro de status, mostrando a distribuição por status. */
  const kpiItens = base.filter((l) => passa(l, "status"));

  const contar = (ignorar: FiltroKey, chave: (l: ItemFiltro) => string) => {
    const m = new Map<string, number>();
    for (const l of base) if (passa(l, ignorar)) m.set(chave(l), (m.get(chave(l)) ?? 0) + 1);
    return m;
  };
  const contEmpresa = contar("empresa", (l) => l.empresaId);
  const contCategoria = contar("categoria", (l) => l.categoriaId);
  const contStatus = contar("status", (l) => l.status);
  const totalSemStatus = Array.from(contStatus.values()).reduce((a, n) => a + n, 0);

  const opcoesEmpresa = empresas.filter((e) => (contEmpresa.get(e.id) ?? 0) > 0 || e.id === empresaFiltro);
  const opcoesCategoria = categorias.filter(
    (c) => (!tipo || c.tipo === tipo) && ((contCategoria.get(c.id) ?? 0) > 0 || c.id === catFiltro)
  );
  const opcoesStatus = Object.keys(STATUS_LABEL).filter((st) => (contStatus.get(st) ?? 0) > 0 || st === statusFiltro);

  const rotuloIntervalo = `${campoData === "emissao" ? "emissão" : "vencimento"} ${dataInicio ? fmtData(dataInicio) : "…"} a ${dataFim ? fmtData(dataFim) : "…"}`;
  const periodoLabel = intervaloAtivo ? rotuloIntervalo : rotuloPeriodo(periodo, competencia);

  const chips: { id: string; label: string; remover: () => void }[] = [];
  if (busca) chips.push({ id: "busca", label: `Busca: ${busca}`, remover: () => setBusca("") });
  if (empresaFiltro) chips.push({ id: "empresa", label: empresas.find((e) => e.id === empresaFiltro)?.nomeFantasia ?? "Empresa", remover: () => setEmpresaFiltro("") });
  if (catFiltro) chips.push({ id: "categoria", label: categorias.find((c) => c.id === catFiltro)?.nome ?? "Categoria", remover: () => setCatFiltro("") });
  if (statusFiltro) chips.push({ id: "status", label: STATUS_LABEL[statusFiltro] ?? statusFiltro, remover: () => setStatusFiltro("") });
  if (dataInicio || dataFim) chips.push({ id: "intervalo", label: rotuloIntervalo, remover: () => { setDataInicio(""); setDataFim(""); } });
  if (periodo !== "selecionado") chips.push({ id: "periodo", label: rotuloPeriodo(periodo, competencia), remover: () => setPeriodo("selecionado") });

  const temFiltro = chips.length > 0;
  const limpar = () => {
    setBusca(""); setEmpresaFiltro(""); setCatFiltro(""); setStatusFiltro("");
    setPeriodo("selecionado"); setCampoData("vencimento"); setDataInicio(""); setDataFim("");
  };

  return {
    competencia,
    busca, setBusca, empresaFiltro, setEmpresaFiltro, catFiltro, setCatFiltro, statusFiltro, setStatusFiltro,
    periodo, setPeriodo, campoData, setCampoData, dataInicio, setDataInicio, dataFim, setDataFim,
    intervaloAtivo, intervaloInvalido, periodoLabel,
    itens, kpiItens,
    opcoesEmpresa, opcoesCategoria, opcoesStatus, contEmpresa, contCategoria, contStatus, totalSemStatus,
    chips, temFiltro, limpar,
  };
}

export type FiltrosLancamentos = ReturnType<typeof useFiltrosLancamentos>;
