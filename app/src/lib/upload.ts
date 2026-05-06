import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadToStorage(
  supabase: SupabaseClient,
  file: File,
  folder: string
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("evidencias")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("evidencias")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
