"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft, Plus, Minus, ChevronDown, ChevronUp, Upload, FileSpreadsheet, Download, Search, Filter, Users, MoreVertical, Edit, Trash2, AlertTriangle, X, BookOpen, Database, Package, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  remanejarPeca, 
  cadastrarPeca, 
  importarPecasLote, 
  editarPeca, 
  excluirPeca,
  cadastrarModelo,
  importarModelosLote,
  getCatalogo
} from "@/app/actions/pecas";

const statusColors: Record<string, string> = {
  EM_ESTOQUE_EMPRESA: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  DISTRIBUIDA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  UTILIZADA: "bg-emerald/15 text-emerald border-emerald/30",
  DOA: "bg-red-500/15 text-red-400 border-red-500/30",
  AGUARDANDO_ENVIO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ENVIADA_LAB: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  FINALIZADA: "bg-stone-500/15 text-stone-400 border-stone-500/30",
};

const statusLabels: Record<string, string> = {
  EM_ESTOQUE_EMPRESA: "Estoque",
  DISTRIBUIDA: "Com Técnico",
  UTILIZADA: "Utilizada",
  DOA: "DOA",
  AGUARDANDO_ENVIO: "Aguard. Envio",
  ENVIADA_LAB: "No Lab",
  FINALIZADA: "Finalizada",
};

interface Peca {
  id: string;
  cod_produto: string;
  descricao: string | null;
  pca: string;
  status: string;
  atualizado_em: string | null;
  tecnico: { nome: string } | null;
  tecnico_atual_id: string | null;
}

interface Tecnico {
  id: string;
  nome: string;
}

