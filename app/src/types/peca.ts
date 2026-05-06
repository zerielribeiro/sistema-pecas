export interface PecaBase {
  id: string;
  cod_produto: string;
  descricao: string | null;
  pca: string;
  bem_de_consumo?: boolean;
}

export interface PecaCompleta extends PecaBase {
  status: string;
  atualizado_em: string | null;
  tecnico: { nome: string } | { nome: string }[] | null;
  tecnico_atual_id: string | null;
}

export interface PecaSolicitacao extends PecaBase {
  criado_em: string;
}

export interface FotoItem {
  file: File;
  preview: string;
}
