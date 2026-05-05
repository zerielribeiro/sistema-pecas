"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarDoaPeca(
  pecaIds: string[],
  motivo: string,
  fotoUrls: string[]
) {
  const supabase = await createClient();

  // 1. Get current user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: "Usuário não autenticado." };
  }
  
  const tecnicoId = authData.user.id;
  const fotosJoined = fotoUrls.join(",");

  // 2. Call the RPC to register the DOA for each part
  for (const pecaId of pecaIds) {
    const { error: rpcError } = await supabase.rpc("registrar_doa", {
      p_peca_id: pecaId,
      p_tecnico_id: tecnicoId,
      p_motivo: motivo,
      p_foto_url: fotosJoined,
    });

    if (rpcError) {
      console.error("Erro no RPC registrar_doa para a peça", pecaId, ":", rpcError);
      return { error: `Erro ao registrar DOA para a peça ${pecaId}: ` + rpcError.message };
    }
  }

  revalidatePath("/tecnico/estoque");
  revalidatePath("/tecnico/doa");
  return { success: true };
}
