"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function registrarAtendimentoEBaixa(
  pecaIds: string[],
  numeroChamado: string,
  localAtendimento: string,
  descricao: string,
  fotoUrls: string[],
  isPecaNova: boolean = false
) {
  try {
    const { supabase, user } = await requireAuth();

    if (isPecaNova) {
      // Devolução de peça nova não requer registro de atendimento
      for (const pecaId of pecaIds) {
        const { error: rpcError } = await supabase.rpc("devolver_peca_nova", {
          p_peca_id: pecaId,
          p_usuario_id: user.id,
        });

        if (rpcError) {
          console.error("Erro no RPC devolver_peca_nova para a peça", pecaId, ":", rpcError);
          return { error: `Erro ao devolver peça nova ${pecaId}: ` + rpcError.message };
        }
      }
    } else {
      // Create the Atendimento record first
      const { data: atendimento, error: atendimentoError } = await supabase
        .from("atendimentos")
        .insert({
          tecnico_id: user.id,
          numero_chamado: numeroChamado,
          local_atendimento: localAtendimento,
          descricao: descricao,
          data_atendimento: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (atendimentoError || !atendimento) {
        console.error("Erro ao criar atendimento:", atendimentoError);
        return { error: "Erro ao registrar os dados do chamado." };
      }

      const fotosJoined = fotoUrls.join(",");

      // Call the RPC to register the usage of each part
      for (const pecaId of pecaIds) {
        const { error: rpcError } = await supabase.rpc("registrar_baixa", {
          p_peca_id: pecaId,
          p_atendimento_id: atendimento.id,
          p_foto_url: fotosJoined,
          p_usuario_id: user.id,
        });

        if (rpcError) {
          console.error("Erro no RPC registrar_baixa para a peça", pecaId, ":", rpcError);
          return { error: `Erro ao dar baixa na peça ${pecaId}: ` + rpcError.message };
        }
      }
    }

    revalidatePath("/tecnico/estoque");
    revalidatePath("/tecnico/atendimento");
    revalidatePath("/gestor/laboratorio"); // Revalidar lab para o gestor ver a nova devolução
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
