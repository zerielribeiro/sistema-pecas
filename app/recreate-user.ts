import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createGestor() {
  const email = "gestor@empresa.com";
  const password = "123456";

  console.log(`Creating user ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { nome: "Gestor" }
  });

  if (error) {
    console.error("Error creating user:", error.message);
    return;
  }

  const userId = data.user.id;
  console.log("User created successfully with ID:", userId);

  console.log("Inserting profile into public.perfis...");
  const { error: profileError } = await supabase
    .from("perfis")
    .insert({
      id: userId,
      nome: "Gestor",
      email: email,
      papel: "GESTOR",
      ativo: true
    });

  if (profileError) {
    console.error("Error creating profile:", profileError.message);
  } else {
    console.log("Profile created successfully!");
  }
}

createGestor();
