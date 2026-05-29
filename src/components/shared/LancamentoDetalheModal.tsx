import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Download, Trash2, Paperclip, Upload, Eye, ChevronLeft, ChevronRight, X as XIcon, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLancamentos } from "../../hooks/useLancamentos";
import { useEmpresas } from "../../hooks/useEmpresas";
import { useCategorias } from "../../hooks/useCategorias";
import { lancamentoSchema, LancamentoFormData } from "../../utils/validators";
import { fmtMoeda, fmtData } from "../../utils/format";
import { useToast } from "../ui/Toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import StatusBadge from "./StatusBadge";
import { getAnexos, uploadAnexo, deleteAnexo } from "../../services/anexos";
import type { Anexo } from "../../services/anexos";
import type { Lancamento } from "../../types";

interface Props {
  lancamento: Lancamento;
  open: boolean;
  onClose: () => void;
}

function isImage(a: Anexo): boolean {
  return a.mimeType.startsWith("image/");
}
function isPdf(a: Anexo): boolean {
  return a.mimeType === "application/pdf";
}
function canPreview(a: Anexo): boolean {
  return isImage(a) || isPdf(a);
}

interface PreviewProps {
  arquivo: Anexo;
  arquivos: Anexo[];
  onClose: () => void;
  onNavigate: (a: Anexo) => void;
}

