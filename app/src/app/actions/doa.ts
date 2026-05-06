"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function registrarDoaPeca(
  pecaIds: string[],
  motivo: string,
  fotoUrls: string[]
) {
  try {
    const { supabase, user } = await requireAuth();

    const fotosJoined = fotoUrls.join(",");

    for (const pecaId of pecaIds) {
      const { error: rpcError } = await supabase.rpc("registrar_doa", {
        p_peca_id: pecaId,
        p_tecnico_id: user.id,
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
