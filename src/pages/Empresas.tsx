import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Power, Building2, Search, X } from "lucide-react";
import { useEmpresas } from "../hooks/useEmpresas";
import { useLancamentos } from "../hooks/useLancamentos";
import { empresaSchema, EmpresaFormData } from "../utils/validators";
import { fmtMoeda } from "../utils/format";
import { maskCnpj, maskTelefone } from "../utils/masks";
import type { Empresa } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/Dialog";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function normalize(str: string): string {
  return (str ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function Empresas() {
  const { empresas, addEmpresa, updateEmpresa } = useEmpresas();
  const { lancamentos } = useLancamentos();
  const { toast } = useToast();

  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [selecionada, setSelecionada] = useState<Empresa | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { cor: "#1D9E75" },
  });

  const abrirNova = () => {
    setEditando(null);
    reset({ cor: "#1D9E75" });
    setModalOpen(true);
  };

  const abrirEditar = (e: Empresa) => {
    setEditando(e);
    reset(e);
    setModalOpen(true);
  };

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      if (editando) {
        await updateEmpresa(editando.id, data);
        toast({ title: "Empresa atualizada!", variant: "success" });
      } else {
        await addEmpresa({ ...data, ativo: true });
        toast({ title: "Empresa cadastrada!", variant: "success" });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Erro ao salvar empresa", variant: "error" });
    }
  };

  const empresasFiltradas = busca.trim()
    ? empresas.filter((e) => {
        const q = normalize(busca);
        return (
          normalize(e.nomeFantasia).includes(q) ||
          normalize(e.razaoSocial).includes(q) ||
          normalize(e.cnpj).includes(q) ||
          normalize(e.email).includes(q) ||
          normalize(e.telefone).includes(q) ||
          normalize(e.cidade).includes(q) ||
          normalize(e.estado).includes(q)
        );
      })
    : empresas;

  const getLancamentosEmpresa = (id: string) => lancamentos.filter((l) => l.empresaId === id);

  const getEmAberto = (id: string) =>
    lancamentos
      .filter((l) => l.empresaId === id && (l.status === "pendente" || l.status === "vencido"))
      .reduce((a, l) => a + l.valor, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Grid de empresas */}
      <div className="xl:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">Empresas cadastradas</h2>
          <Button size="sm" onClick={abrirNova}>
            <Plus size={14} />
            Nova empresa
          </Button>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CNPJ, cidade, e-mail..."
            className="w-full h-9 pl-9 pr-8 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {empresasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Search size={28} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhuma empresa encontrada para "<span className="font-medium text-foreground">{busca}</span>"</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {empresasFiltradas.map((empresa) => {
            const lancEmpresa = getLancamentosEmpresa(empresa.id);
            const emAberto = getEmAberto(empresa.id);

            return (
              <div
                key={empresa.id}
                onClick={() => setSelecionada(empresa)}
                className={`rounded-xl border bg-card text-card-foreground shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${selecionada?.id === empresa.id ? "ring-2 ring-primary" : ""} ${!empresa.ativo ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: empresa.cor }}
                  >
                    {getInitials(empresa.nomeFantasia)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{empresa.nomeFantasia}</p>
                    <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                    <p className="text-xs text-muted-foreground">{empresa.cidade}/{empresa.estado}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    <span>{lancEmpresa.length} lancamentos</span>
                  </div>
                  <div className="text-xs">
                    {emAberto > 0 && (
                      <span className="text-amber-600 font-medium">{fmtMoeda(emAberto)} em aberto</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirEditar(empresa); }}
                      className="p-1 rounded text-muted-foreground hover:bg-accent"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateEmpresa(empresa.id, { ativo: !empresa.ativo }); }}
                      className={`p-1 rounded ${empresa.ativo ? "text-muted-foreground hover:bg-accent" : "text-emerald-500 hover:bg-emerald-50"}`}
                    >
                      <Power size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel lateral */}
      <div>
        {selecionada ? (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selecionada.cor }}
              >
                {getInitials(selecionada.nomeFantasia)}
              </div>
              <div>
                <h3 className="font-semibold">{selecionada.nomeFantasia}</h3>
                <p className="text-xs text-muted-foreground">{selecionada.razaoSocial}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="text-muted-foreground/60">CNPJ:</span> {selecionada.cnpj}</p>
              <p><span className="text-muted-foreground/60">Email:</span> {selecionada.email}</p>
              <p><span className="text-muted-foreground/60">Tel:</span> {selecionada.telefone}</p>
              <p><span className="text-muted-foreground/60">Cidade:</span> {selecionada.cidade}/{selecionada.estado}</p>
            </div>

            {(() => {
              const lancs = getLancamentosEmpresa(selecionada.id);
              const receitas = lancs.filter((l) => l.tipo === "credito").reduce((a, l) => a + l.valor, 0);
              const despesas = lancs.filter((l) => l.tipo === "debito").reduce((a, l) => a + l.valor, 0);
              return (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div className="bg-emerald-50 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Receitas</p>
                    <p className="text-sm font-semibold text-emerald-600">{fmtMoeda(receitas)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-sm font-semibold text-destructive">{fmtMoeda(despesas)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Building2 size={32} />
            <p className="text-sm">Selecione uma empresa</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Razao Social" error={errors.razaoSocial?.message} {...register("razaoSocial")} />
              <Input label="Nome Fantasia" error={errors.nomeFantasia?.message} {...register("nomeFantasia")} />
            </div>
            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              error={errors.cnpj?.message}
              {...register("cnpj")}
              onChange={(e) => {
                const masked = maskCnpj(e.target.value);
                e.target.value = masked;
                setValue("cnpj", masked, { shouldValidate: false });
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                error={errors.telefone?.message}
                {...register("telefone")}
                onChange={(e) => {
                  const masked = maskTelefone(e.target.value);
                  e.target.value = masked;
                  setValue("telefone", masked, { shouldValidate: false });
                }}
              />
              <Input label="E-mail" placeholder="email@exemplo.com" error={errors.email?.message} {...register("email")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cidade" error={errors.cidade?.message} {...register("cidade")} />
              <Input label="Estado (UF)" maxLength={2} error={errors.estado?.message} {...register("estado")} />
            </div>
            <div>
              <label className="text-sm font-medium leading-none text-foreground block mb-1.5">Cor</label>
              <input type="color" className="w-10 h-8 rounded border border-input cursor-pointer" {...register("cor")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editando ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