function PreviewOverlay({ arquivo, arquivos, onClose, onNavigate }: PreviewProps) {
  const previewable = arquivos.filter(canPreview);
  const idx = previewable.findIndex((f) => f.id === arquivo.id);
  const hasPrev = idx > 0;
  const hasNext = idx < previewable.length - 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(previewable[idx - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(previewable[idx + 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-white text-sm font-medium truncate max-w-[70%]">{arquivo.nome}</span>
        <div className="flex items-center gap-2">
          <a
            href={arquivo.signedUrl}
            download={arquivo.nome}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={13} /> Baixar
          </a>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors">
            <XIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 pb-4 relative" onClick={(e) => e.stopPropagation()}>
        {hasPrev && (
          <button onClick={() => onNavigate(previewable[idx - 1])} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10">
            <ChevronLeft size={20} />
          </button>
        )}

        {isImage(arquivo) ? (
          <img src={arquivo.signedUrl} alt={arquivo.nome} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
        ) : isPdf(arquivo) ? (
          <iframe src={arquivo.signedUrl} title={arquivo.nome} className="w-full h-full rounded-lg bg-white" />
        ) : null}

        {hasNext && (
          <button onClick={() => onNavigate(previewable[idx + 1])} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10">
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {previewable.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          {previewable.map((f, i) => (
            <button
              key={f.id}
              onClick={() => onNavigate(f)}
              className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all ${
                i === idx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-100"
              }`}
            >
              {isImage(f) ? (
                <img src={f.signedUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-red-900/60 flex items-center justify-center">
                  <FileText size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function LancamentoDetalheModal({ lancamento, open, onClose }: Props) {
  const { updateLancamento } = useLancamentos();
  const { empresas } = useEmpresas();
  const { categorias } = useCategorias();
  const { toast } = useToast();
  const { format: maskFmt, parse: maskParse } = useMaskMoeda();

  const [valorDisplay, setValorDisplay] = useState("");
  const [arquivos, setArquivos] = useState<Anexo[]>([]);
  const [loadingArquivos, setLoadingArquivos] = useState(false);
  const [novosArquivos, setNovosArquivos] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<Anexo | null>(null);

  const tipo = lancamento.tipo;
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo && c.ativo);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<LancamentoFormData>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: { tipo, tipoRecorrencia: "avista" },
  });

  const tipoRecorrencia = watch("tipoRecorrencia");

  useEffect(() => {
    if (!open) return;
    reset({
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      empresaId: lancamento.empresaId,
      categoriaId: lancamento.categoriaId,
      valor: lancamento.valor,
      dataEmissao: lancamento.dataEmissao,
      dataVencimento: lancamento.dataVencimento,
      tipoRecorrencia: lancamento.tipoRecorrencia,
      recorrencia: lancamento.recorrencia,
      numeroParcelas: lancamento.numeroParcelas,
      diaVencimento: lancamento.diaVencimento,
      observacoes: lancamento.observacoes ?? "",
    });
    setValorDisplay(
      lancamento.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setNovosArquivos([]);
    setPreview(null);
    loadArquivos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lancamento.id]);

  async function loadArquivos() {
    setLoadingArquivos(true);
    try {
      const data = await getAnexos(lancamento.id);
      setArquivos(data);
    } finally {
      setLoadingArquivos(false);
    }
  }

  async function excluirArquivo(id: string, storagePath: string) {
    await deleteAnexo(id, storagePath);
    setArquivos((prev) => prev.filter((f) => f.id !== id));
    toast({ title: "Arquivo removido", variant: "info" });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setNovosArquivos((prev) => [...prev, ...dropped]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setNovosArquivos((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  async function uploadNovosArquivos(lancId: string) {
    if (novosArquivos.length === 0) return;
    const results = await Promise.allSettled(novosArquivos.map((f) => uploadAnexo(lancId, f)));
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failures.length > 0) {
      const msg = failures[0].reason instanceof Error ? failures[0].reason.message : String(failures[0].reason);
      console.error("[upload] Falha:", msg);
      toast({ title: `Erro ao enviar arquivo`, description: msg, variant: "error" });
    }
  }

  const onSubmit = async (data: LancamentoFormData) => {
    try {
      await updateLancamento(lancamento.id, {
        descricao: data.descricao,
        empresaId: data.empresaId,
        categoriaId: data.categoriaId,
        valor: maskParse(valorDisplay),
        valorTotal: maskParse(valorDisplay),
        dataEmissao: data.dataEmissao,
        dataVencimento: data.dataVencimento,
        tipoRecorrencia: data.tipoRecorrencia,
        recorrencia: data.recorrencia,
        numeroParcelas: data.numeroParcelas,
        diaVencimento: data.diaVencimento,
        observacoes: data.observacoes,
        competencia: data.dataVencimento.substring(0, 7),
      });
      await uploadNovosArquivos(lancamento.id);
      toast({ title: "Lançamento atualizado!", variant: "success" });
      onClose();
    } catch {
      toast({ title: "Erro ao salvar", variant: "error" });
    }
  };

  const fmtBytes = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle>{lancamento.descricao}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vencimento: {fmtData(lancamento.dataVencimento)} &middot; <span className="font-medium" style={{ color: tipo === "credito" ? "#1D9E75" : "#EF4444" }}>{fmtMoeda(lancamento.valor)}</span>
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={lancamento.status} />
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5">
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

            <Input label="Descricao" error={errors.descricao?.message} {...register("descricao")} />

            <div className="grid grid-cols-3 gap-3">
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
              <Input type="date" label="Emissao" error={errors.dataEmissao?.message} {...register("dataEmissao")} />
              <Input type="date" label="Vencimento" error={errors.dataVencimento?.message} {...register("dataVencimento")} />
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium leading-none text-foreground block mb-1.5">Tipo de pagamento</span>
              <div className="grid grid-cols-3 gap-2">
                {(["avista", "fixo", "parcelas"] as const).map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setValue("tipoRecorrencia", tr)}
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
              <Input type="number" label="Numero de parcelas" min={2} max={120} error={errors.numeroParcelas?.message} {...register("numeroParcelas", { valueAsNumber: true })} />
            )}

            {tipoRecorrencia === "fixo" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none text-foreground">Recorrencia</label>
                  <select className={selectClass} {...register("recorrencia")}>
                    <option value="">Selecione...</option>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <Input type="number" label="Dia de vencimento" min={1} max={31} {...register("diaVencimento", { valueAsNumber: true })} />
              </div>
            )}

            {lancamento.dataPagamento && (
              <div className="flex items-center gap-2 text-sm p-3 bg-emerald-50 rounded-lg text-emerald-700">
                <span className="font-medium">Pago em:</span> {fmtData(lancamento.dataPagamento)}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none text-foreground">Observacoes</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-none"
                placeholder="Observacoes adicionais..."
                {...register("observacoes")}
              />
            </div>

            {/* Anexos salvos */}
            <div>
              <p className="text-sm font-medium leading-none text-foreground mb-2 flex items-center gap-1.5">
                <Paperclip size={14} /> Anexos
              </p>

              {loadingArquivos ? (
                <p className="text-xs text-muted-foreground">Carregando anexos...</p>
              ) : arquivos.length > 0 ? (
                <ul className="space-y-1.5 mb-3">
                  {arquivos.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs">
                      {isImage(f) ? (
                        <button
                          type="button"
                          onClick={() => setPreview(f)}
                          className="w-8 h-8 rounded overflow-hidden border border-border shrink-0 hover:ring-2 hover:ring-primary transition-all"
                          title="Visualizar"
                        >
                          <img src={f.signedUrl} alt={f.nome} className="w-full h-full object-cover" />
                        </button>
                      ) : isPdf(f) ? (
                        <FileText size={14} className="text-red-500 shrink-0" />
                      ) : (
                        <FileImage size={14} className="text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 truncate text-foreground">{f.nome}</span>
                      <span className="text-muted-foreground shrink-0">{fmtBytes(f.size)}</span>
                      {canPreview(f) && (
                        <button
                          type="button"
                          onClick={() => setPreview(f)}
                          className="text-primary hover:text-primary/80"
                          title="Visualizar"
                        >
                          <Eye size={13} />
                        </button>
                      )}
                      <a href={f.signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" title="Baixar">
                        <Download size={13} />
                      </a>
                      <button type="button" onClick={() => excluirArquivo(f.id, f.storagePath)} className="text-muted-foreground hover:text-destructive" title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">Nenhum anexo salvo.</p>
              )}

              {/* Upload de novos */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent cursor-pointer"
                )}
              >
                <label className="cursor-pointer flex flex-col items-center gap-1">
                  <Upload size={18} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Arraste ou <span className="text-primary font-medium">clique para anexar</span></p>
                  <p className="text-xs text-muted-foreground/70">PDF, imagem ou documento — máx. 10 MB</p>
                  <input type="file" className="sr-only" multiple onChange={handleFileInput} accept="image/*,application/pdf,.doc,.docx" />
                </label>
              </div>

              {novosArquivos.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {novosArquivos.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                      <FileText size={14} className="text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground">{f.name}</span>
                      <span className="text-muted-foreground">{fmtBytes(f.size)}</span>
                      <button type="button" onClick={() => setNovosArquivos((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <PreviewOverlay
          arquivo={preview}
          arquivos={arquivos}
          onClose={() => setPreview(null)}
          onNavigate={setPreview}
        />
      )}
    </>
  );
}
