"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function criarTecnico(
  nome: string,
  email: string,
  senhaProvisoria: string
) {
  const supabase = await createClient();
  
  // 1. Verify if the caller is a GESTOR
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: perfilGestor } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", authData.user.id)
    .single();

  if (perfilGestor?.papel !== "GESTOR") {
    return { error: "Permissão negada. Apenas gestores podem criar usuários." };
  }

  const adminClient = createAdminClient();

  // 2. Create the user in Auth
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

  // 3. Create the profile in 'perfis'
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
    // If it fails here, the auth user is orphaned. In a production system, we'd delete the auth user to rollback.
    await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
    return { error: "Erro ao criar perfil. O cadastro foi desfeito." };
  }

  revalidatePath("/gestor/usuarios");
  return { success: true };
}

export async function alternarStatusTecnico(tecnicoId: string, novoStatus: boolean) {
  const supabase = await createClient();
  
  // Verify permissions
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: perfilGestor } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", authData.user.id)
    .single();

  if (perfilGestor?.papel !== "GESTOR") {
    return { error: "Permissão negada." };
  }

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
}
