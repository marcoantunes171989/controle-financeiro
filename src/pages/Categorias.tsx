import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Pencil, Trash2, TrendingDown, TrendingUp, Tag,
  Briefcase, ShoppingCart, Building2, Zap, Wifi, Users,
  Truck, FileText, Wrench, Megaphone, Coins, MoreHorizontal,
  Home, Car, Heart, Coffee, Utensils, BookOpen, Music, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { useCategorias } from "../hooks/useCategorias";
import { useLancamentos } from "../hooks/useLancamentos";
import { fmtMoeda, corTipo, COR_RECEITA, COR_DESPESA } from "../utils/format";
import type { Categoria, TipoLancamento } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/Dialog";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";

const categoriaFormSchema = z.object({
  nome: z.string().min(2, "Minimo 2 caracteres"),
  tipo: z.enum(["debito", "credito"]),
  cor: z.string(),
  icone: z.string(),
  ativo: z.boolean().default(true),
});
type CategoriaFormData = z.infer<typeof categoriaFormSchema>;

const ICONES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "briefcase", label: "Trabalho", icon: <Briefcase size={18} /> },
  { value: "shopping-cart", label: "Compras", icon: <ShoppingCart size={18} /> },
  { value: "building-2", label: "Empresa", icon: <Building2 size={18} /> },
  { value: "zap", label: "Energia", icon: <Zap size={18} /> },
  { value: "wifi", label: "Internet", icon: <Wifi size={18} /> },
  { value: "users", label: "Pessoas", icon: <Users size={18} /> },
  { value: "truck", label: "Transporte", icon: <Truck size={18} /> },
  { value: "file-text", label: "Documento", icon: <FileText size={18} /> },
  { value: "wrench", label: "Manutencao", icon: <Wrench size={18} /> },
  { value: "megaphone", label: "Marketing", icon: <Megaphone size={18} /> },
  { value: "coins", label: "Financas", icon: <Coins size={18} /> },
  { value: "home", label: "Casa", icon: <Home size={18} /> },
  { value: "car", label: "Veiculo", icon: <Car size={18} /> },
  { value: "heart", label: "Saude", icon: <Heart size={18} /> },
  { value: "coffee", label: "Alimentacao", icon: <Coffee size={18} /> },
  { value: "utensils", label: "Restaurante", icon: <Utensils size={18} /> },
  { value: "book-open", label: "Educacao", icon: <BookOpen size={18} /> },
  { value: "music", label: "Lazer", icon: <Music size={18} /> },
  { value: "globe", label: "Internacional", icon: <Globe size={18} /> },
  { value: "more-horizontal", label: "Outros", icon: <MoreHorizontal size={18} /> },
];

const CORES_PRESET = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#1D9E75", "#06B6D4", "#3B82F6", "#8B5CF6",
  "#EC4899", "#6B7280", "#92400E", "#065F46",
];

function iconeNode(value: string, size = 18): React.ReactNode {
  const found = ICONES.find((i) => i.value === value);
  if (found) return found.icon;
  return <Tag size={size} />;
}

