"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type AuthResult = {
  supabase: SupabaseClient;
  user: User;
};

type RoleResult = AuthResult & {
  papel: string;
};

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  return { supabase, user };
}

export async function requireGestor(): Promise<RoleResult> {
  const { supabase, user } = await requireAuth();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "GESTOR") {
    throw new Error("Sem permissão. Apenas gestores podem realizar esta ação.");
  }

  return { supabase, user, papel: perfil.papel };
}

export async function requireTecnico(): Promise<RoleResult> {
  const { supabase, user } = await requireAuth();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "TECNICO") {
    throw new Error("Sem permissão. Apenas técnicos podem realizar esta ação.");
  }

  return { supabase, user, papel: perfil.papel };
}
