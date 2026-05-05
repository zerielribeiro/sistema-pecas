import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DoaClient } from "./doa-client";

export const metadata = {
  title: 'Registro de DOA | GestorRB',
};

export default async function DoaPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  // Fetch parts assigned to this technician that are available to be used (DISTRIBUIDA)
  // Because only parts in possession can be marked as DOA
  const { data: pecas } = await supabase
    .from("pecas")
    .select("id, cod_produto, descricao, pca")
    .eq("tecnico_atual_id", authData.user.id)
    .eq("status", "DISTRIBUIDA")
    .order("cod_produto");

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-500">Registro de DOA</h2>
        <p className="text-sm text-muted-foreground">
          Marque uma peça como defeituosa (Dead On Arrival) diretamente da caixa.
        </p>
      </div>

      <DoaClient pecas={pecas || []} />
    </div>
  );
}