export function PecasClient({
  pecas,
  tecnicos,
}: {
  pecas: Peca[];
  tecnicos: Tecnico[];
}) {
  const router = useRouter();
  const [selectedPeca, setSelectedPeca] = useState<Peca | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [destino, setDestino] = useState<string>("ESTOQUE");
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [tecnicoFilter, setTecnicoFilter] = useState<string>("TODOS");

  const getNomeTecnico = (p: Peca) => {
    return p.tecnico?.nome || "";
  };

  const trimLeadingZeros = (val: string | null | undefined) => {
    if (!val) return "";
    return val.replace(/^0+/, "");
  };

  const filteredPecas = pecas.filter(peca => {
    const nomeTecnico = getNomeTecnico(peca);
    const matchesSearch = 
      peca.cod_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (peca.descricao?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      peca.pca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomeTecnico.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "TODOS" || peca.status === statusFilter;
    const matchesTecnico = tecnicoFilter === "TODOS" || nomeTecnico === tecnicoFilter;
    
    return matchesSearch && matchesStatus && matchesTecnico;
  });

  const tecnicosComPecas = Array.from(new Set(
    pecas
      .map(p => getNomeTecnico(p))
      .filter(Boolean)
  )).sort() as string[];

  // Estados para Cadastro Manual
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newCodProduto, setNewCodProduto] = useState("");
  const [newDescricao, setNewDescricao] = useState("");
  const [newPca, setNewPca] = useState("");
  const [newEntryDate, setNewEntryDate] = useState("");

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Estados para Catálogo (Modelos)
  const [catalogo, setCatalogo] = useState<{ id: string; cod_produto: string; descricao: string | null }[]>([]);
  const [isModeloDialogOpen, setIsModeloDialogOpen] = useState(false);
  const [isImportModeloDialogOpen, setIsImportModeloDialogOpen] = useState(false);
  const [newModeloCod, setNewModeloCod] = useState("");
  const [newModeloDesc, setNewModeloDesc] = useState("");
  const [modeloCsvFile, setModeloCsvFile] = useState<File | null>(null);

  const carregarCatalogo = async () => {
    const result = await getCatalogo();
    if (result.data) {
      setCatalogo(result.data);
    }
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (cod: string) => {
    const next = new Set(expandedGroups);
    if (next.has(cod)) next.delete(cod);
    else next.add(cod);
    setExpandedGroups(next);
  };

  const groupedPecas = useMemo(() => {
    const groups: Record<string, typeof filteredPecas> = {};
    filteredPecas.forEach(peca => {
      const key = peca.cod_produto;
      if (!groups[key]) groups[key] = [];
      groups[key].push(peca);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPecas]);

  useEffect(() => {
    carregarCatalogo();
  }, []);

  // Estados para Edição
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editPecaId, setEditPecaId] = useState("");
  const [editCodProduto, setEditCodProduto] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPca, setEditPca] = useState("");

  // Estados para Exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePecaId, setDeletePecaId] = useState("");

  const handleCadastrarModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModeloCod) {
      toast.error("Código do Produto é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const result = await cadastrarModelo({
        cod_produto: newModeloCod,
        descricao: newModeloDesc,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Modelo cadastrado no catálogo!");
        setIsModeloDialogOpen(false);
        setNewModeloCod("");
        setNewModeloDesc("");
        carregarCatalogo();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportarModelosCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeloCsvFile) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim() !== "");
        
        if (lines.length < 2) {
          toast.error("O arquivo deve conter um cabeçalho e pelo menos uma linha de dados.");
          setLoading(false);
          return;
        }

        // Remove header
        const dataLines = lines.slice(1);
        
        const modelos = dataLines.map(line => {
          const [cod_produto, descricao] = line.split(",").map(val => val.trim());
          return { cod_produto, descricao };
        }).filter(m => m.cod_produto);

        if (modelos.length === 0) {
          toast.error("Nenhum dado válido encontrado no arquivo.");
          setLoading(false);
          return;
        }

        const result = await importarModelosLote(modelos);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`${modelos.length} modelos importados com sucesso!`);
          setIsImportModeloDialogOpen(false);
          setModeloCsvFile(null);
          carregarCatalogo();
        }
      };
      reader.readAsText(modeloCsvFile);
    } catch (error) {
      toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodProduto || !newPca) {
      toast.error("Código do Produto e PCA são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const result = await cadastrarPeca({
        cod_produto: newCodProduto,
        descricao: newDescricao,
        pca: newPca,
        data_entrada: newEntryDate || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Peça cadastrada com sucesso!");
        setIsNewDialogOpen(false);
        setNewCodProduto("");
        setNewDescricao("");
        setNewPca("");
        setNewEntryDate("");
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro inesperado ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportarCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Selecione um arquivo CSV.");
      return;
    }

    setLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split("\n");
      const pecas: { cod_produto: string; descricao: string; pca: string }[] = [];

      // Ignorar cabeçalho se houver (assume-se: cod_produto,descricao,pca)
      const startLine = lines[0].toLowerCase().includes("cod") ? 1 : 0;

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [cod_produto, descricao, pca] = line.split(",").map(s => s.trim());
        if (cod_produto && pca) {
          pecas.push({ cod_produto, descricao: descricao || "", pca });
        }
      }

      if (pecas.length === 0) {
        toast.error("Nenhuma peça válida encontrada no arquivo.");
        setLoading(false);
        return;
      }

      const result = await importarPecasLote(pecas);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${pecas.length} peças importadas com sucesso!`);
        setIsImportDialogOpen(false);
        setCsvFile(null);
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro ao processar arquivo CSV.");
    } finally {
      setLoading(false);
    }
  };

  const openRemanejar = (peca: Peca) => {
    setSelectedPeca(peca);
    setDestino("ESTOQUE");
    setIsSheetOpen(true);
  };

  const handleRemanejar = async () => {
    if (!selectedPeca) return;
    
    setLoading(true);
    try {
      const result = await remanejarPeca(selectedPeca.id, destino);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Peça remanejada com sucesso!");
        setIsSheetOpen(false);
        router.refresh();
      }
    } catch (e) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const openEditar = (peca: Peca) => {
    setEditPecaId(peca.id);
    setEditCodProduto(peca.cod_produto);
    setEditDescricao(peca.descricao || "");
    setEditPca(peca.pca);
    setIsEditDialogOpen(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCodProduto || !editPca) {
      toast.error("Código do Produto e PCA são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const result = await editarPeca(editPecaId, {
        cod_produto: editCodProduto,
        descricao: editDescricao,
        pca: editPca,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Peça atualizada com sucesso!");
        setIsEditDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro inesperado ao editar.");
    } finally {
      setLoading(false);
    }
  };

  const openExcluir = (id: string) => {
    setDeletePecaId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleExcluir = async () => {
    setLoading(true);
    try {
      const result = await excluirPeca(deletePecaId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Peça excluída com sucesso!");
        setIsDeleteDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro inesperado ao excluir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Inventário de Peças</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">
              {filteredPecas.length} de {pecas.length} itens
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
              {catalogo.length} modelos no catálogo
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Menu de Catálogo */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" variant="outline" className="h-9 border-blue-500/30 hover:bg-blue-500/5" />}>
              <BookOpen className="w-4 h-4 mr-2 text-blue-400" />
              Cadastro de Peças
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsModeloDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Novo Modelo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportModeloDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importar Catálogo (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Importar Peças p/ Estoque (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialog de Entrada de Peça (Estoque) */}
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="h-9 bg-emerald hover:bg-emerald/90 text-white" />}>
              <Package className="w-4 h-4 mr-2" />
              Entrada de Peça
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCadastrar}>
                <DialogHeader>
                  <DialogTitle>Dar Entrada no Estoque</DialogTitle>
                  <DialogDescription>
                    Selecione um modelo do catálogo e informe o PCA para adicionar ao estoque.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cod_produto_entry">Modelo / Código do Produto</Label>
                    <div className="relative">
                      <Input 
                        id="cod_produto_entry" 
                        list="catalogo-options"
                        placeholder="Pesquise ou digite o código..." 
                        value={newCodProduto}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setNewCodProduto(val);
                          const modelo = catalogo.find(m => m.cod_produto === val);
                          if (modelo) setNewDescricao(modelo.descricao || "");
                        }}
                      />
                      <datalist id="catalogo-options">
                        {catalogo.map(m => (
                          <option key={m.id} value={m.cod_produto}>{m.descricao}</option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_entrada_entry">Data de Entrada</Label>
                    <Input 
                      id="data_entrada_entry" 
                      type="date"
                      value={newEntryDate}
                      onChange={(e) => setNewEntryDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao_entry">Descrição</Label>
                    <Input 
                      id="descricao_entry" 
                      placeholder="Descrição do modelo selecionado" 
                      value={newDescricao}
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pca_entry">PCA / Número de Série (Único)</Label>
                    <Input 
                      id="pca_entry" 
                      placeholder="Ex: PCA123456" 
                      value={newPca}
                      onChange={(e) => setNewPca(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading || !newCodProduto || !newPca}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Entrada
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* DIALOGS DE CATÁLOGO (MODELOS) */}
      <Dialog open={isModeloDialogOpen} onOpenChange={setIsModeloDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCadastrarModelo}>
            <DialogHeader>
              <DialogTitle>Cadastrar Modelo no Catálogo</DialogTitle>
              <DialogDescription>
                Defina o código e a descrição de um novo modelo de peça.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modelo_cod">Código do Produto</Label>
                <Input 
                  id="modelo_cod" 
                  placeholder="Ex: SSD-256-NVME" 
                  value={newModeloCod}
                  onChange={(e) => setNewModeloCod(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo_desc">Descrição do Modelo</Label>
                <Input 
                  id="modelo_desc" 
                  placeholder="Ex: SSD Samsung EVO 870 256GB" 
                  value={newModeloDesc}
                  onChange={(e) => setNewModeloDesc(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar no Catálogo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModeloDialogOpen} onOpenChange={setIsImportModeloDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleImportarModelosCSV}>
            <DialogHeader>
              <DialogTitle>Importar Catálogo (CSV)</DialogTitle>
              <DialogDescription>
                Colunas esperadas: <code className="bg-muted px-1 font-mono text-[10px]">cod_produto, descricao</code>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-6 text-center">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground mb-4" />
                <Label htmlFor="csv_modelos" className="cursor-pointer text-primary hover:underline">
                  {modeloCsvFile ? modeloCsvFile.name : "Clique para selecionar o CSV de modelos"}
                </Label>
                <Input 
                  id="csv_modelos" 
                  type="file" 
                  accept=".csv"
                  className="hidden" 
                  onChange={(e) => setModeloCsvFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !modeloCsvFile}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar Catálogo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleImportarCSV}>
            <DialogHeader>
              <DialogTitle>Importar Peças p/ Estoque (CSV)</DialogTitle>
              <DialogDescription>
                Colunas esperadas: <code className="bg-muted px-1 font-mono text-[10px]">cod_produto, descricao, pca</code>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-6 text-center">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30">
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <Label htmlFor="csv_pecas" className="cursor-pointer text-primary hover:underline">
                  {csvFile ? csvFile.name : "Clique para selecionar o CSV de peças"}
                </Label>
                <Input 
                  id="csv_pecas" 
                  type="file" 
                  accept=".csv"
                  className="hidden" 
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !csvFile}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar para Estoque
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por código, descrição ou PCA..." 
              className="pl-9 bg-muted/20 border-border/50 focus:bg-background transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "TODOS")}>
              <SelectTrigger className="w-[150px] bg-muted/20 border-border/50">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tecnicoFilter} onValueChange={(val) => setTecnicoFilter(val || "TODOS")}>
              <SelectTrigger className="w-[180px] bg-muted/20 border-border/50">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Técnicos</SelectItem>
                {tecnicos.map(t => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros Ativos */}
        {(searchTerm || statusFilter !== "TODOS" || tecnicoFilter !== "TODOS") && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mr-1">Filtros Ativos:</span>
            
            {searchTerm && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                <span className="text-[11px]">Busca:</span>
                <span className="font-semibold text-[11px] truncate max-w-[150px]">{searchTerm}</span>
                <button onClick={() => setSearchTerm("")} className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {statusFilter !== "TODOS" && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                <span className="text-[11px]">Status:</span>
                <span className="font-semibold text-[11px]">{statusLabels[statusFilter as keyof typeof statusLabels]}</span>
                <button onClick={() => setStatusFilter("TODOS")} className="ml-1 p-0.5 rounded-full hover:bg-emerald-500/20">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {tecnicoFilter !== "TODOS" && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <span className="text-[11px]">Técnico:</span>
                <span className="font-semibold text-[11px]">{tecnicoFilter}</span>
                <button onClick={() => setTecnicoFilter("TODOS")} className="ml-1 p-0.5 rounded-full hover:bg-blue-500/20">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("TODOS");
                setTecnicoFilter("TODOS");
              }}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              Limpar Tudo
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {groupedPecas.map(([codProduto, items]) => {
          const firstPeca = items[0];
          const isExpanded = expandedGroups.has(codProduto);
          const hasMultiple = items.length > 1;

          return (
            <Card key={codProduto} className="border-border/50 bg-card/80 overflow-hidden transition-all duration-300">
              <CardContent className="p-0">
                {/* Header do Grupo */}
                <div 
                  className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? 'border-b border-border/50' : ''}`}
                  onClick={() => hasMultiple && toggleGroup(codProduto)}
                >
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="font-mono text-[11px] h-5 px-2 border-primary/30 text-primary font-bold">
                        {trimLeadingZeros(codProduto)}
                      </Badge>
                      {hasMultiple && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] h-5 px-1.5 font-bold shrink-0">
                          {items.length} UNIDADES
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground truncate flex-1">
                      {firstPeca.descricao || "SEM DESCRIÇÃO"}
                    </p>

                    {!hasMultiple && (
                      <div className="flex items-center gap-4 shrink-0 mr-2">
                        {firstPeca.tecnico?.nome && (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-400">
                            <Users className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px] uppercase tracking-tighter">{firstPeca.tecnico.nome}</span>
                          </div>
                        )}
                        <p className="font-mono text-[11px] text-muted-foreground font-medium hidden sm:block">
                          PCA: <span className="text-zinc-300">{trimLeadingZeros(firstPeca.pca)}</span>
                        </p>
                        <Badge variant="outline" className={`${statusColors[firstPeca.status]} text-[10px] h-5`}>
                          {statusLabels[firstPeca.status]}
                        </Badge>
                        
                        {firstPeca.status === "DISTRIBUIDA" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] border-primary/20 text-primary hover:bg-primary/10 hidden sm:flex"
                            onClick={(e) => { e.stopPropagation(); openRemanejar(firstPeca); }}
                          >
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            Remanejar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {hasMultiple ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'hover:bg-primary/10 text-muted-foreground'}`}
                      >
                        {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild nativeButton={true}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {firstPeca.status === "DISTRIBUIDA" && (
                            <DropdownMenuItem className="sm:hidden" onClick={(e) => { e.stopPropagation(); openRemanejar(firstPeca); }}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Remanejar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditar(firstPeca); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500 focus:text-red-500"
                            onClick={(e) => { e.stopPropagation(); openExcluir(firstPeca.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Lista de Peças (Accordion) */}
                {isExpanded && hasMultiple && (
                  <div className="bg-muted/10 animate-in slide-in-from-top-2 duration-300">
                    {items.map((peca) => {
                      const isDistribuida = peca.status === "DISTRIBUIDA";
                      const nomeTecnico = peca.tecnico?.nome || null;

                      return (
                        <div key={peca.id} className="p-2 pl-6 border-b border-border/30 last:border-0 flex items-center justify-between hover:bg-muted/20 transition-colors group/item">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[140px_110px_1fr_140px] items-center gap-4">
                            {/* PCA */}
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground/60 sm:hidden">PCA</span>
                              <span className="font-mono text-xs text-foreground font-bold bg-muted px-1.5 py-0.5 rounded">
                                {trimLeadingZeros(peca.pca)}
                              </span>
                            </div>

                            {/* STATUS */}
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground/60 sm:hidden">STATUS</span>
                              <Badge variant="outline" className={`${statusColors[peca.status]} text-[10px] px-1.5 h-4`}>
                                {statusLabels[peca.status]}
                              </Badge>
                            </div>

                            {/* TÉCNICO */}
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground/60 sm:hidden">TÉCNICO</span>
                              {nomeTecnico ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/5 border border-blue-500/10 max-w-full">
                                  <Users className="w-3 h-3 text-blue-400 shrink-0" />
                                  <span className="text-[10px] font-semibold text-blue-400 truncate uppercase tracking-tighter">
                                    {nomeTecnico}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/40 italic">Sem técnico</span>
                              )}
                            </div>

                            {/* AÇÕES (No Mobile aparece no final da linha) */}
                            <div className="flex items-center justify-end gap-2 pr-2">
                              {isDistribuida && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] border-primary/20 text-primary hover:bg-primary/10 transition-all active:scale-95"
                                  onClick={(e) => { e.stopPropagation(); openRemanejar(peca); }}
                                >
                                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                                  Remanejar
                                </Button>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild nativeButton={true}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditar(peca); }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-500 focus:text-red-500"
                                    onClick={(e) => { e.stopPropagation(); openExcluir(peca.id); }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredPecas.length === 0 && (
          <div className="p-12 text-center space-y-3 border border-border/50 rounded-lg bg-card/50">
            <div className="flex justify-center">
              <Search className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground">
              Nenhuma peça encontrada com os filtros selecionados.
            </p>
            {(searchTerm || statusFilter !== "TODOS") && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("TODOS");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-border/50 bg-card">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-full bg-primary/10">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Remanejar Peça</DialogTitle>
                  <DialogDescription className="font-mono text-xs mt-0.5">
                    {selectedPeca?.cod_produto} • {selectedPeca?.pca}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  Destino da Peça
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button" 
                    onClick={() => setDestino("ESTOQUE")}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      destino === "ESTOQUE" 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <Package className="w-6 h-6" />
                    <span className="text-sm font-semibold">Estoque Central</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setDestino(tecnicos[0]?.id || "")}
                    disabled={tecnicos.length === 0}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      destino !== "ESTOQUE" && destino !== "" 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
                    } ${tecnicos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="text-sm font-semibold">Técnico Externo</span>
                  </button>
                </div>
              </div>

              {destino !== "ESTOQUE" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Selecione o Técnico Responsável
                  </Label>
                  <Select value={destino} onValueChange={(val) => setDestino(val || "ESTOQUE")}>
                    <SelectTrigger className="w-full h-12 bg-muted/30 border-border/50 focus:ring-primary">
                      <SelectValue placeholder="Escolha um técnico da lista">
                        {destino && tecnicos.find(t => t.id === destino)?.nome}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tecnicos.map((t) => (
                        <SelectItem 
                          key={t.id} 
                          value={t.id}
                          disabled={t.id === selectedPeca?.tecnico_atual_id}
                          className="py-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{t.nome}</span>
                            {t.id === selectedPeca?.tecnico_atual_id && (
                              <span className="text-[10px] text-muted-foreground italic">(Responsável Atual)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-muted/30 border-t border-border/50 flex gap-3">
            <Button 
              variant="ghost" 
              className="flex-1 h-11"
              onClick={() => setIsSheetOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-[2] h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
              onClick={handleRemanejar}
              disabled={loading || (destino !== "ESTOQUE" && !destino)}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirmar Remanejamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditar}>
            <DialogHeader>
              <DialogTitle>Editar Peça</DialogTitle>
              <DialogDescription>
                Atualize as informações desta peça no sistema.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_cod_produto">Código do Produto</Label>
                <Input 
                  id="edit_cod_produto" 
                  value={editCodProduto}
                  onChange={(e) => setEditCodProduto(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_descricao">Descrição</Label>
                <Input 
                  id="edit_descricao" 
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_pca">PCA / Número de Série</Label>
                <Input 
                  id="edit_pca" 
                  value={editPca}
                  onChange={(e) => setEditPca(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluir}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