function CategoriaCard({ cat, lancamentos, onEdit, onDelete }: {
  cat: Categoria;
  lancamentos: import("../types").Lancamento[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const comp = format(new Date(), "yyyy-MM");
  const total = lancamentos.filter((l) => l.categoriaId === cat.id && l.competencia === comp).reduce((a, l) => a + l.valor, 0);
  const count = lancamentos.filter((l) => l.categoriaId === cat.id).length;
  const cor = corTipo(cat.tipo);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: cor }}
      >
        {iconeNode(cat.icone)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{cat.nome}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">{count} lancamento{count !== 1 ? "s" : ""}</span>
          {total > 0 && (
            <span className="text-xs font-medium" style={{ color: cor }}>{fmtMoeda(total)} este mes</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" title="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Excluir">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Categorias() {
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useCategorias();
  const { lancamentos } = useLancamentos();
  const { toast } = useToast();

  const [aba, setAba] = useState<TipoLancamento>("debito");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmNome, setConfirmNome] = useState("");

  const { register, handleSubmit, reset, watch, control, formState: { errors, isSubmitting } } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { cor: COR_DESPESA, icone: "briefcase", ativo: true },
  });

  const corAtual = watch("cor");
  const iconeAtual = watch("icone");
  const tipoAtual = watch("tipo");

  const abrirNova = (tipo: TipoLancamento) => {
    setEditando(null);
    reset({ tipo, cor: tipo === "credito" ? COR_RECEITA : COR_DESPESA, icone: "briefcase", ativo: true });
    setModalOpen(true);
  };

  const abrirEditar = (cat: Categoria) => {
    setEditando(cat);
    reset({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor, icone: cat.icone, ativo: cat.ativo });
    setModalOpen(true);
  };

  const onSubmit = async (data: CategoriaFormData) => {
    try {
      if (editando) {
        await updateCategoria(editando.id, data);
        toast({ title: "Categoria atualizada!", variant: "success" });
      } else {
        await addCategoria(data);
        toast({ title: "Categoria criada!", variant: "success" });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Erro ao salvar categoria", variant: "error" });
    }
  };

  const despesas = categorias.filter((c) => c.tipo === "debito");
  const receitas = categorias.filter((c) => c.tipo === "credito");
  const lista = aba === "debito" ? despesas : receitas;

  const totalMesDebito = lancamentos
    .filter((l) => l.tipo === "debito" && l.competencia === format(new Date(), "yyyy-MM"))
    .reduce((a, l) => a + l.valor, 0);
  const totalMesCredito = lancamentos
    .filter((l) => l.tipo === "credito" && l.competencia === format(new Date(), "yyyy-MM"))
    .reduce((a, l) => a + l.valor, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <TrendingDown size={20} className="text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Despesas este mes</p>
            <p className="text-base font-bold text-destructive">{fmtMoeda(totalMesDebito)}</p>
            <p className="text-xs text-muted-foreground">{despesas.length} categoria{despesas.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receitas este mes</p>
            <p className="text-base font-bold text-emerald-600">{fmtMoeda(totalMesCredito)}</p>
            <p className="text-xs text-muted-foreground">{receitas.length} categoria{receitas.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <Tabs value={aba} onValueChange={(v) => setAba(v as TipoLancamento)}>
            <TabsList>
              <TabsTrigger value="debito">
                Despesas
                {despesas.length > 0 && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{despesas.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="credito">
                Receitas
                {receitas.length > 0 && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{receitas.length}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => abrirNova(aba)}>
            <Plus size={13} />
            Nova categoria
          </Button>
        </div>

        <div className="p-4">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${aba === "debito" ? "bg-destructive/10" : "bg-emerald-50"}`}>
                <Tag size={24} className={aba === "debito" ? "text-destructive" : "text-emerald-400"} />
              </div>
              <p className="text-sm font-medium mb-1">Nenhuma categoria cadastrada</p>
              <p className="text-xs text-muted-foreground mb-4">Crie categorias para organizar seus {aba === "debito" ? "gastos" : "recebimentos"}</p>
              <Button size="sm" variant="secondary" onClick={() => abrirNova(aba)}>
                <Plus size={13} />
                Nova categoria
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {lista.map((cat) => (
                <CategoriaCard
                  key={cat.id}
                  cat={cat}
                  lancamentos={lancamentos}
                  onEdit={() => abrirEditar(cat)}
                  onDelete={() => { setConfirmId(cat.id); setConfirmNome(cat.nome); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de cadastro */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar categoria" : `Nova categoria de ${tipoAtual === "debito" ? "despesa" : "receita"}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <input type="hidden" {...register("tipo")} />
            <input type="hidden" {...register("ativo")} />

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 transition-colors"
                style={{ backgroundColor: corAtual }}
              >
                {iconeNode(iconeAtual, 22)}
              </div>
              <div>
                <p className="text-sm font-semibold">{watch("nome") || "Nome da categoria"}</p>
                <p className="text-xs text-muted-foreground">{tipoAtual === "debito" ? "Despesa" : "Receita"}</p>
              </div>
            </div>

            <Input
              label="Nome da categoria"
              placeholder="Ex: Alimentacao, Salario..."
              error={errors.nome?.message}
              {...register("nome")}
            />

            <div>
              <label className="text-sm font-medium leading-none text-foreground block mb-2">Icone</label>
              <Controller
                control={control}
                name="icone"
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-2">
                    {ICONES.map((ic) => (
                      <button
                        key={ic.value}
                        type="button"
                        title={ic.label}
                        onClick={() => field.onChange(ic.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                          field.value === ic.value
                            ? "border-2 text-white"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                        style={field.value === ic.value ? { borderColor: corAtual, backgroundColor: corAtual } : {}}
                      >
                        {ic.icon}
                        <span className="truncate w-full text-center leading-none">{ic.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div>
              <label className="text-sm font-medium leading-none text-foreground block mb-2">Cor</label>
              <Controller
                control={control}
                name="cor"
                render={({ field }) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    {CORES_PRESET.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${field.value === c ? "ring-2 ring-offset-2 ring-border scale-110" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-input transition-colors" title="Cor personalizada">
                      <span className="text-muted-foreground text-xs">+</span>
                      <input
                        type="color"
                        className="sr-only"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        message={`Deseja excluir a categoria "${confirmNome}"? Esta acao nao pode ser desfeita.`}
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          try {
            await deleteCategoria(confirmId!);
            toast({ title: "Categoria excluida", variant: "info" });
          } catch {
            toast({ title: "Erro ao excluir categoria", variant: "error" });
          } finally {
            setConfirmId(null);
          }
        }}
      />
    </div>
  );
}
