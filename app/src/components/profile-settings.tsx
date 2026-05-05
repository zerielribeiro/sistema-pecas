"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, Mail, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsProps {
  userName: string;
  userEmail?: string;
  children: React.ReactElement;
  onProfileUpdate?: (newName: string, newEmail: string) => void;
}

export function ProfileSettings({ userName, userEmail = "", children, onProfileUpdate }: ProfileSettingsProps) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(updateProfileAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      setOpen(false);
      if (onProfileUpdate && state.user) {
        onProfileUpdate(state.user.nome, state.user.email);
      }
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações do Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais e senha.
          </DialogDescription>
        </DialogHeader>
        <form action={action} key={`${userName}-${userEmail}`} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="nome"
                name="nome"
                defaultValue={userName}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={userEmail}
                className="pl-9"
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Aviso: Alterar o email pode requerer confirmação caso configurado.
            </p>
          </div>

          <div className="pt-4 space-y-4 border-t">
            <h4 className="text-sm font-medium">Alterar Senha</h4>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha (Opcional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Deixe em branco para não alterar"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirme a nova senha"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
