"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PackageSearch, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  marcarEnvioLab, 
  confirmarEnvioLab 
} from "@/app/actions/laboratorio";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Filter, User, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Peca {
  id: string;
  cod_produto: string;
  descricao: string | null;
  pca: string;
  status: string;
  tecnico?: { nome: string } | null;
}

export function LaboratorioClient({ pecas }: { pecas: Peca[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [tecnicoFilter, setTecnicoFilter] = useState<string>("TODOS");

  const getNomeTecnico = (p: Peca) => {
    return p.tecnico?.nome || null;
  };

  // Extrair técnicos únicos que possuem peças nessas abas
  const tecnicosComPecas = Array.from(new Set(
    pecas
      .map(p => getNomeTecnico(p))
      .filter(Boolean)
  )).sort() as string[];

  const pecasReceber = pecas.filter((p) => {
    const isReceber = p.status === "DOA" || p.status === "UTILIZADA";
    const nomeTecnico = getNomeTecnico(p);
    const matchesTecnico = tecnicoFilter === "TODOS" || nomeTecnico === tecnicoFilter;
    return isReceber && matchesTecnico;
  });

  const pecasEnviar = pecas.filter((p) => p.status === "AGUARDANDO_ENVIO");

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const generatePDF = (selectedPecas: Peca[]) => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = format(now, "dd-MM-yyyy");
    
    // Pegar o nome do técnico (se filtrado ou do primeiro item)
    let nomeTecnico = tecnicoFilter !== "TODOS" ? tecnicoFilter : "VARIOS";
    if (nomeTecnico === "VARIOS" && selectedPecas.length > 0) {
      const uniqueTecs = Array.from(new Set(selectedPecas.map(p => getNomeTecnico(p)).filter(Boolean)));
      if (uniqueTecs.length === 1) nomeTecnico = uniqueTecs[0] as string;
    }

    // Design do Cabeçalho
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.setFont("helvetica", "bold");
    doc.text("GestorRB - Laboratório", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("RELATÓRIO DE RECEBIMENTO DE PEÇAS DEFEITUOSAS", 14, 32);

    // Info do Relatório
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Técnico Responsável:`, 14, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${nomeTecnico}`, 55, 42);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Data/Hora:`, 130, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${format(now, "dd/MM/yyyy HH:mm")}`, 155, 42);

    // Tabela de Peças
    const tableData = selectedPecas.map(p => [
      trimLeadingZeros(p.pca),
      trimLeadingZeros(p.cod_produto),
      p.status,
      p.descricao || "N/A"
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["PCA / SÉRIE", "CÓDIGO", "STATUS", "DESCRIÇÃO DO PRODUTO"]],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 40 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 25 },
        3: { fontSize: 9 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Área de Assinaturas
    if (finalY < 230) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      
      // Linha Técnico
      doc.line(14, 250, 94, 250);
      doc.text("Assinatura do Técnico", 35, 256);
      
      // Linha Gestor
      doc.line(116, 250, 196, 250);
      doc.text("Assinatura do Gestor", 137, 256);
      
      doc.setFontSize(8);
      doc.text("Este documento comprova o recebimento físico das peças listadas acima.", 14, 275);
      doc.text(`Gerado por GestorRB em ${format(now, "dd/MM/yyyy HH:mm:ss")}`, 14, 280);
    }

    // Salvar
    const fileName = `RECEBIMENTO_${nomeTecnico}_${dateStr}.pdf`;
    doc.save(fileName);
  };

  const handleAction = async (
    actionFn: (ids: string[], obs?: string) => Promise<{ error?: string; success?: boolean }>, 
    requireObs = false,
    shouldGeneratePdf = false
  ) => {
    if (selectedIds.size === 0) return;
    
    if (requireObs && !observacao.trim()) {
      toast.error("Por favor, adicione uma observação de finalização.");
      return;
    }

    setLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const pecasSelecionadas = pecas.filter(p => selectedIds.has(p.id));
      
      const result = await actionFn(ids, observacao);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        if (shouldGeneratePdf) {
          generatePDF(pecasSelecionadas);
        }
        toast.success("Operação realizada com sucesso!");
        setSelectedIds(new Set());
        setObservacao("");
      }
    } catch (e) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const trimLeadingZeros = (val: string | null | undefined) => {
    if (!val) return "";
    return val.replace(/^0+/, "");
  };

  const renderList = (
    list: Peca[], 
    emptyMsg: string, 
    actionLabel: string, 
    actionIcon: React.ReactNode, 
    actionHandler: () => void,
    showObs = false
  ) => {
    if (list.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground border border-border/50 rounded-lg bg-card/50 mt-4">
          {emptyMsg}
        </div>
      );
    }

    const isAllSelected = list.every(p => selectedIds.has(p.id));
    
    const toggleAll = () => {
      if (isAllSelected) {
        const newSelected = new Set(selectedIds);
        list.forEach(p => newSelected.delete(p.id));
        setSelectedIds(newSelected);
      } else {
        const newSelected = new Set(selectedIds);
        list.forEach(p => newSelected.add(p.id));
        setSelectedIds(newSelected);
      }
    };

    return (
      <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between p-2 px-4 bg-muted/20 rounded-xl border border-border/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={isAllSelected}
              onCheckedChange={toggleAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm font-semibold text-muted-foreground">Selecionar Todas</span>
          </div>
          <Badge variant="outline" className="bg-background/50 border-border/50">{list.length} itens</Badge>
        </div>

        <div className="space-y-2">
          {list.map((peca) => (
            <Card 
              key={peca.id} 
              className={`border-border/40 transition-all hover:border-primary/30 group overflow-hidden ${selectedIds.has(peca.id) ? 'bg-primary/5 border-primary/40 shadow-sm shadow-primary/5' : 'bg-card/40 hover:bg-muted/30'}`}
              onClick={() => toggleSelection(peca.id)}
            >
              <CardContent className="p-0 flex items-center cursor-pointer min-h-[64px]">
                <div className="px-4 flex items-center justify-center">
                   <Checkbox 
                    checked={selectedIds.has(peca.id)}
                    onCheckedChange={() => toggleSelection(peca.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[140px_110px_1fr_140px] items-center gap-4 px-2 py-3 overflow-hidden">
                   {/* PCA */}
                   <div className="flex flex-col sm:block overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 sm:hidden mb-1">PCA</span>
                    <p className="font-mono text-sm font-bold tracking-tight text-foreground truncate">
                      {trimLeadingZeros(peca.pca)}
                    </p>
                  </div>

                  {/* CÓDIGO */}
                  <div className="flex flex-col sm:block overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 sm:hidden mb-1">CÓDIGO</span>
                    <Badge variant="outline" className="w-fit font-mono text-[10px] h-5 border-primary/20 text-primary/80 bg-primary/5">
                      {trimLeadingZeros(peca.cod_produto)}
                    </Badge>
                  </div>

                  {/* DESCRIÇÃO */}
                  <div className="flex flex-col sm:block overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 sm:hidden mb-1">DESCRIÇÃO</span>
                    <p className="text-xs text-muted-foreground truncate pr-4">
                      {peca.descricao || "Sem descrição disponível"}
                    </p>
                  </div>

                  {/* STATUS / TÉCNICO */}
                  <div className="flex flex-col items-start sm:items-end gap-1.5 pr-4">
                    <Badge 
                      variant="secondary" 
                      className={`text-[10px] px-1.5 h-4 shrink-0 font-bold border ${
                        peca.status === 'DOA' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        peca.status === 'UTILIZADA' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {peca.status}
                    </Badge>
                    
                    {getNomeTecnico(peca) && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/5 border border-blue-500/10 max-w-full">
                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="text-[10px] font-semibold text-blue-400 truncate">
                          {getNomeTecnico(peca)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-20 left-4 right-4 sm:static sm:bottom-auto sm:left-auto sm:right-auto animate-in slide-in-from-bottom-6">
            <Card className="border-primary/20 bg-card shadow-lg sm:shadow-none">
              <CardContent className="p-4 space-y-4">
                {showObs && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Laudo / Observação</label>
                    <Textarea 
                      placeholder="Ex: Peça descartada por defeito de fábrica..." 
                      className="resize-none h-20"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </div>
                )}
                <Button 
                  className="w-full h-12" 
                  onClick={actionHandler}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : actionIcon}
                  <span className={loading ? "opacity-0 absolute" : "ml-2"}>{actionLabel} ({selectedIds.size})</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="receber" className="w-full" onValueChange={() => setSelectedIds(new Set())}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="receber" className="text-xs sm:text-sm">Receber DOA</TabsTrigger>
          <TabsTrigger value="enviar" className="text-xs sm:text-sm">Enviar p/ Lab</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receber">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Peças DOA (Com Técnicos)</h3>
              <p className="text-xs text-muted-foreground mt-1">Confirme o recebimento físico das peças defeituosas que os técnicos registraram.</p>
            </div>
            
            <div className="min-w-[200px]">
              <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <Filter className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Filtrar por Técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Técnicos</SelectItem>
                  {tecnicosComPecas.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderList(
            pecasReceber, 
            "Nenhuma peça pendente de recebimento.", 
            "Receber Peças", 
            <PackageSearch className="w-4 h-4" />, 
            () => handleAction((ids) => marcarEnvioLab(ids), false, true)
          )}
        </TabsContent>

        <TabsContent value="enviar">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Aguardando Envio</h3>
            <p className="text-xs text-muted-foreground mt-1">Peças que estão com você prontas para despachar ao laboratório/fornecedor.</p>
          </div>
          {renderList(
            pecasEnviar, 
            "Nenhuma peça aguardando envio.", 
            "Confirmar Envio", 
            <Send className="w-4 h-4" />, 
            () => handleAction((ids) => confirmarEnvioLab(ids))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
