"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Users, Box, CheckCircle2, ChevronRight, Info, X } from "lucide-react";
import { distribuirPecas } from "@/app/actions/pecas";

interface Peca {
  id: string;
  cod_produto: string;
  descricao: string | null;
  pca: string;
}

interface Tecnico {
  id: string;
  nome: string;
}

export function DistribuirClient({
  pecas,
  tecnicos,
}: {
  pecas: Peca[];
  tecnicos: Tecnico[];
}) {
  const router = useRouter();
  const [selectedPecas, setSelectedPecas] = useState<Set<string>>(new Set());
  const [selectedTecnico, setSelectedTecnico] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePeca = (id: string) => {
    const next = new Set(selectedPecas);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPecas(next);
  };

  const selectAll = () => {
    if (selectedPecas.size === pecas.length) {
      setSelectedPecas(new Set());
    } else {
      setSelectedPecas(new Set(pecas.map((p) => p.id)));
    }
  };

  async function handleDistribuir() {
    if (selectedPecas.size === 0) {
      setError("Selecione ao menos uma peça.");
      return;
    }
    if (!selectedTecnico) {
      setError("Selecione um técnico de destino.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await distribuirPecas(Array.from(selectedPecas), selectedTecnico);
      
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`Distribuídas ${selectedPecas.size} peças com sucesso!`);
        setSelectedPecas(new Set());
        setSelectedTecnico("");
        router.refresh();
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500">
            <Box className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Console de Distribuição</span>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Peças Disponíveis no Inventário Central
            <Badge variant="secondary" className="rounded-none font-mono px-1.5 py-0 h-4 text-[10px] bg-zinc-800 text-zinc-400">
              {pecas.length}
            </Badge>
          </h3>
        </div>

        {pecas.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={selectAll} 
            className="h-8 text-[10px] uppercase tracking-wider font-bold rounded-none border-zinc-800 hover:bg-zinc-800 transition-all"
          >
            {selectedPecas.size === pecas.length ? "Desmarcar Tudo" : "Selecionar Tudo"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main List Area */}
        <div className="lg:col-span-8 space-y-4">
          {error && (
            <div className="rounded-none bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {pecas.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border border-dashed border-border/30 rounded-none bg-zinc-900/20">
              <p className="text-sm font-mono tracking-tight">INVENTÁRIO VAZIO_</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pecas.map((peca, index) => (
                <div
                  key={peca.id}
                  className={`group relative flex items-start gap-3 p-4 rounded-none border transition-all duration-200 cursor-pointer overflow-hidden ${
                    selectedPecas.has(peca.id)
                      ? "border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => togglePeca(peca.id)}
                >
                  {/* Selection Indicator Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                    selectedPecas.has(peca.id) ? "bg-amber-500" : "bg-transparent group-hover:bg-zinc-800"
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-mono font-bold text-[13px] text-zinc-100 tracking-tight leading-none">
                        {peca.cod_produto}
                      </p>
                      <Badge variant="outline" className="rounded-none font-mono text-[9px] px-1 py-0 border-zinc-700 text-zinc-500 bg-zinc-950">
                        {peca.pca}
                      </Badge>
                    </div>
                    {peca.descricao && (
                      <p className="text-[11px] text-zinc-400 mt-1 uppercase tracking-tight line-clamp-2 leading-relaxed">
                        {peca.descricao}
                      </p>
                    )}
                  </div>

                  <div className={`mt-0.5 transition-transform duration-200 ${selectedPecas.has(peca.id) ? 'scale-110' : 'scale-100 opacity-30 group-hover:opacity-100'}`}>
                    <div className={`w-4 h-4 border flex items-center justify-center ${
                      selectedPecas.has(peca.id) ? 'bg-amber-500 border-amber-500' : 'border-zinc-700'
                    }`}>
                      {selectedPecas.has(peca.id) && <CheckCircle2 className="w-3 h-3 text-black stroke-[3px]" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technician Selection - Sticky on Desktop */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 h-fit">
          <div className="bg-zinc-900/60 border border-zinc-800 p-6 space-y-6 rounded-none backdrop-blur-md">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Parametrizar Destino</span>
              </div>
              <Label className="text-[11px] font-medium text-zinc-500 mb-1 block uppercase tracking-tighter">
                Técnico Responsável
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger 
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between h-11 bg-zinc-950 border-zinc-800 rounded-none font-medium text-xs focus:ring-amber-500/20 hover:bg-zinc-900 transition-all"
                    >
                      <span className="truncate">
                        {selectedTecnico
                          ? tecnicos.find((t) => t.id === selectedTecnico)?.nome
                          : "BUSCAR TÉCNICO..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-950 border-zinc-800 rounded-none shadow-2xl" align="start">
                  <Command className="bg-zinc-950">
                    <CommandInput 
                      placeholder="Filtrar por nome..." 
                      className="h-10 font-mono text-[11px] uppercase tracking-wider bg-zinc-950 border-none focus:ring-0" 
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="py-6 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        Técnico não localizado_
                      </CommandEmpty>
                      <CommandGroup className="p-1">
                        {tecnicos.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={t.nome}
                            onSelect={() => {
                              setSelectedTecnico(prev => prev === t.id ? "" : t.id);
                              setOpen(false);
                            }}
                            className="text-xs hover:bg-zinc-900 focus:bg-zinc-900 rounded-none py-3 px-3 cursor-pointer aria-selected:bg-zinc-900 aria-selected:text-amber-500 transition-colors"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-amber-500 transition-all",
                                selectedTecnico === t.id ? "opacity-100 scale-100" : "opacity-0 scale-50"
                              )}
                            />
                            <span className="font-medium">{t.nome}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedTecnico && (
              <div className="pt-2">
                <div className="group/tech relative p-3 bg-blue-500/10 border border-blue-500/20 rounded-none flex items-center justify-between transition-all hover:bg-blue-500/15">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-blue-500/60 uppercase tracking-tighter">Destinatário Selecionado</span>
                      <span className="text-xs font-bold text-blue-400 truncate uppercase">
                        {tecnicos.find((t) => t.id === selectedTecnico)?.nome}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-400/50 hover:text-blue-400 hover:bg-blue-400/20 rounded-none transition-colors shrink-0"
                    onClick={() => setSelectedTecnico("")}
                    title="Remover seleção"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Command Dock */}
      {selectedPecas.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-10 duration-500 z-50">
          <div className="bg-amber-500 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.3)] border border-amber-400/20">
            <div className="bg-black p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2">
                  <Box className="w-5 h-5 text-black" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Pronto para Envio</p>
                  <p className="text-xl font-black text-white font-mono tabular-nums">
                    {selectedPecas.size.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className={`h-12 px-6 rounded-none font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                  !selectedTecnico 
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                    : "bg-amber-500 text-black hover:bg-white"
                }`}
                onClick={handleDistribuir}
                disabled={loading || !selectedTecnico}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    EXECUTAR_DISTRIBUIÇÃO <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
          {!selectedTecnico && (
            <p className="text-center text-[10px] font-bold text-amber-500/80 mt-2 uppercase tracking-widest bg-black/80 py-1 backdrop-blur-sm">
              ⚠ SELECIONE UM TÉCNICO PARA HABILITAR_
            </p>
          )}
        </div>
      )}
    </div>
  );
}
