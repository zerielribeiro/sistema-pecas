# PRD — Sistema de Gestão de Peças em Campo
**Versão:** 1.0  
**Stack:** Next.js 14 (App Router) + Supabase + Tailwind CSS + shadcn/ui  
**Foco:** Mobile-first, 90% uso em celular  
**Status:** Em planejamento

---

## 1. Objetivo

Desenvolver uma aplicação web mobile-first para controlar o ciclo de vida completo de peças de hardware distribuídas a técnicos de campo. O sistema garante rastreabilidade total, evidência fotográfica de uso, e controle de estoque distribuído entre múltiplos técnicos.

---

## 2. Problema

| Problema | Impacto |
|---|---|
| Falta de rastreabilidade das peças | Peças se perdem sem registro |
| Controle manual de estoque | Erros frequentes de inventário |
| Ausência de evidência fotográfica | Impossível auditar uso de peças |
| Peças DOA sem processo | Prejuízo sem devolução rastreada |
| Envio ao laboratório sem controle | Peças somem no processo |

---

## 3. Público-Alvo

### Técnico de campo (usuário primário — 90% do uso)
- Acessa pelo celular, em campo, muitas vezes com pressa
- Precisa dar baixa de peças com foto
- Precisa marcar peças defeituosas (DOA)
- Visualiza apenas seu próprio estoque

### Gestor / Supervisor (usuário secundário)
- Acessa pelo desktop ou celular
- Distribui e transfere peças entre técnicos
- Seleciona peças para envio ao laboratório
- Tem visão total do sistema

---

## 4. Estados da Peça (Máquina de Estados)

```
EM_ESTOQUE_EMPRESA
    │
    ├─[Gestor: Distribuir]──────────────► DISTRIBUIDA
    │                                          │
    │                              ┌───────────┤
    │                              │           │
    │                    [Técnico: Baixa]  [Técnico: DOA]
    │                              │           │
    │                              ▼           ▼
    │                          UTILIZADA      DOA
    │                              │           │
    │                      [Gestor: Selecionar para envio]
    │                              │           │
    │                              └─────┬─────┘
    │                                    ▼
    │                           AGUARDANDO_ENVIO
    │                                    │
    │                        [Gestor: Confirmar envio]
    │                                    ▼
    │                            ENVIADA_LAB
    │                                    │
    │                          [Gestor: Encerrar]
    │                                    ▼
    └──────────────────────────────  FINALIZADA
```

### Regras de transição (obrigatórias)

| De | Para | Quem | Requer |
|---|---|---|---|
| EM_ESTOQUE_EMPRESA | DISTRIBUIDA | Gestor | Selecionar técnico destino |
| DISTRIBUIDA | EM_ESTOQUE_EMPRESA | Gestor | Confirmação |
| DISTRIBUIDA | DISTRIBUIDA | Gestor | Técnico origem + técnico destino |
| DISTRIBUIDA | UTILIZADA | Técnico | Foto obrigatória + dados do atendimento |
| DISTRIBUIDA | DOA | Técnico | Foto obrigatória + motivo |
| UTILIZADA | AGUARDANDO_ENVIO | Gestor | Seleção em lote |
| DOA | AGUARDANDO_ENVIO | Gestor | Seleção em lote |
| AGUARDANDO_ENVIO | ENVIADA_LAB | Gestor | Confirmação de envio |
| ENVIADA_LAB | FINALIZADA | Gestor | Encerramento |

**Regras rígidas:**
- Técnico NÃO pode reverter status de peça
- Toda transição gera registro imutável em `movimentacoes`
- Foto é bloqueante: sem foto não finaliza baixa nem DOA
- Peça FINALIZADA não pode ser reativada

---

## 5. Modelo de Dados (Supabase / PostgreSQL)

### 5.1 Tabela `perfis`
```sql
id              UUID  PK FK → auth.users.id
nome            TEXT  NOT NULL
email           TEXT  UNIQUE NOT NULL
papel           ENUM  ('TECNICO', 'GESTOR') NOT NULL
ativo           BOOL  DEFAULT true
criado_em       TIMESTAMPTZ DEFAULT now()
```

