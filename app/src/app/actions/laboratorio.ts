"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function marcarEnvioLab(pecaIds: string[]) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase.rpc("marcar_envio_lab", {
      p_peca_ids: pecaIds,
      p_gestor_id: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/gestor/laboratorio");
    revalidatePath("/gestor/dashboard");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function confirmarEnvioLab(pecaIds: string[]) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase.rpc("confirmar_envio_lab", {
      p_peca_ids: pecaIds,
      p_gestor_id: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/gestor/laboratorio");
    revalidatePath("/gestor/dashboard");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function finalizarPecas(pecaIds: string[], observacao: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase.rpc("finalizar_pecas", {
      p_peca_ids: pecaIds,
      p_gestor_id: user.id,
      p_observacao: observacao || null,
    });

    if (error) return { error: error.message };

    revalidatePath("/gestor/laboratorio");
    revalidatePath("/gestor/dashboard");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
