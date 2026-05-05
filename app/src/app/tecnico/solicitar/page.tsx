import { createClient } from "@/lib/supabase/server";
import { SolicitarPecaClient } from "./solicitar-client";

export default async function SolicitarPecaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Peças disponíveis no estoque geral
  const { data: pecas } = await supabase
    .from("pecas")
    .select("id, cod_produto, descricao, pca, criado_em")
    .eq("status", "EM_ESTOQUE_EMPRESA")
    .order("cod_produto");

  // Solicitações pendentes deste técnico (para evitar duplicatas)
  const { data: minhasSolicitacoes } = await supabase
    .from("solicitacoes_pecas")
    .select("id, status, peca_id, criado_em")
    .eq("tecnico_id", user!.id)
    .eq("status", "PENDENTE");

  return (
    <SolicitarPecaClient
      pecas={pecas ?? []}
      solicitacoesPendentes={minhasSolicitacoes ?? []}
    />
  );
}
