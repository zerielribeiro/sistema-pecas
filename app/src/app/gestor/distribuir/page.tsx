import { createClient } from "@/lib/supabase/server";
import { DistribuirClient } from "./distribuir-client";

export default async function DistribuirPage() {
  const supabase = await createClient();

  const { data: pecas } = await supabase
    .from("pecas")
    .select("id, cod_produto, descricao, pca")
    .eq("status", "EM_ESTOQUE_EMPRESA")
    .order("atualizado_em", { ascending: false });

  const { data: tecnicos } = await supabase
    .from("perfis")
    .select("id, nome")
    .eq("papel", "TECNICO")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="p-4 sm:p-8 animate-in fade-in duration-700">

      <DistribuirClient pecas={pecas || []} tecnicos={tecnicos || []} />
    </div>
  );
}