### 5.2 Tabela `pecas`
```sql
id              UUID  PK DEFAULT gen_random_uuid()
tipo            TEXT  NOT NULL         -- ex: 'Memória RAM', 'SSD'
modelo          TEXT                   -- ex: 'Samsung 870 EVO 1TB'
tag             TEXT  UNIQUE NOT NULL  -- número de série / código único
status          ENUM  ('EM_ESTOQUE_EMPRESA','DISTRIBUIDA','UTILIZADA',
                       'DOA','AGUARDANDO_ENVIO','ENVIADA_LAB','FINALIZADA')
tecnico_atual_id UUID FK → perfis.id  -- NULL quando em estoque empresa
criado_em       TIMESTAMPTZ DEFAULT now()
atualizado_em   TIMESTAMPTZ DEFAULT now()
```

### 5.3 Tabela `atendimentos`
```sql
id               UUID  PK DEFAULT gen_random_uuid()
tecnico_id       UUID  FK → perfis.id NOT NULL
numero_chamado   TEXT  NOT NULL
local_atendimento TEXT NOT NULL
descricao        TEXT
data_atendimento TIMESTAMPTZ DEFAULT now()
criado_em        TIMESTAMPTZ DEFAULT now()
```

### 5.4 Tabela `atendimento_pecas` (pivot N:N)
```sql
id               UUID  PK DEFAULT gen_random_uuid()
atendimento_id   UUID  FK → atendimentos.id NOT NULL
peca_id          UUID  FK → pecas.id NOT NULL
foto_url         TEXT  NOT NULL  -- obrigatória, Supabase Storage
criado_em        TIMESTAMPTZ DEFAULT now()

UNIQUE(atendimento_id, peca_id)
```

### 5.5 Tabela `movimentacoes` (log imutável)
```sql
id                UUID  PK DEFAULT gen_random_uuid()
peca_id           UUID  FK → pecas.id NOT NULL
tipo              ENUM  ('DISTRIBUICAO','TRANSFERENCIA','BAIXA','DOA',
                         'ENVIO_LAB','FINALIZACAO','DEVOLUCAO')
status_anterior   TEXT  NOT NULL
status_novo       TEXT  NOT NULL
origem_id         UUID  FK → perfis.id  -- NULL = estoque empresa
destino_id        UUID  FK → perfis.id  -- NULL = estoque empresa
usuario_id        UUID  FK → perfis.id NOT NULL
observacao        TEXT
atendimento_id    UUID  FK → atendimentos.id  -- preenchido na baixa
criado_em         TIMESTAMPTZ DEFAULT now()
```

### 5.6 Tabela `doa_registros`
```sql
id          UUID  PK DEFAULT gen_random_uuid()
peca_id     UUID  FK → pecas.id NOT NULL
tecnico_id  UUID  FK → perfis.id NOT NULL
motivo      TEXT  NOT NULL
foto_url    TEXT  NOT NULL
criado_em   TIMESTAMPTZ DEFAULT now()
```

### 5.7 Índices importantes
```sql
CREATE INDEX idx_pecas_status ON pecas(status);
CREATE INDEX idx_pecas_tecnico ON pecas(tecnico_atual_id);
CREATE INDEX idx_movimentacoes_peca ON movimentacoes(peca_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(criado_em DESC);
CREATE INDEX idx_atendimentos_tecnico ON atendimentos(tecnico_id);
```

---

## 6. Cadastro de Peças — Estratégia de Entrada

**Recomendação:** Importação via CSV + cadastro manual pontual.

### 6.1 Importação CSV
- Gestor acessa `/admin/importar`
- Faz upload de CSV com colunas: `tipo, modelo, tag`
- Sistema valida duplicatas por `tag` antes de inserir
- Peças entram com status `EM_ESTOQUE_EMPRESA` automaticamente
- Exibe relatório: X inseridas, Y ignoradas (duplicatas)

### 6.2 Cadastro manual
- Gestor acessa `/admin/pecas/nova`
- Preenche tipo, modelo e tag manualmente
- Validação de unicidade da tag em tempo real

