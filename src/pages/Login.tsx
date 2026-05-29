import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { TrendingDown } from "lucide-react";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("entrar");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setMsg("");
    setLoading(true);
    try {
      if (tab === "entrar") {
        await signIn(email, senha);
        navigate("/dashboard");
      } else {
        await signUp(email, senha);
        setMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao autenticar";
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <TrendingDown className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">Finance Control</h1>
          <p className="text-slate-400 text-sm mt-1">Controle financeiro empresarial</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">Acesse sua conta ou crie uma nova</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setErro(""); setMsg(""); }}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="entrar" className="flex-1">Entrar</TabsTrigger>
                <TabsTrigger value="cadastrar" className="flex-1">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    label="E-mail"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <Input
                    type="password"
                    label="Senha"
                    placeholder="Sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                  {erro && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{erro}</p>}
                  <Button type="submit" className="w-full" loading={loading}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="cadastrar">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    label="E-mail"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    label="Senha"
                    placeholder="Minimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                  {erro && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{erro}</p>}
                  {msg && <p className="text-xs text-primary bg-primary/10 px-3 py-2 rounded-md">{msg}</p>}
                  <Button type="submit" className="w-full" loading={loading}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
