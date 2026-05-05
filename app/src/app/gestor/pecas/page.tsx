import { createClient } from "@/lib/supabase/server";
import { PecasClient } from "./pecas-client";

export default async function PecasPage() {
  const supabase = await createClient();

  // Fetch all parts with their assigned technician info
  const { data: pecas } = await supabase
    .from("pecas")
    .select(`
      id, cod_produto, descricao, pca, status, atualizado_em, tecnico_atual_id,
      tecnico:tecnico_atual_id(nome)
    `)
    .order("atualizado_em", { ascending: false });

  // Fetch all active technicians for potential reassignment
  const { data: tecnicos } = await supabase
    .from("perfis")
    .select("id, nome")
    .eq("papel", "TECNICO")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="pb-24">
      <PecasClient pecas={pecas || []} tecnicos={tecnicos || []} />
    </div>
  );
}