---

## 7. User Stories Detalhadas

### Módulo do Técnico

#### US-01 — Ver meu estoque
```
Como técnico,
quero ver todas as peças distribuídas para mim
para saber o que tenho disponível antes de ir a campo.

Critérios de aceite:
- Listagem mostra: tipo, modelo, tag da peça
- Filtrável por tipo de peça
- Busca por tag/modelo
- Status sempre "DISTRIBUIDA" (técnico nunca vê outros status)
- Carrega em menos de 2 segundos
```

#### US-02 — Registrar atendimento com baixa de peça
```
Como técnico,
quero registrar o uso de uma peça em um atendimento
para manter o estoque atualizado e comprovar o serviço.

Critérios de aceite:
- Passo 1: Preencher número do chamado e local do atendimento
- Passo 2: Selecionar peça(s) do meu estoque (pode ser mais de uma)
- Passo 3: Para cada peça, tirar foto da etiqueta/tag (câmera traseira)
- Passo 4: Adicionar descrição do serviço (opcional)
- Confirmar: status de cada peça muda para UTILIZADA
- Foto é obrigatória — botão de confirmar fica desabilitado sem foto
- Registro salvo em: atendimentos, atendimento_pecas, movimentacoes
```

#### US-03 — Marcar peça como DOA
```
Como técnico,
quero registrar uma peça recebida com defeito
para iniciar o processo de devolução.

Critérios de aceite:
- Selecionar peça do meu estoque
- Escolher motivo (lista + campo livre)
  Motivos: "Chegou fisicamente danificada", "Não funciona ao ligar",
           "Incompatível", "Errada", "Outro"
- Tirar foto da peça defeituosa (obrigatório)
- Status muda para DOA
- Registro em doa_registros e movimentacoes
```

#### US-04 — Ver histórico de uma peça
```
Como técnico,
quero ver o histórico de movimentações de uma peça do meu estoque
para entender o que já aconteceu com ela.

Critérios de aceite:
- Acessível ao tocar em uma peça na listagem
- Mostra linha do tempo de eventos
- Técnico vê apenas peças que já foram ou estão com ele
```

---

### Módulo do Gestor

#### US-05 — Distribuir peças para técnico
```
Como gestor,
quero distribuir peças do estoque central para um técnico
para que ele tenha recursos para atender em campo.

Critérios de aceite:
- Selecionar múltiplas peças (status EM_ESTOQUE_EMPRESA)
- Selecionar técnico destino
- Confirmar distribuição
- Status de cada peça muda para DISTRIBUIDA
- tecnico_atual_id preenchido
- Registro em movimentacoes com tipo DISTRIBUICAO
```

#### US-06 — Transferir peças entre técnicos
```
Como gestor,
quero mover peças de um técnico para outro
para rebalancear estoque de campo.

Critérios de aceite:
- Selecionar técnico de origem
- Ver peças DISTRIBUIDAS desse técnico
- Selecionar peça(s)
- Selecionar técnico destino
- Confirmar
- tecnico_atual_id atualizado
- Registro em movimentacoes com tipo TRANSFERENCIA
```

#### US-07 — Selecionar peças para envio ao laboratório
```
Como gestor,
quero selecionar peças utilizadas ou DOA para envio ao laboratório
para rastrear o processo de reparo/descarte.

Critérios de aceite:
- Listagem de todas as peças com status UTILIZADA e DOA
- Seleção múltipla
- Botão "Marcar para envio" → status vira AGUARDANDO_ENVIO
- Segunda ação "Confirmar envio" → status vira ENVIADA_LAB
- Registro em movimentacoes
```

#### US-08 — Encerrar peças
```
Como gestor,
quero encerrar o ciclo de vida de peças enviadas ao laboratório
para limpar o sistema de peças que não voltarão.

Critérios de aceite:
- Listagem de peças ENVIADA_LAB
- Ação de encerrar com campo de observação (destino: descarte, reparo concluído, etc.)
- Status muda para FINALIZADA
```

