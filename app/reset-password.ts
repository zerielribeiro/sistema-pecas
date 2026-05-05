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

async function resetPassword() {
  const email = "gestor@empresa.com";
  const password = "123456";

  console.log(`Resetting password for ${email}...`);

  const { data, error } = await supabase.auth.admin.updateUserById(
    "9b02d13f-ccc5-49df-9f31-1054ddb23df9",
    { password: password }
  );

  if (error) {
    console.error("Error resetting password:", error.message);
  } else {
    console.log("Password reset successfully for", data.user.email);
  }
}

resetPassword();
