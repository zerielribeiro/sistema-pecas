"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Rate limiting config
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

async function getClientIP(): Promise<string> {
  const headersList = await headers();
  // Trust the first IP in x-forwarded-for (set by reverse proxy/Vercel)
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headersList.get("x-real-ip") || "unknown";
}

type LoginState = {
  error?: string;
  remainingAttempts?: number;
} | null;

type ProfileState = {
  error?: string;
  success?: boolean;
  message?: string;
  user?: {
    nome: string;
    email: string;
  };
} | null;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios" };
  }

  const ip = getClientIP();
  const admin = createAdminClient();

  // 1. Check rate limit before attempting login
  const { data: rateCheck, error: rateError } = await admin.rpc(
    "check_login_rate_limit",
    {
      p_ip: ip,
      p_window_minutes: WINDOW_MINUTES,
      p_max_attempts: MAX_ATTEMPTS,
      p_lockout_minutes: LOCKOUT_MINUTES,
    }
  );

  if (rateError) {
    // Fail open with a warning — don't block users due to infra issues
    console.error("[rate-limit] RPC error:", rateError.message);
  } else if (rateCheck?.blocked) {
    const lockedUntil = new Date(rateCheck.locked_until);
    const minutesLeft = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
    );
    return {
      error: `Muitas tentativas falhas. Tente novamente em ${minutesLeft} minuto(s).`,
    };
  }

  // 2. Attempt Supabase authentication
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    // 3a. Record failed attempt in DB
    await admin.rpc("record_login_attempt", {
      p_ip: ip,
      p_success: false,
    });

    // Count current failures to give contextual feedback
    const currentAttempts = (rateCheck?.attempts ?? 0) + 1;
    const remaining = MAX_ATTEMPTS - currentAttempts;

    if (currentAttempts >= MAX_ATTEMPTS) {
      return {
        error: `Conta bloqueada por ${LOCKOUT_MINUTES} minutos devido a muitas tentativas falhas.`,
      };
    }

    return {
      error: `Email ou senha incorretos. Você tem ${remaining} tentativa(s) restante(s).`,
      remainingAttempts: remaining,
    };
  }

  // 3b. Record successful login (resets context for future auditing)
  await admin.rpc("record_login_attempt", {
    p_ip: ip,
    p_success: true,
  });

  // 4. Fetch user profile and redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Erro ao autenticar" };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (!perfil) {
    return { error: "Perfil não encontrado" };
  }

  if (perfil.papel === "GESTOR") {
    redirect("/gestor/dashboard");
  } else {
    redirect("/tecnico/estoque");
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const supabase = await createClient();

  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "As senhas não coincidem" };
  }

  if (newPassword.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: "Erro ao alterar senha: " + error.message };
  }

  return { success: true };
}

export async function updateProfileAction(prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { error: "Não autenticado." };
  }

  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!nome || !email) {
    return { error: "Nome e email são obrigatórios." };
  }

  // Se o usuário preencheu a nova senha, valida e atualiza
  if (newPassword || confirmPassword) {
    if (newPassword !== confirmPassword) {
      return { error: "As senhas não coincidem." };
    }
    if (newPassword.length < 6) {
      return { error: "A senha deve ter pelo menos 6 caracteres." };
    }
    
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (passwordError) {
      return { error: "Erro ao atualizar senha: " + passwordError.message };
    }
  }

  // Atualiza o email (auth) - Utiliza adminClient para contornar a necessidade de confirmação de email
  if (email !== authData.user.email) {
    const admin = createAdminClient();
    const { error: emailError } = await admin.auth.admin.updateUserById(
      authData.user.id,
      { email: email, email_confirm: true }
    );
    
    if (emailError) {
      return { error: "Erro ao atualizar email: " + emailError.message };
    }
  }

  // Atualiza o nome (tabela perfis)
  const { error: perfilError } = await supabase
    .from("perfis")
    .update({ nome })
    .eq("id", authData.user.id);

  if (perfilError) {
    return { error: "Erro ao atualizar nome no perfil." };
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Perfil atualizado com sucesso.", user: { nome, email } };
}
