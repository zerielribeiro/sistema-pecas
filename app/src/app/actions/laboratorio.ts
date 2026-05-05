"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function marcarEnvioLab(pecaIds: string[]) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Não autorizado" };
  }

  const { error } = await supabase.rpc("marcar_envio_lab", {
    p_peca_ids: pecaIds,
    p_gestor_id: userData.user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gestor/laboratorio");
  revalidatePath("/gestor/dashboard");
  return { success: true };
}

export async function confirmarEnvioLab(pecaIds: string[]) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Não autorizado" };
  }

  const { error } = await supabase.rpc("confirmar_envio_lab", {
    p_peca_ids: pecaIds,
    p_gestor_id: userData.user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gestor/laboratorio");
  revalidatePath("/gestor/dashboard");
  return { success: true };
}

export async function finalizarPecas(pecaIds: string[], observacao: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Não autorizado" };
  }

  const { error } = await supabase.rpc("finalizar_pecas", {
    p_peca_ids: pecaIds,
    p_gestor_id: userData.user.id,
    p_observacao: observacao || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gestor/laboratorio");
  revalidatePath("/gestor/dashboard");
  return { success: true };
}
