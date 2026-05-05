import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GestorShell } from "./gestor-shell";

export default async function GestorLayout({
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

  if (!perfil || perfil.papel !== "GESTOR") {
    redirect("/tecnico/estoque");
  }

  return <GestorShell userName={perfil.nome} userEmail={user.email}>{children}</GestorShell>;
}
