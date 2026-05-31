import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  TrendingUp, TrendingDown, Building2, Tag, AlignLeft,
  DollarSign, Calendar, CalendarClock, Repeat, Hash,
  Paperclip, FileText, RotateCcw, Save, SplitSquareHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { lancamentoSchema, LancamentoFormData } from "../utils/validators";
import { calcularParcelasValor, calcularTotalParcelado } from "../utils/calculos";
import { fmtMoeda } from "../utils/format";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import DropZone from "../components/ui/DropZone";
import LancamentoRow from "../components/shared/LancamentoRow";
import { useToast } from "../components/ui/Toast";
import { uploadAnexos } from "../services/anexos";
import type { Lancamento } from "../types";

/* ───── helpers ───── */
function useMaskMoeda() {
  const fmt = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);
  const parse = useCallback((formatted: string): number =>
    parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0, []);
  return { format: fmt, parse };
}

const fieldBase =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

/* ───── sub-components ───── */
function FieldLabel({ icon: Icon, children, required }: {
  icon: React.ElementType; children: React.ReactNode; required?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
      <Icon size={12} className="text-muted-foreground/70" />
      {children}
      {required && <span className="text-destructive text-xs">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

/* ───── main component ───── */
export default function Lancamentos() {
  const { lancamentos, addLancamento, deleteLancamento } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();
  const { toast } = useToast();
  const { format: maskFmt, parse: maskParse } = useMaskMoeda();

  const [valorDisplay, setValorDisplay] = useState("");
  const [tipo, setTipo] = useState<"credito" | "debito">("debito");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [dropKey, setDropKey] = useState(0);

  const { register, handleSubmit, watch, reset, setValue,
    formState: { errors, isSubmitting } } = useForm<LancamentoFormData>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: "debito",
      tipoRecorrencia: "avista",
      dataEmissao: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const tipoRecorrencia = watch("tipoRecorrencia");
  const numeroParcelas = watch("numeroParcelas") ?? 1;
  const diaVencimentoWatch = watch("diaVencimento");
  const valorNum = maskParse(valorDisplay);

  useEffect(() => {
    if (tipoRecorrencia !== "fixo") return;
    if (!diaVencimentoWatch || diaVencimentoWatch < 1 || diaVencimentoWatch > 31) {
      setValue("dataVencimento", ""); return;
    }
    const hoje = new Date();
    const maxDay = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const dia = Math.min(diaVencimentoWatch, maxDay);
    setValue("dataVencimento", format(new Date(hoje.getFullYear(), hoje.getMonth(), dia), "yyyy-MM-dd"));
  }, [tipoRecorrencia, diaVencimentoWatch, setValue]);

  const handleTipoChange = (t: "credito" | "debito") => {
    setTipo(t);
    setValue("tipo", t);
    setValue("categoriaId", "");
  };

  const onSubmit = async (data: LancamentoFormData) => {
    const valorFinal = valorNum;
    const valorTotalFinal = data.tipoRecorrencia === "parcelas"
      ? calcularTotalParcelado(valorFinal, data.numeroParcelas ?? 1)
      : valorFinal;
    try {
      const id = await addLancamento({
        tipo: data.tipo, descricao: data.descricao, empresaId: data.empresaId,
        categoriaId: data.categoriaId, valor: valorFinal, valorTotal: valorTotalFinal,
        dataEmissao: data.dataEmissao, dataVencimento: data.dataVencimento,
        status: "pendente", tipoRecorrencia: data.tipoRecorrencia,
        recorrencia: data.recorrencia, numeroParcelas: data.numeroParcelas,
        diaVencimento: data.diaVencimento, observacoes: data.observacoes,
        anexos: [], competencia: data.dataVencimento.substring(0, 7),
      });
      toast({ title: "Lançamento salvo com sucesso!", variant: "success" });
      const arquivosParaUpload = [...arquivos];
      reset({ tipo, tipoRecorrencia: "avista", dataEmissao: format(new Date(), "yyyy-MM-dd") });
      setValorDisplay(""); setArquivos([]); setDropKey((k) => k + 1);
      if (id && arquivosParaUpload.length > 0) {
        uploadAnexos(id, arquivosParaUpload).catch(() => {
          toast({ title: "Lançamento salvo, mas os anexos não foram enviados", variant: "error" });
        });
      }
    } catch {
      toast({ title: "Erro ao salvar lançamento", variant: "error" });
    }
  };

  const recentes = [...lancamentos]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((l) => ({
      ...l,
      empresa: empresas.find((e) => e.id === l.empresaId),
      categoria: categorias.find((c) => c.id === l.categoriaId),
    }));

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo && c.ativo);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ── Formulário ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Header colorido por tipo */}
        <div className={cn(
          "px-5 py-4 border-b border-border transition-colors",
          tipo === "credito" ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"
        )}>
          <h2 className="text-base font-semibold text-foreground">Novo Lançamento</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Preencha os dados do lançamento financeiro</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">

          {/* ── Tipo ── */}
          <div>
            <FieldLabel icon={TrendingDown}>Tipo de lançamento</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTipoChange("credito")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                  tipo === "credito"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30"
                    : "bg-background text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
                )}
              >
                <TrendingUp size={16} />
                Receita
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("debito")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                  tipo === "debito"
                    ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-200 dark:shadow-red-900/30"
                    : "bg-background text-muted-foreground border-border hover:border-red-300 hover:text-red-600 hover:bg-red-50"
                )}
              >
                <TrendingDown size={16} />
                Despesa
              </button>
            </div>
            <input type="hidden" {...register("tipo")} />
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-border/60" />

          {/* ── Empresa + Categoria ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel icon={Building2} required>Empresa</FieldLabel>
              <select className={cn(fieldBase, errors.empresaId && "border-destructive")} {...register("empresaId")}>
                <option value="">Selecione...</option>
                {empresas.filter((e) => e.ativo).map((e) => (
                  <option key={e.id} value={e.id}>{e.nomeFantasia}</option>
                ))}
              </select>
              <FieldError message={errors.empresaId?.message} />
            </div>
            <div>
              <FieldLabel icon={Tag} required>Categoria</FieldLabel>
              <select className={cn(fieldBase, errors.categoriaId && "border-destructive")} {...register("categoriaId")}>
                <option value="">Selecione...</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <FieldError message={errors.categoriaId?.message} />
            </div>
          </div>

          {/* ── Descrição ── */}
          <div>
            <FieldLabel icon={AlignLeft} required>Descrição</FieldLabel>
            <input
              className={cn(fieldBase, errors.descricao && "border-destructive")}
              placeholder="Descreva o lançamento..."
              {...register("descricao")}
            />
            <FieldError message={errors.descricao?.message} />
          </div>

          {/* ── Valor ── */}
          <div>
            <FieldLabel icon={DollarSign} required>Valor</FieldLabel>
            <div className="relative">
              <span className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold select-none",
                tipo === "credito" ? "text-emerald-600" : "text-red-500"
              )}>
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                className={cn(
                  fieldBase, "pl-10 text-base font-semibold",
                  tipo === "credito"
                    ? "focus-visible:ring-emerald-400/40 focus-visible:border-emerald-400"
                    : "focus-visible:ring-red-400/40 focus-visible:border-red-400",
                  errors.valor && "border-destructive"
                )}
                placeholder="0,00"
                value={valorDisplay}
                onChange={(e) => {
                  const masked = maskFmt(e.target.value);
                  setValorDisplay(masked);
                  setValue("valor", maskParse(masked));
                }}
              />
            </div>
            <FieldError message={errors.valor?.message} />
          </div>

          {/* ── Datas ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel icon={Calendar}>Data de Emissão</FieldLabel>
              <input type="date" className={cn(fieldBase, errors.dataEmissao && "border-destructive")} {...register("dataEmissao")} />
              <FieldError message={errors.dataEmissao?.message} />
            </div>
            <div>
              <FieldLabel icon={CalendarClock} required>Data de Vencimento</FieldLabel>
              <input
                type="date"
                className={cn(
                  fieldBase,
                  errors.dataVencimento && "border-destructive",
                  tipoRecorrencia === "fixo" && "bg-muted cursor-not-allowed opacity-60"
                )}
                readOnly={tipoRecorrencia === "fixo"}
                {...register("dataVencimento")}
              />
              <FieldError message={errors.dataVencimento?.message} />
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-border/60" />

          {/* ── Tipo de pagamento ── */}
          <div>
            <FieldLabel icon={SplitSquareHorizontal}>Tipo de pagamento</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {(["avista", "fixo", "parcelas"] as const).map((tr) => {
                const labels = { avista: "À Vista", fixo: "Conta Fixa", parcelas: "Parcelado" };
                const icons = { avista: DollarSign, fixo: Repeat, parcelas: SplitSquareHorizontal };
                const Icon = icons[tr];
                return (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => { setValue("tipoRecorrencia", tr); if (tr === "fixo") setValue("dataVencimento", ""); }}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all",
                      tipoRecorrencia === tr
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    <Icon size={14} />
                    {labels[tr]}
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register("tipoRecorrencia")} />
          </div>

          {/* ── Parcelas (condicional) ── */}
          {tipoRecorrencia === "parcelas" && (
            <div className="p-4 bg-muted/60 rounded-xl border border-border space-y-3">
              <div>
                <FieldLabel icon={Hash} required>Número de parcelas</FieldLabel>
                <input
                  type="number" min={2} max={120}
                  className={cn(fieldBase, errors.numeroParcelas && "border-destructive")}
                  placeholder="Ex: 12"
                  {...register("numeroParcelas", { valueAsNumber: true })}
                />
                <FieldError message={errors.numeroParcelas?.message} />
              </div>
              {valorNum > 0 && numeroParcelas >= 2 && (
                <div className="flex items-center justify-between bg-background border border-border rounded-lg px-4 py-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Por parcela</p>
                    <p className="text-sm font-bold text-foreground">{fmtMoeda(calcularParcelasValor(valorNum, numeroParcelas))}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Total ({numeroParcelas}x)</p>
                    <p className="text-sm font-bold text-foreground">{fmtMoeda(calcularTotalParcelado(valorNum, numeroParcelas))}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Conta fixa (condicional) ── */}
          {tipoRecorrencia === "fixo" && (
            <div className="p-4 bg-muted/60 rounded-xl border border-border grid grid-cols-2 gap-3">
              <div>
                <FieldLabel icon={Repeat} required>Recorrência</FieldLabel>
                <select
                  className={cn(fieldBase, errors.recorrencia && "border-destructive")}
                  {...register("recorrencia")}
                >
                  <option value="">Selecione...</option>
                  <option value="mensal">Mensal</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
                <FieldError message={errors.recorrencia?.message} />
              </div>
              <div>
                <FieldLabel icon={Hash} required>Dia de vencimento</FieldLabel>
                <input
                  type="number" min={1} max={31}
                  className={cn(fieldBase, errors.diaVencimento && "border-destructive")}
                  placeholder="Ex: 10"
                  {...register("diaVencimento", { valueAsNumber: true })}
                />
                <FieldError message={errors.diaVencimento?.message} />
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-border/60" />

          {/* ── Anexos ── */}
          <div>
            <FieldLabel icon={Paperclip}>Anexos</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <DropZone key={`boleto-${dropKey}`} label="Boleto / NF" onFilesAccepted={(files) => setArquivos((prev) => [...prev, ...files])} hint="PDF, PNG, JPG" />
              <DropZone key={`comp-${dropKey}`} label="Comprovante" onFilesAccepted={(files) => setArquivos((prev) => [...prev, ...files])} hint="PDF, PNG, JPG" />
            </div>
            {arquivos.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {arquivos.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>

          {/* ── Observações ── */}
          <div>
            <FieldLabel icon={FileText}>Observações</FieldLabel>
            <textarea
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring min-h-[72px] resize-none"
              placeholder="Informações adicionais sobre o lançamento..."
              {...register("observacoes")}
            />
          </div>

          {/* ── Ações ── */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-none px-4 gap-1.5"
              onClick={() => { reset(); setValorDisplay(""); }}
            >
              <RotateCcw size={14} />
              Limpar
            </Button>
            <Button
              type="submit"
              className={cn(
                "flex-1 gap-1.5 font-semibold",
                tipo === "credito"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
              )}
              loading={isSubmitting}
            >
              <Save size={14} />
              {tipo === "credito" ? "Salvar Receita" : "Salvar Despesa"}
            </Button>
          </div>

        </form>
      </div>

      {/* ── Painel direito ── */}
      <div className="space-y-4">
        <Card title="Lançamentos Recentes">
          <div className="divide-y divide-border">
            {recentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento ainda.</p>
            ) : (
              recentes.map((l) => (
                <LancamentoRow
                  key={l.id}
                  lancamento={l as Lancamento}
                  onDelete={async (id) => {
                    try {
                      await deleteLancamento(id);
                      toast({ title: "Lançamento excluído", variant: "info" });
                    } catch {
                      toast({ title: "Erro ao excluir", variant: "error" });
                    }
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Resumo do mês */}
        <Card title="Resumo do Mês">
          {(() => {
            const comp = format(new Date(), "yyyy-MM");
            const doMes = lancamentos.filter((l) => l.competencia === comp);
            const receitasMes = doMes.filter((l) => l.tipo === "credito").reduce((a, l) => a + l.valor, 0);
            const despesasMes = doMes.filter((l) => l.tipo === "debito").reduce((a, l) => a + l.valor, 0);
            const saldo = receitasMes - despesasMes;
            const max = Math.max(receitasMes, despesasMes, 1);
            return (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp size={12} className="text-emerald-500" /> Receitas
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">{fmtMoeda(receitasMes)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(receitasMes / max) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingDown size={12} className="text-red-500" /> Despesas
                    </span>
                    <span className="text-sm font-semibold text-destructive">{fmtMoeda(despesasMes)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive rounded-full transition-all duration-500" style={{ width: `${(despesasMes / max) * 100}%` }} />
                  </div>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Saldo do mês</span>
                  <span className={cn(
                    "text-lg font-bold",
                    saldo >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {fmtMoeda(saldo)}
                  </span>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
