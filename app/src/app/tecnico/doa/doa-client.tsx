"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, AlertOctagon, X } from "lucide-react";
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
import { registrarDoaPeca } from "@/app/actions/doa";

export function DoaClient({ pecas }: { pecas: PecaBase[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { fotos, addPhotos, removePhoto, reset: resetFotos } = usePhotoGallery();
  
  const [loading, setLoading] = useState(false);
  const [selectedPecas, setSelectedPecas] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");

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
    if (selectedPecas.length === 0 || !motivo || fotos.length === 0) {
      toast.error("Por favor, preencha todos os campos, selecione pelo menos uma peça e anexe uma foto da evidência.");
      return;
    }

    setLoading(true);
    try {
      const fotoUrls = await Promise.all(
        fotos.map(f => uploadToStorage(supabase, f.file, "evidencias"))
      );

      const result = await registrarDoaPeca(
        selectedPecas,
        motivo.toUpperCase(),
        fotoUrls
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Peças registradas como DOA com sucesso!");
        setSelectedPecas([]);
        setMotivo("");
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
        Você não possui peças em estoque para registrar como DOA.
      </div>
    );
  }

  const pecasDisponiveis = pecas.filter(p => !selectedPecas.includes(p.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Card className="border-red-500/20 bg-card/80 shadow-xl shadow-red-500/5 overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="divide-y divide-border/40">
            {/* Seção de Dados da Peça */}
            <div className="p-5 md:p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="peca" className="text-xs font-semibold text-red-400 ml-1">Peças com Defeito (DOA)</Label>
                
                <Select value="" onValueChange={(val) => val && handleAddPeca(val)}>
                  <SelectTrigger id="peca" className="w-full bg-background border-red-500/30 focus:ring-red-500/20 shadow-sm transition-all">
                    <SelectValue placeholder={pecasDisponiveis.length > 0 ? "Selecione a peça defeituosa..." : "Nenhuma peça disponível"} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[400px]">
                    {pecasDisponiveis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col py-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                              {trimLeadingZeros(p.pca)}
                            </span>
                            <span className="font-semibold text-sm uppercase">{p.descricao}</span>
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
                        <div key={p.id} className="flex items-center justify-between bg-red-500/5 border border-red-500/20 p-2 rounded-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0">
                              {trimLeadingZeros(p.pca)}
                            </span>
                            <span className="text-xs font-semibold truncate uppercase">{p.descricao}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
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
                <Label htmlFor="motivo" className="text-xs font-semibold text-foreground ml-1">Motivo / Descrição do Defeito</Label>
                <Textarea 
                  id="motivo" 
                  placeholder="DESCREVA DETALHADAMENTE O DEFEITO..." 
                  className="min-h-[100px] resize-none bg-background border-border/60 shadow-sm uppercase"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* Seção de Mídia */}
            <div className="p-5 md:p-6 bg-red-500/5 space-y-4">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                <Label className="text-xs font-semibold text-red-500">Evidência (Foto do Defeito/Etiqueta)</Label>
              </div>
              
              <div className="flex flex-wrap gap-4 items-start">
                {fotos.map((fotoItem, idx) => (
                  <div key={idx} className="relative w-[140px] h-[100px] rounded-lg overflow-hidden border border-red-500/30 shadow-sm group">
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

                <label className="flex flex-col items-center justify-center w-[140px] h-[100px] border-2 border-dashed border-red-500/30 rounded-lg cursor-pointer bg-background hover:bg-red-500/5 transition-all group shrink-0">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mb-1 group-hover:scale-110 group-hover:bg-red-500/20 transition-all">
                    <Camera className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-[10px] font-semibold text-red-500/80">Adicionar Foto</p>
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
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                A(s) foto(s) deve(m) comprovar o estado em que a peça foi recebida.
              </p>
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
                variant="destructive"
                className="w-full sm:w-auto text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <AlertOctagon className="mr-2 h-4 w-4" />
                    Registrar DOA
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
