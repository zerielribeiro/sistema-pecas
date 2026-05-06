"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireGestor } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function criarTecnico(
  nome: string,
  email: string,
  senhaProvisoria: string
) {
  try {
    await requireGestor();
    const adminClient = createAdminClient();

    // Create the user in Auth
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: senhaProvisoria,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (authError || !newAuthUser.user) {
      console.error("Erro Auth createUser:", authError);
      return { error: "Erro ao criar usuário: " + (authError?.message || "Desconhecido") };
    }

    // Create the profile in 'perfis'
    const { error: perfilError } = await adminClient
      .from("perfis")
      .insert({
        id: newAuthUser.user.id,
        nome,
        email,
        papel: "TECNICO",
        ativo: true
      });

    if (perfilError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
      return { error: "Erro ao criar perfil. O cadastro foi desfeito." };
    }

    revalidatePath("/gestor/usuarios");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function alternarStatusTecnico(tecnicoId: string, novoStatus: boolean) {
  try {
    await requireGestor();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("perfis")
      .update({ ativo: novoStatus })
      .eq("id", tecnicoId)
      .eq("papel", "TECNICO");

    if (error) {
      return { error: "Erro ao atualizar status do técnico." };
    }

    revalidatePath("/gestor/usuarios");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
