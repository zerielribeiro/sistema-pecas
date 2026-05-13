export const STATUS_COLORS: Record<string, string> = {
  EM_ESTOQUE_EMPRESA: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  DISTRIBUIDA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  UTILIZADA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DOA: "bg-red-500/15 text-red-400 border-red-500/30",
  AGUARDANDO_ENVIO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ENVIADA_LAB: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  FINALIZADA: "bg-stone-500/15 text-stone-400 border-stone-500/30",
  DEVOLVIDA_NOVA: "bg-teal-500/15 text-teal-400 border-teal-500/30",
};

export const STATUS_LABELS: Record<string, string> = {
  EM_ESTOQUE_EMPRESA: "Estoque",
  DISTRIBUIDA: "Com Técnico",
  UTILIZADA: "Utilizada",
  DOA: "DOA",
  AGUARDANDO_ENVIO: "DOA - Aguard. Envio",
  ENVIADA_LAB: "DOA - No Lab",
  FINALIZADA: "Finalizada",
  DEVOLVIDA_NOVA: "Devolvida (Nova)",
};
