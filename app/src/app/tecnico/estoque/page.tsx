import { createClient } from "@/lib/supabase/server";
import { trimLeadingZeros } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function EstoqueTecnicoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pecas } = await supabase
    .from("pecas")
    .select("*")
    .eq("tecnico_atual_id", user!.id)
    .eq("status", "DISTRIBUIDA")
    .order("atualizado_em", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto p-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meu Estoque</h2>
        <Badge variant="outline" className="font-mono text-xs">
          {pecas?.length || 0} peças
        </Badge>
      </div>

      {pecas && pecas.length > 0 ? (
        <div className="space-y-3">
          {pecas.map((peca) => (
            <Card key={peca.id} className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{trimLeadingZeros(peca.cod_produto)}</p>
                    {peca.descricao && (
                      <p className="text-xs text-muted-foreground uppercase">
                        {peca.descricao}
                      </p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground">
                      PCA: {trimLeadingZeros(peca.pca)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[peca.status] || ""}
                  >
                    {STATUS_LABELS[peca.status] || peca.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">
            Nenhuma peça distribuída para você
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Aguarde o gestor realizar a distribuição
          </p>
        </div>
      )}
    </div>
  );
}
