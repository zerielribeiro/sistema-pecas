import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TecnicoShell } from "./tecnico-shell";

export default async function TecnicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.papel !== "TECNICO") {
    redirect("/gestor/dashboard");
  }

  return <TecnicoShell userName={perfil.nome} userEmail={user.email}>{children}</TecnicoShell>;
}
