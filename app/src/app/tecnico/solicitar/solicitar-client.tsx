"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { solicitarPeca } from "@/app/actions/solicitacoes";
import { trimLeadingZeros } from "@/lib/utils";
import type { PecaSolicitacao } from "@/types/peca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Package,
  Search,
  Loader2,
  ClipboardList,
} from "lucide-react";

type Solicitacao = {
  id: string;
  status: string;
  peca_id: string;
  criado_em: string;
};

interface SolicitarPecaClientProps {
  pecas: PecaSolicitacao[];
  solicitacoesPendentes: Solicitacao[];
}

export function SolicitarPecaClient({
  pecas,
  solicitacoesPendentes,
}: SolicitarPecaClientProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const jasSolicitadas = new Set(solicitacoesPendentes.map((s) => s.peca_id));

  const filtered = pecas.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.cod_produto.toLowerCase().includes(q) ||
      (p.descricao ?? "").toLowerCase().includes(q) ||
      p.pca.toLowerCase().includes(q)
    );
  });

  const handleSolicitar = () => {
    if (!selected) return;

    startTransition(async () => {
      const result = await solicitarPeca(selected);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Solicitação enviada! Aguarde a aprovação do gestor.");
        setSelected(null);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Solicitar Peça
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pecas.length} peças disponíveis no estoque geral
          </p>
        </div>
        {solicitacoesPendentes.length > 0 && (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
            <ClipboardList className="w-3 h-3" />
            {solicitacoesPendentes.length} pendente
            {solicitacoesPendentes.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Search — now using shadcn Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por código, descrição ou PCA..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-4 py-2.5 rounded-xl border-border/60 bg-card/60"
        />
      </div>

      {/* Peças List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {query ? "Nenhuma peça encontrada" : "Estoque vazio"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {query ? "Tente outro termo de busca" : "Nenhuma peça disponível no estoque geral"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((peca) => {
            const isPendente = jasSolicitadas.has(peca.id);
            const isSelected = selected === peca.id;

            return (
              <Card
                key={peca.id}
                onClick={() => !isPendente && setSelected(isSelected ? null : peca.id)}
                className={[
                  "border transition-all cursor-pointer",
                  isPendente
                    ? "border-amber-500/30 bg-amber-500/5 cursor-not-allowed opacity-70"
                    : isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border/50 bg-card/80 hover:border-border hover:bg-card/90",
                ].join(" ")}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Selection indicator */}
                      <div
                        className={[
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          isPendente
                            ? "border-amber-500 bg-amber-500/20"
                            : isSelected
                            ? "border-primary bg-primary"
                            : "border-border",
                        ].join(" ")}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                        {isPendente && (
                          <ClipboardList className="w-2.5 h-2.5 text-amber-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {trimLeadingZeros(peca.cod_produto)}
                        </p>
                        {peca.descricao && (
                          <p className="text-xs text-muted-foreground truncate uppercase">
                            {peca.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        PCA: {trimLeadingZeros(peca.pca)}
                      </span>
                      {isPendente ? (
                        <Badge className="text-[9px] py-0 h-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Solicitada
                        </Badge>
                      ) : (
                        <Badge className="text-[9px] py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          Disponível
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Button */}
      {selected && (
        <div className="sticky bottom-4 pt-2">
          <Button
            onClick={handleSolicitar}
            disabled={isPending}
            className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando solicitação...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Solicitar Peça Selecionada
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