#### US-09 — Ver histórico completo de qualquer peça
```
Como gestor,
quero ver o histórico completo de movimentações de qualquer peça
para auditoria e rastreabilidade.

Critérios de aceite:
- Busca por tag da peça
- Linha do tempo completa: todos os status, quem executou, quando
- Visualização das fotos de evidência
- Exportação em PDF (fase 2)
```

#### US-10 — Cadastrar usuários
```
Como gestor,
quero cadastrar novos técnicos no sistema
para que eles possam acessar o app.

Critérios de aceite:
- Formulário: nome, email, papel (TECNICO ou GESTOR)
- Supabase Auth envia email de convite automaticamente
- Novo usuário define senha no primeiro acesso
- Gestor pode desativar usuários (ativo = false)
```

---

## 8. Arquitetura e Stack

### 8.1 Stack definida
```
Frontend:   Next.js 14 (App Router)
Backend:    Supabase (PostgreSQL + Auth + Storage + RLS)
Estilo:     Tailwind CSS + shadcn/ui
Deploy:     Vercel (frontend) + Supabase Cloud (backend)
```

### 8.2 Estrutura de pastas Next.js
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── primeiro-acesso/page.tsx
│   ├── (tecnico)/
│   │   ├── layout.tsx              ← guard: papel === TECNICO
│   │   ├── estoque/page.tsx        ← US-01
│   │   ├── atendimento/page.tsx    ← US-02
│   │   └── doa/page.tsx            ← US-03
│   ├── (gestor)/
│   │   ├── layout.tsx              ← guard: papel === GESTOR
│   │   ├── dashboard/page.tsx
│   │   ├── distribuir/page.tsx     ← US-05
│   │   ├── transferir/page.tsx     ← US-06
│   │   ├── laboratorio/page.tsx    ← US-07 + US-08
│   │   ├── pecas/page.tsx          ← visão geral + histórico
│   │   └── usuarios/page.tsx       ← US-10
│   ├── middleware.ts               ← proteção de rotas por papel
│   └── layout.tsx
├── components/
│   ├── ui/                         ← shadcn/ui components
│   ├── camera/                     ← CameraCapture component
│   ├── pecas/                      ← PecaCard, PecaList, StatusBadge
│   └── shared/                     ← BottomNav, Header, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← createBrowserClient
│   │   ├── server.ts               ← createServerClient
│   │   └── middleware.ts
│   ├── actions/                    ← Server Actions Next.js 14
│   │   ├── pecas.ts
│   │   ├── atendimentos.ts
│   │   └── movimentacoes.ts
│   └── types/
│       └── database.types.ts       ← gerado pelo Supabase CLI
└── hooks/
    ├── usePecas.ts
    └── useCamera.ts
```

### 8.3 Decisões de arquitetura mobile

| Decisão | Justificativa |
|---|---|
| Bottom navigation bar | Mais acessível com polegar em celular |
| Sheet (drawer) ao invés de modal | UX mais natural em mobile |
| `input capture="environment"` | Abre câmera traseira diretamente, sem biblioteca |
| Botões mínimo `h-14` (56px) | Área de toque confortável |
| Listas com swipe actions | Padrão mobile para ações secundárias |
| Toast no topo da tela | Visível sem cobrir conteúdo principal |
| Server Actions para mutations | Sem boilerplate de API routes |

### 8.4 Upload de fotos — estratégia
```typescript
// Fluxo recomendado para upload de imagens
// 1. Captura via input nativo (sem biblioteca)
// 2. Compressão client-side antes do upload
// 3. Upload direto para Supabase Storage

// Compressão antes do upload
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const MAX = 1200;
  const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
  canvas.width = bitmap.width * ratio;
  canvas.height = bitmap.height * ratio;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.82));
}

// Bucket: 'evidencias'
// Path: {tipo}/{peca_id}/{timestamp}.jpg
// tipos: 'uso' | 'doa'
```

---

## 9. Segurança — Row Level Security (RLS)

### Políticas obrigatórias

```sql
-- Técnicos veem apenas suas próprias peças
CREATE POLICY "tecnico_ver_proprias_pecas" ON pecas
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM perfis WHERE papel = 'GESTOR'
    )
    OR tecnico_atual_id = auth.uid()
  );

