import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata = {
  title: 'Histórico e Relatórios | GestorRB',
};

const tipoColors: Record<string, string> = {
  DISTRIBUICAO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  TRANSFERENCIA: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  BAIXA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  DOA: "bg-red-500/15 text-red-400 border-red-500/30",
  ENVIO_LAB: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  FINALIZACAO: "bg-stone-500/15 text-stone-400 border-stone-500/30",
  DEVOLUCAO: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
};

interface Perfil {
  nome: string;
}

interface Peca {
  cod_produto: string;
  descricao: string | null;
  pca: string;
}

interface Movimentacao {
  id: string;
  tipo: string;
  criado_em: string;
  observacao: string | null;
  status_anterior: string;
  status_novo: string;
  pecas: Peca | null;
  usuario: Perfil | null;
  origem: Perfil | null;
  destino: Perfil | null;
}

export default async function HistoricoPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("movimentacoes")
    .select(`
      id, tipo, criado_em, observacao, status_anterior, status_novo,
      pecas ( cod_produto, descricao, pca ),
      usuario:usuario_id ( nome ),
      origem:origem_id ( nome ),
      destino:destino_id ( nome )
    `)
    .order("criado_em", { ascending: false })
    .limit(100);

  const movimentacoes = (data || []) as unknown as Movimentacao[];

  return (
    <div className="p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-primary">Histórico</h2>
        <p className="text-sm text-muted-foreground">
          Últimas movimentações e ações realizadas no sistema.
        </p>
      </div>

      <div className="relative border-l border-border/50 ml-3 md:ml-4 space-y-8 pb-4">
        {movimentacoes.map((mov) => {
          // Determine the description based on the type
          let description = "";
          const pecaLabel = mov.pecas ? `${mov.pecas.cod_produto} (${mov.pecas.pca})` : "Peça desconhecida";
          
          switch (mov.tipo) {
            case "DISTRIBUICAO":
              description = `O gestor enviou a peça ${pecaLabel} para ${mov.destino?.nome || 'um técnico'}.`;
              break;
            case "TRANSFERENCIA":
              description = `A peça ${pecaLabel} foi transferida de ${mov.origem?.nome || 'origem'} para ${mov.destino?.nome || 'destino'}.`;
              break;
            case "BAIXA":
              description = `O técnico ${mov.usuario?.nome || 'desconhecido'} deu baixa na peça ${pecaLabel} (Atendimento).`;
              break;
            case "DOA":
              description = `O técnico ${mov.usuario?.nome || 'desconhecido'} marcou a peça ${pecaLabel} como DOA.`;
              break;
            case "DEVOLUCAO":
              description = `A peça ${pecaLabel} foi devolvida ao estoque da empresa.`;
              break;
            case "ENVIO_LAB":
              description = `A peça ${pecaLabel} foi enviada para o laboratório externo.`;
              break;
            case "FINALIZACAO":
              description = `A peça ${pecaLabel} teve seu ciclo de laboratório finalizado.`;
              break;
            default:
              description = `Ação ${mov.tipo} registrada para a peça ${pecaLabel}.`;
          }

          return (
            <div key={mov.id} className="relative pl-6 sm:pl-8">
              <span className="absolute -left-[5px] top-1.5 flex h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
              
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                <Badge variant="outline" className={`w-fit text-[10px] uppercase font-mono ${tipoColors[mov.tipo] || ''}`}>
                  {mov.tipo}
                </Badge>
                <time className="text-xs text-muted-foreground font-mono">
                  {format(new Date(mov.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </time>
              </div>
              
              <p className="text-sm text-foreground/90 mt-1.5">{description}</p>
              
              {mov.observacao && (
                <p className="mt-2 text-xs italic text-muted-foreground bg-muted/30 p-2 rounded border border-border/30">
                  &quot;{mov.observacao}&quot;
                </p>
              )}
              
              <div className="mt-3 flex gap-2">
                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                  {mov.status_anterior} ➔ {mov.status_novo}
                </Badge>
              </div>
            </div>
          );
        })}

        {(!movimentacoes || movimentacoes.length === 0) && (
          <div className="pl-6 text-sm text-muted-foreground">
            Nenhuma movimentação registrada no sistema ainda.
          </div>
        )}
      </div>
    </div>
  );
}
