import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../hooks/useLancamentos";
import { useEmpresas } from "../hooks/useEmpresas";
import { useCategorias } from "../hooks/useCategorias";
import { lancamentoSchema, LancamentoFormData } from "../utils/validators";
import { calcularParcelasValor, calcularTotalParcelado } from "../utils/calculos";
import { fmtMoeda } from "../utils/format";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import DropZone from "../components/ui/DropZone";
import LancamentoRow from "../components/shared/LancamentoRow";
import { useToast } from "../components/ui/Toast";
import { uploadAnexos } from "../services/anexos";
import type { Lancamento } from "../types";

function useMaskMoeda() {
  const fmt = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const parse = useCallback((formatted: string): number => {
    return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
  }, []);

  return { format: fmt, parse };
}

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<LancamentoFormData>({
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
      setValue("dataVencimento", "");
      return;
    }
    const hoje = new Date();
    const maxDay = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const dia = Math.min(diaVencimentoWatch, maxDay);
    setValue("dataVencimento", format(new Date(hoje.getFullYear(), hoje.getMonth(), dia), "yyyy-MM-dd"));
  }, [tipoRecorrencia, diaVencimentoWatch, setValue]);

  const onSubmit = async (data: LancamentoFormData) => {
    const valorFinal = valorNum;
    const valorTotalFinal = data.tipoRecorrencia === "parcelas"
      ? calcularTotalParcelado(valorFinal, data.numeroParcelas ?? 1)
      : valorFinal;

    try {
      const id = await addLancamento({
        tipo: data.tipo,
        descricao: data.descricao,
        empresaId: data.empresaId,
        categoriaId: data.categoriaId,
        valor: valorFinal,
        valorTotal: valorTotalFinal,
        dataEmissao: data.dataEmissao,
        dataVencimento: data.dataVencimento,
        status: "pendente",
        tipoRecorrencia: data.tipoRecorrencia,
        recorrencia: data.recorrencia,
        numeroParcelas: data.numeroParcelas,
        diaVencimento: data.diaVencimento,
        observacoes: data.observacoes,
        anexos: [],
        competencia: data.dataVencimento.substring(0, 7),
      });

      // Lançamento salvo — resetar form imediatamente
      toast({ title: "Lancamento salvo!", variant: "success" });
      const arquivosParaUpload = [...arquivos];
      reset({ tipo, tipoRecorrencia: "avista", dataEmissao: format(new Date(), "yyyy-MM-dd") });
      setValorDisplay("");
      setArquivos([]);
      setDropKey((k) => k + 1);

      // Upload de anexos é independente: falha não afeta o lançamento já salvo
      if (id && arquivosParaUpload.length > 0) {
        uploadAnexos(id, arquivosParaUpload).catch(() => {
          toast({ title: "Lançamento salvo, mas os anexos não foram enviados", variant: "error" });
        });
      }
    } catch {
      toast({ title: "Erro ao salvar lancamento", variant: "error" });
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

  const handleTipoChange = (t: "credito" | "debito") => {
    setTipo(t);
    setValue("tipo", t);
    setValue("categoriaId", "");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Formulario */}
      <Card title="Novo Lancamento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo toggle */}
          <div>
            <span className="text-sm font-medium leading-none text-foreground block mb-1.5">Tipo</span>
            <div className="grid grid-cols-2 gap-2">
              {(["credito", "debito"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipoChange(t)}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-medium border transition-all",
                    tipo === t
                      ? t === "credito"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-background text-muted-foreground border-input hover:bg-accent"
                  )}
                >
                  {t === "credito" ? "Credito / Receita" : "Debito / Despesa"}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("tipo")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none text-foreground">Empresa</label>
              <select className={cn(selectClass, errors.empresaId && "border-destructive")} {...register("empresaId")}>
                <option value="">Selecione...</option>
                {empresas.filter((e) => e.ativo).map((e) => (
                  <option key={e.id} value={e.id}>{e.nomeFantasia}</option>
                ))}
              </select>
              {errors.empresaId && <p className="text-xs text-destructive">{errors.empresaId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none text-foreground">Categoria</label>
              <select className={cn(selectClass, errors.categoriaId && "border-destructive")} {...register("categoriaId")}>
                <option value="">Selecione...</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.categoriaId && <p className="text-xs text-destructive">{errors.categoriaId.message}</p>}
            </div>
          </div>

          <Input
            label="Descricao"
            placeholder="Descreva o lancamento..."
            error={errors.descricao?.message}
            {...register("descricao")}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none text-foreground">Valor</label>
            <input
              type="text"
              inputMode="numeric"
              className={cn("flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring", errors.valor && "border-destructive")}
              placeholder="0,00"
              value={valorDisplay}
              onChange={(e) => {
                const masked = maskFmt(e.target.value);
                setValorDisplay(masked);
                setValue("valor", maskParse(masked));
              }}
            />
            {errors.valor && <p className="mt-1 text-xs text-destructive">{errors.valor.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Data de Emissao" error={errors.dataEmissao?.message} {...register("dataEmissao")} />
            <Input
              type="date"
              label="Data de Vencimento"
              error={errors.dataVencimento?.message}
              readOnly={tipoRecorrencia === "fixo"}
              className={tipoRecorrencia === "fixo" ? "bg-muted cursor-not-allowed opacity-70" : ""}
              {...register("dataVencimento")}
            />
          </div>

          {/* Tipo recorrencia */}
          <div>
            <span className="text-sm font-medium leading-none text-foreground block mb-1.5">Tipo de pagamento</span>
            <div className="grid grid-cols-3 gap-2">
              {(["avista", "fixo", "parcelas"] as const).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => {
                    setValue("tipoRecorrencia", tr);
                    if (tr === "fixo") setValue("dataVencimento", "");
                  }}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border transition-all",
                    tipoRecorrencia === tr
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:bg-accent"
                  )}
                >
                  {tr === "avista" ? "A Vista" : tr === "fixo" ? "Conta Fixa" : "Parcelado"}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("tipoRecorrencia")} />
          </div>

          {tipoRecorrencia === "parcelas" && (
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <Input
                type="number"
                label="Numero de parcelas"
                min={2}
                max={120}
                error={errors.numeroParcelas?.message}
                {...register("numeroParcelas", { valueAsNumber: true })}
              />
              {valorNum > 0 && numeroParcelas >= 2 && (
                <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg p-2.5">
                  <p>Valor por parcela: <strong className="text-foreground">{fmtMoeda(calcularParcelasValor(valorNum, numeroParcelas))}</strong></p>
                  <p>Total: <strong className="text-foreground">{fmtMoeda(calcularTotalParcelado(valorNum, numeroParcelas))}</strong></p>
                </div>
              )}
            </div>
          )}

          {tipoRecorrencia === "fixo" && (
            <div className="p-3 bg-muted rounded-lg grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none text-foreground">
                  Recorrencia <span className="text-destructive">*</span>
                </label>
                <select
                  className={cn(selectClass, errors.recorrencia && "border-destructive focus-visible:ring-destructive")}
                  {...register("recorrencia")}
                >
                  <option value="">Selecione...</option>
                  <option value="mensal">Mensal</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
                {errors.recorrencia && <p className="text-xs text-destructive">{errors.recorrencia.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Input
                  type="number"
                  label="Dia de vencimento *"
                  min={1}
                  max={31}
                  placeholder="Ex: 10"
                  error={errors.diaVencimento?.message}
                  {...register("diaVencimento", { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          {/* Anexos */}
          <div className="grid grid-cols-2 gap-3">
            <DropZone key={`boleto-${dropKey}`} label="Boleto / NF" onFilesAccepted={(files) => setArquivos((prev) => [...prev, ...files])} hint="PDF, PNG, JPG" />
            <DropZone key={`comp-${dropKey}`} label="Comprovante" onFilesAccepted={(files) => setArquivos((prev) => [...prev, ...files])} hint="PDF, PNG, JPG" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none text-foreground">Observacoes</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-none"
              placeholder="Observacoes adicionais..."
              {...register("observacoes")}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { reset(); setValorDisplay(""); }}
            >
              Limpar
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              Salvar lancamento
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista recente */}
      <div className="space-y-4">
        <Card title="Lancamentos Recentes">
          <div className="divide-y divide-border">
            {recentes.map((l) => (
              <LancamentoRow
                key={l.id}
                lancamento={l as Lancamento}
                onDelete={async (id) => {
                  try {
                    await deleteLancamento(id);
                    toast({ title: "Lancamento excluido", variant: "info" });
                  } catch {
                    toast({ title: "Erro ao excluir", variant: "error" });
                  }
                }}
              />
            ))}
          </div>
        </Card>

        {/* Resumo do mes */}
        <Card title="Resumo do Mes">
          {(() => {
            const comp = format(new Date(), "yyyy-MM");
            const doMes = lancamentos.filter((l) => l.competencia === comp);
            const receitasMes = doMes.filter((l) => l.tipo === "credito").reduce((a, l) => a + l.valor, 0);
            const despesasMes = doMes.filter((l) => l.tipo === "debito").reduce((a, l) => a + l.valor, 0);
            const saldo = receitasMes - despesasMes;
            const max = Math.max(receitasMes, despesasMes, 1);
            return (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Receitas</span><span className="font-medium text-emerald-600">{fmtMoeda(receitasMes)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(receitasMes / max) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Despesas</span><span className="font-medium text-destructive">{fmtMoeda(despesasMes)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive rounded-full" style={{ width: `${(despesasMes / max) * 100}%` }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className={`font-semibold ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmtMoeda(saldo)}</span>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
