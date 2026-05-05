import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Using service role to bypass RLS for debugging

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const { data, error } = await supabase
    .from("pecas")
    .select(`
      id, cod_produto, descricao, pca, status,
      perfis:tecnico_atual_id ( nome )
    `)
    .in("status", ["DOA", "UTILIZADA", "AGUARDANDO_ENVIO", "ENVIADA_LAB"])
    .order("atualizado_em", { ascending: false });

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Data:', JSON.stringify(data, null, 2))
}

testQuery()
