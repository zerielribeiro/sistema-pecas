"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarAtendimentoEBaixa(
  pecaIds: string[],
  numeroChamado: string,
  localAtendimento: string,
  descricao: string,
  fotoUrls: string[]
) {
  const supabase = await createClient();

  // 1. Get current user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: "Usuário não autenticado." };
  }
  
  const usuarioId = authData.user.id;

  // 2. Create the Atendimento record first
  const { data: atendimento, error: atendimentoError } = await supabase
    .from("atendimentos")
    .insert({
      tecnico_id: usuarioId,
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

  // Join photos separated by comma to store in the text column
  const fotosJoined = fotoUrls.join(",");

  // 3. Call the RPC to register the usage of each part
  for (const pecaId of pecaIds) {
    const { error: rpcError } = await supabase.rpc("registrar_baixa", {
      p_peca_id: pecaId,
      p_atendimento_id: atendimento.id,
      p_foto_url: fotosJoined,
      p_usuario_id: usuarioId,
    });

    if (rpcError) {
      console.error("Erro no RPC registrar_baixa para a peça", pecaId, ":", rpcError);
      return { error: `Erro ao dar baixa na peça ${pecaId}: ` + rpcError.message };
    }
  }

  revalidatePath("/tecnico/estoque");
  revalidatePath("/tecnico/atendimento");
  return { success: true };
}