-- Técnicos só atualizam peças do próprio estoque (status DISTRIBUIDA)
CREATE POLICY "tecnico_atualizar_proprias_pecas" ON pecas
  FOR UPDATE USING (
    tecnico_atual_id = auth.uid()
    AND status = 'DISTRIBUIDA'
  );

-- Gestores têm acesso total
CREATE POLICY "gestor_acesso_total_pecas" ON pecas
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM perfis WHERE papel = 'GESTOR'
    )
  );

-- Técnicos veem apenas seus atendimentos
CREATE POLICY "tecnico_ver_proprios_atendimentos" ON atendimentos
  FOR SELECT USING (tecnico_id = auth.uid());

-- Movimentações: somente leitura para técnicos (apenas as suas)
CREATE POLICY "tecnico_ver_proprias_movimentacoes" ON movimentacoes
  FOR SELECT USING (
    origem_id = auth.uid() OR destino_id = auth.uid()
  );

-- Gestores leem tudo
CREATE POLICY "gestor_ver_tudo" ON movimentacoes
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM perfis WHERE papel = 'GESTOR')
  );
```

### Regra de negócio via função PostgreSQL (transação atômica)

```sql
-- Função para dar baixa: atualiza peça + insere movimentação atomicamente
CREATE OR REPLACE FUNCTION registrar_baixa(
  p_peca_id UUID,
  p_atendimento_id UUID,
  p_usuario_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE pecas
    SET status = 'UTILIZADA', tecnico_atual_id = NULL, atualizado_em = now()
    WHERE id = p_peca_id AND status = 'DISTRIBUIDA' AND tecnico_atual_id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não disponível para baixa';
  END IF;

  INSERT INTO movimentacoes (peca_id, tipo, status_anterior, status_novo,
                              origem_id, usuario_id, atendimento_id)
    VALUES (p_peca_id, 'BAIXA', 'DISTRIBUIDA', 'UTILIZADA',
            p_usuario_id, p_usuario_id, p_atendimento_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 10. Componentes de UI Críticos

### 10.1 CameraCapture
```
Comportamento:
- Exibe preview da câmera ou foto já tirada
- Botão grande centralizado para capturar
- Ao capturar: mostra thumbnail + botão "Refazer"
- Comprime antes de enviar
- Feedback de loading durante upload
- Fallback: botão de upload de arquivo (galeria)

Uso: Obrigatório na tela de baixa e na tela de DOA
```

### 10.2 PecaCard (mobile)
```
Layout:
┌─────────────────────────────────┐
│ [tipo]            [DISTRIBUIDA] │
│ Samsung 870 EVO 1TB             │
│ TAG: SN-20240315-001            │
│                         [>]     │
└─────────────────────────────────┘
Toque no card → abre Sheet com detalhes + ações
```

### 10.3 BottomNav (técnico)
```
[Estoque]  [Atendimento]  [DOA]
  (home)      (+)          (!)
```

### 10.4 StatusBadge
```
EM_ESTOQUE_EMPRESA → cinza
DISTRIBUIDA        → azul
UTILIZADA          → verde
DOA                → vermelho
AGUARDANDO_ENVIO   → amarelo
ENVIADA_LAB        → laranja
FINALIZADA         → cinza escuro
```

---

## 11. Fluxo de Telas — Técnico

```
Login
  └─► Home (Meu Estoque)
        ├─► Detalhe da Peça
        │     └─► Histórico da Peça
        ├─► Novo Atendimento (FAB)
        │     ├─► Passo 1: Dados do atendimento
        │     │     (número chamado, local)
        │     ├─► Passo 2: Selecionar peça(s)
        │     ├─► Passo 3: Foto da etiqueta
        │     │     (uma foto por peça)
        │     └─► Passo 4: Confirmação + Finalizar
        └─► Registrar DOA
              ├─► Selecionar peça
              ├─► Motivo
              ├─► Foto da peça
              └─► Confirmar
```

---

## 12. Fluxo de Telas — Gestor

```
Login
  └─► Dashboard
        ├─► Peças (visão geral + filtros)
        │     └─► Detalhe + histórico completo
        ├─► Distribuir
        │     ├─► Selecionar peças do estoque
        │     ├─► Selecionar técnico destino
        │     └─► Confirmar
        ├─► Transferir
        │     ├─► Selecionar técnico origem
        │     ├─► Selecionar peças
        │     ├─► Selecionar técnico destino
        │     └─► Confirmar
        ├─► Laboratório
        │     ├─► Lista UTILIZADA + DOA
        │     ├─► Selecionar lote → AGUARDANDO_ENVIO
        │     └─► Confirmar envio → ENVIADA_LAB
        └─► Usuários
              ├─► Listar técnicos
              ├─► Convidar novo
              └─► Desativar
```

---

## 13. Requisitos Não Funcionais

| Requisito | Meta |
|---|---|
| Performance — operações críticas | < 2 segundos |
| Performance — upload de foto | < 5 segundos em 4G |
| Responsividade | 320px a 2560px sem quebras |
| Tamanho mínimo de toque | 44px (WCAG AA) |
| Autenticação | Supabase Auth com JWT |
| Sessão | Persistente (refresh token) |
| Concorrência | Transações atômicas via funções PG |
| Imagens comprimidas | Máximo 300KB por foto após compressão |

---

## 14. Priorização

### MUST — MVP (Fase 1)
- [ ] Autenticação e controle de acesso por papel
- [ ] Cadastro de peças (manual + CSV)
- [ ] Distribuição de peças para técnicos
- [ ] Transferência entre técnicos
- [ ] Baixa de peça com foto obrigatória
- [ ] Marcação de DOA com foto e motivo
- [ ] Visualização do estoque pessoal (técnico)
- [ ] RLS completo no Supabase
- [ ] Log de movimentações (automático)

### SHOULD — Fase 2
- [ ] Fluxo completo de envio ao laboratório
- [ ] Histórico visual de movimentações (timeline)
- [ ] Busca e filtros avançados de peças
- [ ] Dashboard do gestor com métricas básicas
- [ ] Importação CSV de peças

### COULD — Fase 3
- [ ] Dashboard com KPIs (peças por status, por técnico)
- [ ] Notificações (peças DOA há muito tempo, estoque baixo)
- [ ] Exportação de relatórios em PDF
- [ ] Leitura de QR Code / código de barras pela câmera
- [ ] PWA com suporte offline básico

---

## 15. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Falha de upload em campo (rede ruim) | Alta | Alto | Retry automático + compressão + feedback visual |
| Dois gestores movimentando mesma peça | Média | Alto | Transação atômica via função PostgreSQL |
| Técnico sem acesso à internet | Alta | Médio | Mensagem clara de erro + dados em rascunho local (fase 3) |
| Foto não abre câmera no iOS | Baixa | Alto | Fallback para galeria + teste em Safari/iOS obrigatório |
| Supabase fora do ar | Muito Baixa | Alto | Monitoramento via Supabase status + alerta no app |

---

## 16. Critérios de Sucesso

- 100% das peças com status e localização conhecidos em tempo real
- Zero peças com status desconhecido após 30 dias de uso
- Técnicos completam baixa de peça em menos de 2 minutos
- Taxa de adoção > 95% da equipe de técnicos em 30 dias
- Zero erros de concorrência de dados em produção

---

## 17. Glossário

| Termo | Definição |
|---|---|
| Tag | Identificador único físico da peça (número de série, código) |
| Baixa | Ato de registrar o uso de uma peça em um atendimento |
| DOA | Dead on Arrival — peça recebida com defeito |
| Movimentação | Qualquer transição de estado de uma peça (log imutável) |
| Distribuição | Envio de peça do estoque central para um técnico |
| Transferência | Movimentação de peça entre dois técnicos |
| Estoque empresa | Peças disponíveis centralmente, sem técnico associado |
