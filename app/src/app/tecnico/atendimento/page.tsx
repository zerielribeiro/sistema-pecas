import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AtendimentoClient } from "./atendimento-client";

export const metadata = {
  title: 'Novo Atendimento | GestorRB',
};

export default async function AtendimentoPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  // Fetch parts assigned to this technician that are available to be used (DISTRIBUIDA)
  const { data: pecas } = await supabase
    .from("pecas")
    .select("id, cod_produto, descricao, pca")
    .eq("tecnico_atual_id", authData.user.id)
    .eq("status", "DISTRIBUIDA")
    .order("cod_produto");

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Novo Atendimento</h2>
        <p className="text-sm text-muted-foreground">
          Registre a utilização de uma peça em campo com evidências.
        </p>
      </div>

      <AtendimentoClient pecas={pecas || []} />
    </div>
  );
}
