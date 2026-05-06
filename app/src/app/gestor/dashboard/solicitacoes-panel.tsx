"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { aprovarSolicitacao, cancelarSolicitacao } from "@/app/actions/solicitacoes";
import { trimLeadingZeros } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Package, User, Loader2, ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Solicitacao = {
  id: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  pecas: { id: string; cod_produto: string; descricao: string | null; pca: string } | null;
  tecnico: { id: string; nome: string } | null;
};

interface SolicitacoesPanelProps {
  solicitacoes: Solicitacao[];
}

export function SolicitacoesPanel({ solicitacoes: initial }: SolicitacoesPanelProps) {
  const [solicitacoes, setSolicitacoes] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAprovar = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      const result = await aprovarSolicitacao(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Solicitação aprovada com sucesso!");
        setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
      }
      setLoadingId(null);
    });
  };

  const handleCancelar = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      const result = await cancelarSolicitacao(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Solicitação cancelada.");
        setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
      }
      setLoadingId(null);
    });
  };

  if (solicitacoes.length === 0) {
    return (
      <div className="py-6 flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-border/40 rounded-2xl">
        <ShoppingCart className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
        <p className="text-xs font-medium text-muted-foreground">
          Nenhuma solicitação pendente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {solicitacoes.map((sol) => {
        const isLoading = loadingId === sol.id && isPending;
        return (
          <Card
            key={sol.id}
            className="border-amber-500/25 bg-amber-500/5 backdrop-blur-sm"
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-amber-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-bold truncate">
                      {trimLeadingZeros(sol.pecas?.cod_produto)} — {sol.pecas?.descricao || "—"}
                    </p>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(sol.criado_em), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {sol.tecnico?.nome}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/60">
                      · PCA: {trimLeadingZeros(sol.pecas?.pca)}
                    </span>
                  </div>
                  {sol.observacao && (
                    <p className="text-[10px] italic text-muted-foreground/70">
                      &quot;{sol.observacao}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2.5 ml-11">
                <Button
                  size="sm"
                  onClick={() => handleAprovar(sol.id)}
                  disabled={isLoading}
                  className="h-7 px-3 text-[11px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aprovar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelar(sol.id)}
                  disabled={isLoading}
                  className="h-7 px-3 text-[11px] font-bold rounded-lg border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancelar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
