"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireGestor } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function distribuirPecas(
  pecaIds: string[],
  tecnicoId: string
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireGestor();

    if (pecaIds.length === 0) return { error: "Nenhuma peça selecionada." };
    if (!tecnicoId) return { error: "Nenhum técnico selecionado." };

    const { error } = await supabase.rpc("distribuir_pecas_lote", {
      p_peca_ids: pecaIds,
      p_tecnico_id: tecnicoId,
      p_gestor_id: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/gestor/distribuir");
    revalidatePath("/gestor/pecas");
    revalidatePath("/gestor/dashboard");
    revalidatePath("/tecnico/estoque");
    revalidatePath("/tecnico/atendimento");
    revalidatePath("/tecnico/doa");

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function remanejarPeca(
  pecaId: string,
  destino: "ESTOQUE" | string
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireGestor();

    // Fetch current part state
    const { data: peca, error: pecaError } = await supabase
      .from("pecas")
      .select("status, tecnico_atual_id")
      .eq("id", pecaId)
      .single();

    if (pecaError || !peca) return { error: "Peça não encontrada." };
    if (peca.status !== "DISTRIBUIDA") {
      return { error: "Apenas peças distribuídas podem ser remanejadas." };
    }

    const isDevolucao = destino === "ESTOQUE";
    const novoStatus = isDevolucao ? "EM_ESTOQUE_EMPRESA" : "DISTRIBUIDA";
    const novoTecnicoId = isDevolucao ? null : destino;
    const tipoMovimentacao = isDevolucao ? "DEVOLUCAO" : "TRANSFERENCIA";

    // Update piece
    const { error: updateError } = await supabase
      .from("pecas")
      .update({
        status: novoStatus,
        tecnico_atual_id: novoTecnicoId,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", pecaId);

    if (updateError) return { error: updateError.message };

    // Record movement
    const { error: movError } = await supabase.from("movimentacoes").insert({
      peca_id: pecaId,
      tipo: tipoMovimentacao,
      status_anterior: peca.status,
      status_novo: novoStatus,
      origem_id: peca.tecnico_atual_id,
      destino_id: novoTecnicoId,
      usuario_id: user.id,
      observacao: "Remanejamento realizado pelo gestor",
    });

    if (movError) return { error: movError.message };

    revalidatePath("/gestor/pecas");
    revalidatePath("/gestor/dashboard");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function cadastrarPeca(data: {
  cod_produto: string;
  descricao?: string;
  pca?: string;
  data_entrada?: string;
  bem_de_consumo?: boolean;
}) {
  try {
    const { supabase } = await requireAuth();

    // Auto-generate PCA for consumables if not provided
    let finalPca = data.pca?.toUpperCase().trim();
    if (data.bem_de_consumo && (!finalPca || finalPca === "")) {
      finalPca = `CONS-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    }

    if (!finalPca) {
      return { error: "PCA é obrigatório para peças não consumíveis." };
    }

    const insertData: Record<string, unknown> = {
      cod_produto: data.cod_produto,
      descricao: data.descricao || null,
      pca: finalPca,
      status: "EM_ESTOQUE_EMPRESA",
      bem_de_consumo: data.bem_de_consumo || false,
    };

    if (data.data_entrada) {
      insertData.criado_em = data.data_entrada;
    }

    const { error } = await supabase.from("pecas").insert(insertData);

    if (error) {
      if (error.code === "23505") return { error: "Este PCA já está cadastrado." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function cadastrarModelo(data: {
  cod_produto: string;
  descricao?: string;
}) {
  try {
    const { supabase } = await requireAuth();

    const { error } = await supabase.from("catalogo_pecas").insert({
      cod_produto: data.cod_produto.toUpperCase().trim(),
      descricao: data.descricao?.toUpperCase().trim() || null,
    });

    if (error) {
      if (error.code === "23505") return { error: "Este código de produto já está cadastrado no catálogo." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function importarModelosLote(modelos: { cod_produto: string; descricao?: string }[]) {
  try {
    const { supabase } = await requireAuth();

    const modelosToInsert = modelos.map(m => ({
      cod_produto: m.cod_produto.toUpperCase().trim(),
      descricao: m.descricao?.toUpperCase().trim() || null,
    }));

    const { error } = await supabase.from("catalogo_pecas").insert(modelosToInsert);

    if (error) {
      if (error.code === "23505") return { error: "Erro de duplicidade: Um ou mais códigos de produto já existem no catálogo." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function getCatalogo() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogo_pecas")
    .select("*")
    .order("cod_produto");

  if (error) return { error: error.message };
  return { data };
}

export async function importarPecasLote(pecas: { cod_produto: string; descricao?: string; pca: string }[]) {
  try {
    const { supabase } = await requireAuth();

    const pecasToInsert = pecas.map(p => ({
      cod_produto: p.cod_produto,
      descricao: p.descricao || null,
      pca: p.pca.toUpperCase().trim(),
      status: "EM_ESTOQUE_EMPRESA"
    }));

    const { error } = await supabase.from("pecas").insert(pecasToInsert);

    if (error) {
      if (error.code === "23505") return { error: "Erro de duplicidade: Um ou mais PCAs já existem no sistema." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function editarPeca(id: string, data: {
  cod_produto: string;
  descricao?: string;
  pca: string;
}) {
  try {
    const { supabase } = await requireAuth();

    const { error } = await supabase
      .from("pecas")
      .update({
        cod_produto: data.cod_produto,
        descricao: data.descricao || null,
        pca: data.pca.toUpperCase().trim(),
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") return { error: "Este PCA já está em uso por outra peça." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function excluirPeca(id: string) {
  try {
    const { supabase } = await requireAuth();

    // Note: Database triggers or CASCADE should handle related records if any.
    const { error } = await supabase
      .from("pecas")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "23503") return { error: "Não é possível excluir esta peça pois ela possui histórico de movimentações." };
      return { error: error.message };
    }

    revalidatePath("/gestor/pecas");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
