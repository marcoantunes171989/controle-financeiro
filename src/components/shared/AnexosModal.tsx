import { useEffect, useState } from "react";
import { FileText, Download, Paperclip, FileImage, FileArchive, Loader2, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { getAnexos } from "../../services/anexos";
import type { Anexo } from "../../services/anexos";
import type { Lancamento } from "../../types";

interface Props {
  lancamento: Pick<Lancamento, "id" | "descricao">;
  open: boolean;
  onClose: () => void;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

function FileIcon({ a }: { a: Anexo }) {
  if (isImage(a)) return <FileImage size={16} className="text-blue-500 shrink-0" />;
  if (isPdf(a)) return <FileText size={16} className="text-red-500 shrink-0" />;
  const ext = a.nome.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "rar", "7z"].includes(ext)) return <FileArchive size={16} className="text-amber-500 shrink-0" />;
  return <FileText size={16} className="text-muted-foreground shrink-0" />;
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
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" onClick={onClose}>
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
            <X size={18} />
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

export default function AnexosModal({ lancamento, open, onClose }: Props) {
  const [arquivos, setArquivos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState<Anexo | null>(null);

  useEffect(() => {
    if (!open) return;
    setArquivos([]);
    setErro(null);
    setPreview(null);
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lancamento.id]);

  async function load() {
    setLoading(true);
    try {
      const data = await getAnexos(lancamento.id);
      setArquivos(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar anexos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip size={16} />
              Anexos — {lancamento.descricao}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-xs">Carregando anexos...</p>
            </div>
          ) : erro ? (
            <div className="flex flex-col items-center gap-2 py-8 text-destructive">
              <p className="text-sm font-medium">Erro ao carregar</p>
              <p className="text-xs text-center text-muted-foreground">{erro}</p>
              <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
            </div>
          ) : arquivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Paperclip size={28} className="opacity-30" />
              <p className="text-sm font-medium">Nenhum anexo</p>
              <p className="text-xs text-center">Este lançamento não possui documentos anexados.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {arquivos.map((f) => (
                <li key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                  {isImage(f) ? (
                    <button
                      onClick={() => setPreview(f)}
                      className="w-10 h-10 rounded-md overflow-hidden border border-border shrink-0 hover:ring-2 hover:ring-primary transition-all"
                      title="Visualizar"
                    >
                      <img src={f.signedUrl} alt={f.nome} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <FileIcon a={f} />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{f.nome}</p>
                    {f.size > 0 && <p className="text-[10px] text-muted-foreground">{fmtBytes(f.size)}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canPreview(f) && (
                      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => setPreview(f)}>
                        <Eye size={12} /> Ver
                      </Button>
                    )}
                    <a href={f.signedUrl} target="_blank" rel="noopener noreferrer" download={f.nome}>
                      <Button size="sm" variant="secondary" className="h-7 px-2 gap-1 text-xs">
                        <Download size={12} /> Baixar
                      </Button>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          </div>
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
