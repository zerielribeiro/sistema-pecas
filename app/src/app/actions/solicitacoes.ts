"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Técnico solicita uma peça do estoque geral
export async function solicitarPeca(
  pecaId: string,
  observacao?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Usuário não autenticado." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "TECNICO") {
    return { error: "Apenas técnicos podem solicitar peças." };
  }

  // Verifica se já existe solicitação pendente para esta peça por este técnico
  const { data: existente } = await supabase
    .from("solicitacoes_pecas")
    .select("id")
    .eq("peca_id", pecaId)
    .eq("tecnico_id", user.id)
    .eq("status", "PENDENTE")
    .single();

  if (existente) {
    return { error: "Você já possui uma solicitação pendente para esta peça." };
  }

  // Verifica se a peça está disponível
  const { data: peca } = await supabase
    .from("pecas")
    .select("status")
    .eq("id", pecaId)
    .single();

  if (!peca || peca.status !== "EM_ESTOQUE_EMPRESA") {
    return { error: "Esta peça não está disponível para solicitação." };
  }

  const { error } = await supabase.from("solicitacoes_pecas").insert({
    peca_id: pecaId,
    tecnico_id: user.id,
    observacao: observacao || null,
    status: "PENDENTE",
  });

  if (error) return { error: error.message };

  revalidatePath("/tecnico/solicitar");
  revalidatePath("/gestor/dashboard");
  return {};
}

// Gestor aprova a solicitação (RPC atômica)
export async function aprovarSolicitacao(
  solicitacaoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Usuário não autenticado." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "GESTOR") {
    return { error: "Apenas gestores podem aprovar solicitações." };
  }

  const { error } = await supabase.rpc("aprovar_solicitacao", {
    p_solicitacao_id: solicitacaoId,
    p_gestor_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/gestor/dashboard");
  revalidatePath("/gestor/pecas");
  revalidatePath("/gestor/distribuir");
  revalidatePath("/tecnico/estoque");
  revalidatePath("/tecnico/solicitar");
  return {};
}

// Gestor cancela a solicitação
export async function cancelarSolicitacao(
  solicitacaoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Usuário não autenticado." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "GESTOR") {
    return { error: "Apenas gestores podem cancelar solicitações." };
  }

  const { error } = await supabase
    .from("solicitacoes_pecas")
    .update({ status: "CANCELADA", gestor_id: user.id, atualizado_em: new Date().toISOString() })
    .eq("id", solicitacaoId)
    .eq("status", "PENDENTE");

  if (error) return { error: error.message };

  revalidatePath("/gestor/dashboard");
  revalidatePath("/tecnico/solicitar");
  return {};
}

// Busca peças disponíveis no estoque geral (para o técnico)
export async function getPecasEstoqueGeral() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pecas")
    .select("id, cod_produto, descricao, pca, criado_em")
    .eq("status", "EM_ESTOQUE_EMPRESA")
    .order("cod_produto");

  if (error) return { error: error.message };
  return { data };
}

// Busca solicitações pendentes (para o gestor)
export async function getSolicitacoesPendentes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("solicitacoes_pecas")
    .select(`
      id,
      status,
      observacao,
      criado_em,
      pecas (id, cod_produto, descricao, pca),
      tecnico:perfis!solicitacoes_pecas_tecnico_id_fkey (id, nome)
    `)
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: true });

  if (error) return { error: error.message };
  return { data };
}
