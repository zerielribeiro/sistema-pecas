"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trimLeadingZeros } from "@/lib/utils";
import { uploadToStorage } from "@/lib/upload";
import { usePhotoGallery } from "@/hooks/use-photo-gallery";
import type { PecaBase } from "@/types/peca";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { registrarAtendimentoEBaixa } from "@/app/actions/atendimento";

export function AtendimentoClient({ pecas }: { pecas: PecaBase[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { fotos, addPhotos, removePhoto, reset: resetFotos } = usePhotoGallery();
  
  const [loading, setLoading] = useState(false);
  const [selectedPecas, setSelectedPecas] = useState<string[]>([]);
  const [numeroChamado, setNumeroChamado] = useState("");
  const [localAtendimento, setLocalAtendimento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isPecaNova, setIsPecaNova] = useState(false);

  const handleAddPeca = (id: string) => {
    if (!selectedPecas.includes(id)) {
      setSelectedPecas([...selectedPecas, id]);
    }
  };

  const handleRemovePeca = (id: string) => {
    setSelectedPecas(selectedPecas.filter(p => p !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPecas.length === 0) {
      toast.error("Por favor, selecione pelo menos uma peça.");
      return;
    }

    if (!isPecaNova) {
      if (!numeroChamado || !localAtendimento || !descricao || fotos.length === 0) {
        toast.error("Por favor, preencha todos os campos e anexe uma foto.");
        return;
      }
    }

    setLoading(true);
    try {
      const fotoUrls = await Promise.all(
        fotos.map(f => uploadToStorage(supabase, f.file, "atendimentos"))
      );

      const result = await registrarAtendimentoEBaixa(
        selectedPecas,
        numeroChamado.toUpperCase(),
        localAtendimento.toUpperCase(),
        descricao.toUpperCase(),
        fotoUrls,
        isPecaNova
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Atendimento registrado com sucesso!");
        setSelectedPecas([]);
        setNumeroChamado("");
        setLocalAtendimento("");
        setDescricao("");
        setIsPecaNova(false);
        resetFotos();
        router.refresh();
      }
    } catch (err) {
      toast.error("Erro ao registrar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  if (pecas.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-border/50 rounded-lg bg-card/50">
        Você não possui peças em estoque para dar baixa.
      </div>
    );
  }

  const pecasDisponiveis = pecas.filter(p => !selectedPecas.includes(p.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Card className="border-border/50 bg-card/80 shadow-md overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="divide-y divide-border/40">
            {/* Seção de Dados da Peça */}
            <div className="p-5 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr] gap-6 items-start">
                <div className="space-y-3">
                  <Label htmlFor="peca" className="text-xs font-semibold text-foreground ml-1">
                    Peças Utilizadas
                  </Label>
                  
                  <Select value="" onValueChange={(val) => val && handleAddPeca(val)}>
                    <SelectTrigger id="peca" className="w-full bg-background border-border/60 focus:ring-primary/20 transition-all shadow-sm">
                      <SelectValue placeholder={pecasDisponiveis.length > 0 ? "Selecione para adicionar..." : "Nenhuma peça disponível"} />
                    </SelectTrigger>
                    <SelectContent className="max-w-[400px]">
                      {pecasDisponiveis.map((p) => (
                         <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col py-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                                {trimLeadingZeros(p.pca)}
                              </span>
                              <span className="font-semibold text-sm">{p.descricao}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground mt-0.5 ml-1">
                              COD: {trimLeadingZeros(p.cod_produto)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Lista de Peças Selecionadas */}
                  {selectedPecas.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {selectedPecas.map(id => {
                        const p = pecas.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <div key={p.id} className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2 rounded-lg">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0">
                                {trimLeadingZeros(p.pca)}
                              </span>
                              <span className="text-xs font-semibold truncate">{p.descricao}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleRemovePeca(p.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="chamado" className="text-xs font-semibold text-foreground ml-1">
                    Número do Chamado (OS)
                  </Label>
                  <Input 
                    id="chamado" 
                    placeholder="EX: OS-2024-..." 
                    className="bg-background border-border/60 focus:ring-primary/20 transition-all shadow-sm uppercase disabled:opacity-50"
                    value={numeroChamado}
                    onChange={(e) => setNumeroChamado(e.target.value.toUpperCase())}
                    disabled={isPecaNova}
                  />
                </div>
              </div>

              {/* Checkbox Peça Nova */}
              <div className="flex items-center space-x-2 bg-primary/5 p-3 rounded-lg border border-primary/20">
                <Checkbox 
                  id="peca_nova" 
                  checked={isPecaNova} 
                  onCheckedChange={(val) => setIsPecaNova(!!val)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="peca_nova"
                    className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Devolver como Peça Nova
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Marque esta opção se a peça não foi utilizada e deve retornar ao estoque.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="local" className="text-xs font-semibold text-foreground ml-1">Local do Atendimento (Cliente)</Label>
                <Input 
                  id="local" 
                  placeholder="EX: LOJA CENTRO" 
                  className="bg-background border-border/60 shadow-sm uppercase disabled:opacity-50"
                  value={localAtendimento}
                  onChange={(e) => setLocalAtendimento(e.target.value.toUpperCase())}
                  disabled={isPecaNova}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="descricao" className="text-xs font-semibold text-foreground ml-1">Descrição do Problema/Serviço</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="DESCREVA O QUE FOI REALIZADO..." 
                  className="min-h-[100px] resize-none bg-background border-border/60 shadow-sm uppercase disabled:opacity-50"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value.toUpperCase())}
                  disabled={isPecaNova}
                />
              </div>
            </div>

            {/* Seção de Mídia */}
            <div className={`p-5 md:p-6 bg-muted/10 space-y-4 transition-opacity ${isPecaNova ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <Label className="text-xs font-semibold text-foreground ml-1">Comprovantes (Obrigatório)</Label>
              
              <div className="flex flex-wrap gap-4 items-start">
                {fotos.map((fotoItem, idx) => (
                  <div key={idx} className="relative w-[140px] h-[100px] rounded-lg overflow-hidden border border-border/50 shadow-sm group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoItem.preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md"
                        onClick={() => removePhoto(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <label className="flex flex-col items-center justify-center w-[140px] h-[100px] border-2 border-dashed border-border/60 rounded-lg cursor-pointer bg-background hover:bg-muted/30 transition-all group shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] font-semibold text-foreground">Adicionar Foto</p>
                  <Input 
                    id="foto" 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    multiple
                    className="hidden" 
                    onChange={addPhotos}
                  />
                </label>
              </div>
            </div>

            <div className="p-5 md:p-6 bg-card flex flex-col sm:flex-row items-center gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline"
                className="w-full sm:w-auto text-sm font-semibold shadow-sm"
                onClick={() => router.push("/tecnico/estoque")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Finalizar Atendimento"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
