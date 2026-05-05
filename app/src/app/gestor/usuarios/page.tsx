import { createClient } from "@/lib/supabase/server";
import { UsuariosClient } from "./usuarios-client";

export const metadata = {
  title: 'Gestão de Usuários | GestorRB',
};

export default async function UsuariosPage() {
  const supabase = await createClient();

  // Fetch all technicians
  const { data: tecnicos } = await supabase
    .from("perfis")
    .select("id, nome, email, ativo, criado_em")
    .eq("papel", "TECNICO")
    .order("nome");

  return (
    <div className="pb-24 space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-primary">Gestão de Usuários</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie o acesso dos técnicos de campo à plataforma.
        </p>
      </div>

      <UsuariosClient tecnicos={tecnicos || []} />
    </div>
  );
}
