"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, UserCog, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { criarTecnico, alternarStatusTecnico } from "@/app/actions/usuarios";

interface Tecnico {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: string;
}

export function UsuariosClient({ tecnicos }: { tecnicos: Tecnico[] }) {
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const result = await criarTecnico(nome, email, senha);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Técnico cadastrado com sucesso!");
        setIsOpen(false);
        setNome("");
        setEmail("");
        setSenha("");
        router.refresh();
      }
    } catch {
      toast.error("Erro inesperado ao criar técnico.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const result = await alternarStatusTecnico(id, !currentStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Técnico ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`);
        router.refresh();
      }
    } catch {
      toast.error("Erro ao alterar status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Técnicos Cadastrados</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button size="sm" className="h-9" />}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Técnico
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Cadastrar Técnico</DialogTitle>
                <DialogDescription>
                  Crie uma nova conta de acesso para um técnico de campo.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input 
                    id="nome" 
                    placeholder="João da Silva" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Corporativo</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="joao@empresa.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha Provisória</Label>
                  <Input 
                    id="senha" 
                    type="text"
                    placeholder="Min 6 caracteres" 
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    O técnico poderá alterar a senha após o primeiro acesso.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Cadastro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tecnicos.map((tecnico) => (
          <Card key={tecnico.id} className={`border-border/50 bg-card/80 transition-colors ${!tecnico.ativo ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-primary/70" />
                    <p className="font-semibold text-sm leading-none">{tecnico.nome}</p>
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{tecnico.email}</p>
                  <div className="pt-2">
                    <Badge variant={tecnico.ativo ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                      {tecnico.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Label htmlFor={`status-${tecnico.id}`} className="sr-only">
                    Status do Técnico
                  </Label>
                  <Switch
                    id={`status-${tecnico.id}`}
                    checked={tecnico.ativo}
                    onCheckedChange={() => handleToggleStatus(tecnico.id, tecnico.ativo)}
                    title={tecnico.ativo ? "Desativar técnico" : "Ativar técnico"}
                  />
                  {!tecnico.ativo && <UserX className="w-4 h-4 text-muted-foreground mt-2" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tecnicos.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground border border-border/50 rounded-lg bg-card/50">
            Nenhum técnico cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
