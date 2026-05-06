import { createClient } from "@/lib/supabase/server";
import { LaboratorioClient } from "./laboratorio-client";

export const metadata = {
  title: 'Laboratório | GestorRB',
};

export default async function LaboratorioPage() {
  const supabase = await createClient();

  const { data: pecas } = await supabase
    .from("pecas")
    .select(`
      id, cod_produto, descricao, pca, status,
      tecnico:tecnico_atual_id ( nome )
    `)
    .in("status", ["DOA", "UTILIZADA", "AGUARDANDO_ENVIO", "ENVIADA_LAB", "DEVOLVIDA_NOVA"])
    .order("atualizado_em", { ascending: false });

  return (
    <div className="p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-red-500">Peças DOA e RMA</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie o fluxo de peças defeituosas identificadas pelos técnicos.
        </p>
      </div>

      <LaboratorioClient pecas={pecas || []} />
    </div>
  );
}
