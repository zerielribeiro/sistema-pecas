import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ArrowRightLeft, AlertTriangle, Clock, LayoutDashboard, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { SolicitacoesPanel } from "./solicitacoes-panel";

interface PecaInfo {
  id: string;
  cod_produto: string;
  descricao: string | null;
  pca: string;
}

interface Solicitacao {
  id: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  pecas: PecaInfo | null;
  tecnico: {
    id: string;
    nome: string;
  } | null;
}

interface ActivityItem {
  id: string;
  criado_em: string;
  de_status: string;
  para_status: string;
  pecas: {
    descricao: string | null;
    pca: string;
  } | null;
  perfis: {
    nome: string;
  } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // KPIs
  const { data: pecas } = await supabase.from("pecas").select("status");
  const { data: tecnicos } = await supabase
    .from("perfis")
    .select("id")
    .eq("papel", "TECNICO")
    .eq("ativo", true);

  // Solicitações pendentes dos técnicos
  const { data: solicitacoes } = await supabase
    .from("solicitacoes_pecas")
    .select(`
      id,
      status,
      observacao,
      criado_em,
      pecas (id, cod_produto, descricao, pca),
      tecnico:perfis!solicitacoes_pecas_tecnico_id_fkey (id, nome)
    `)
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: true });

  const processedSolicitacoes = (solicitacoes as any[])?.map(s => ({
    ...s,
    pecas: Array.isArray(s.pecas) ? s.pecas[0] : s.pecas,
    tecnico: Array.isArray(s.tecnico) ? s.tecnico[0] : s.tecnico,
  })) as Solicitacao[];

  // Recent Activity
  const { data: recentActivity } = await supabase
    .from("movimentacoes")
    .select(`
      id,
      criado_em,
      de_status,
      para_status,
      pecas (descricao, pca),
      perfis (nome)
    `)
    .order("criado_em", { ascending: false })
    .limit(5);

  const activities = (recentActivity as any[])?.map((activity) => ({
    ...activity,
    pecas: Array.isArray(activity.pecas) ? activity.pecas[0] : activity.pecas,
    perfis: Array.isArray(activity.perfis) ? activity.perfis[0] : activity.perfis
  })) as ActivityItem[];

  const emEstoque = pecas?.filter((p) => p.status === "EM_ESTOQUE_EMPRESA").length || 0;
  const distribuidas = pecas?.filter((p) => p.status === "DISTRIBUIDA").length || 0;
  const pendentesReceber = pecas?.filter((p) => ["DOA", "UTILIZADA"].includes(p.status)).length || 0;
  const emLaboratorio = pecas?.filter((p) => ["AGUARDANDO_ENVIO", "ENVIADA_LAB"].includes(p.status)).length || 0;

  const kpis = [
    { label: "Estoque Central", value: emEstoque, icon: <Package className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Com Técnicos", value: distribuidas, icon: <Users className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/10" },
    { label: "Receber (DOA/BAIXA)", value: pendentesReceber, icon: <ArrowRightLeft className="w-4 h-4" />, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Peças em RMA", value: emLaboratorio, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const pendentesCount = solicitacoes?.length || 0;

  return (
    <div className="p-3 space-y-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 text-primary">
          <LayoutDashboard className="w-4 h-4" />
          <h2 className="text-lg font-bold tracking-tight">Dashboard</h2>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
          {tecnicos?.length || 0} técnicos ativos
        </p>
      </div>

      {/* Bento KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={cn(
            "border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all col-span-1"
          )}>
            <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={cn("p-1 rounded-md", kpi.bg, kpi.color)}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl md:text-3xl font-black tabular-nums tracking-tighter", kpi.color)}>
                  {kpi.value}
                </span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase">un</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Solicitações de Peças ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5" />
            Solicitações de Peças
            {pendentesCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[9px] font-black text-white">
                {pendentesCount}
              </span>
            )}
          </h3>
        </div>
        <SolicitacoesPanel solicitacoes={processedSolicitacoes ?? []} />
      </div>

      {/* Recent Activity Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Atividade Recente
          </h3>
          <Link href="/gestor/historico" className="text-[10px] font-bold text-primary hover:underline">
            VER TUDO
          </Link>
        </div>

        <div className="space-y-2">
          {activities && activities.length > 0 ? (
            activities.map((activity: ActivityItem) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border/40">
                  {activity.para_status === 'UTILIZADA' ? (
                    <Package className="w-4 h-4 text-emerald-500" />
                  ) : activity.para_status === 'DISTRIBUIDA' ? (
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                  ) : activity.para_status === 'DOA' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Package className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">
                      {activity.pecas?.descricao || 'Peça Desconhecida'}
                    </p>
                    <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    <span className="font-semibold text-foreground">{activity.perfis?.nome}</span> →{" "}
                    <span className={cn(
                      "ml-1 font-bold",
                      activity.para_status === 'UTILIZADA' ? 'text-emerald-500' :
                      activity.para_status === 'DISTRIBUIDA' ? 'text-primary' :
                      activity.para_status === 'DOA' ? 'text-red-500' : 'text-foreground'
                    )}>
                      {activity.para_status?.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-border/40 rounded-2xl">
              <Clock className="w-6 h-6 text-muted-foreground/30 mb-1" />
              <p className="text-xs font-medium text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

