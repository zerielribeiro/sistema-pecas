# Plano de Implementação - Fase 2: Refinamento e Estabilização

## Objetivo
Refinar a interface do usuário, melhorar a rastreabilidade (exibição de técnicos) e consolidar as mudanças de navegação iniciadas na Fase 1.

## Tarefas

### 1. Refinamento de UI - Inventário (`PecasClient`)
- [x] Alterar o layout da lista expandida (Accordion) para grade horizontal.
- [x] Melhorar a visibilidade do nome do técnico em itens individuais e expandidos.
- [x] Alinhar colunas (PCA, Código, Descrição, Status, Técnico) para facilitar a leitura.

### 2. Refinamento de UX - Distribuição (`DistribuirClient`)
- [x] Validar a lógica de "Limpar Seleção" ao clicar no card do técnico.
- [x] Adicionar animações sutis na entrada/saída de itens selecionados.
- [x] Garantir que o botão de execução fique desabilitado sem técnico selecionado.

### 3. Navegação e Shell
- [x] Confirmar se o link "Peças DOA" no `GestorShell` aponta corretamente para `/gestor/laboratorio`.
- [x] Ajustar cores e ícones para manter a consistência visual "Premium".

### 4. Correção "Leitora ICM"
- [x] Investigar por que o técnico "Sérgio" (ou outro) pode não estar aparecendo em certas visualizações.
- [x] Garantir que o join de `tecnico_atual_id` esteja presente em todas as queries relevantes.

## Critérios de Aceitação (UAT)
1. Ao expandir um grupo de peças, as informações devem estar alinhadas horizontalmente.
2. O nome do técnico deve ser visível em todas as peças que não estão em estoque.
3. Clicar no técnico selecionado na tela de distribuição deve limpar a seleção.
4. O menu lateral deve permitir navegação fluida entre todos os módulos.
