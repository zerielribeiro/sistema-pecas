# SKILL — Sistema de Gestão de Peças em Campo
**Stack:** Next.js 15 (App Router) + Supabase + Tailwind CSS + shadcn/ui  
**PRD de referência:** PRD.md  


---

## Como usar esta skill

Esta skill orienta desenvolvedores (frontend e backend) na construção do Sistema de Gestão de Peças. Cada seção é autocontida — leia a seção relevante para a tarefa que está executando. Sempre consulte o PRD.md para regras de negócio.

---

## PARTE 1 — BACKEND (Supabase)

### 1.1 Setup inicial do projeto

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Inicializar no projeto
supabase init

# Variáveis de ambiente (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # apenas server-side
```

### 1.2 Tipos gerados automaticamente

```bash
# Após criar as tabelas no Supabase
supabase gen types typescript --project-id=SEU_PROJECT_ID > src/lib/types/database.types.ts
```

Usar **sempre** os tipos gerados. Nunca criar interfaces manualmente para o banco.

### 1.3 Clientes Supabase — padrão obrigatório

```typescript
// src/lib/supabase/client.ts — para uso em Client Components
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts — para uso em Server Components e Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options))
      }
    }
  )
}
```

```typescript
// src/middleware.ts — proteger todas as rotas autenticadas
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(),
      setAll: (cs) => cs.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)) } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && !path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: perfil } = await supabase
      .from('perfis').select('papel').eq('id', user.id).single()

    if (path.startsWith('/gestor') && perfil?.papel !== 'GESTOR') {
      return NextResponse.redirect(new URL('/tecnico/estoque', request.url))
    }
    if (path.startsWith('/tecnico') && perfil?.papel !== 'TECNICO') {
      return NextResponse.redirect(new URL('/gestor/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)']
}
```

### 1.4 Server Actions — padrão para mutations

Todas as operações de escrita devem ser Server Actions. Nunca criar API Routes para mutations.

```typescript
// src/lib/actions/pecas.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Distribuir peças para técnico (gestor)
export async function distribuirPecas(
  pecaIds: string[],
  tecnicoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verifica se o usuário é gestor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('perfis').select('papel').eq('id', user.id).single()
  if (perfil?.papel !== 'GESTOR') return { error: 'Sem permissão' }

  // Atualização em transação via função PostgreSQL
  const { error } = await supabase.rpc('distribuir_pecas_lote', {
    p_peca_ids: pecaIds,
    p_tecnico_id: tecnicoId,
    p_gestor_id: user.id
  })

  if (error) return { error: error.message }
  revalidatePath('/gestor/distribuir')
  revalidatePath('/gestor/pecas')
  return {}
}

// Registrar DOA (técnico)
export async function registrarDOA(formData: {
  pecaId: string
  motivo: string
  fotoUrl: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.rpc('registrar_doa', {
    p_peca_id: formData.pecaId,
    p_tecnico_id: user.id,
    p_motivo: formData.motivo,
    p_foto_url: formData.fotoUrl
  })

  if (error) return { error: error.message }
  revalidatePath('/tecnico/estoque')
  return {}
}
```

### 1.5 Queries — padrão de leitura

```typescript
// src/lib/queries/pecas.ts

// Em Server Components: query direta com supabase server
export async function getPecasByTecnico(tecnicoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pecas')
    .select('id, tipo, modelo, tag, status, criado_em')
    .eq('tecnico_atual_id', tecnicoId)
    .eq('status', 'DISTRIBUIDA')
    .order('criado_em', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

// Histórico completo de uma peça
export async function getHistoricoPeca(pecaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      id, tipo, status_anterior, status_novo, observacao, criado_em,
      perfis_origem:origem_id(nome),
      perfis_destino:destino_id(nome),
      perfis_usuario:usuario_id(nome)
    `)
    .eq('peca_id', pecaId)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
```

### 1.6 Upload de foto — padrão completo

```typescript
// src/lib/storage/fotos.ts
import { createClient } from '@/lib/supabase/client'

// Compressão antes do upload (client-side)
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const MAX = 1200
  const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1)
  canvas.width  = Math.round(bitmap.width  * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.82))
}

// Upload com retry automático (3 tentativas)
export async function uploadFotoEvidencia(
  file: File,
  pecaId: string,
  tipo: 'uso' | 'doa'
): Promise<string> {
  const supabase = createClient()
  const blob = await compressImage(file)
  const path = `${tipo}/${pecaId}/${Date.now()}.jpg`

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from('evidencias')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

    if (!error) {
      const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
      return data.publicUrl
    }

    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
    else throw new Error(`Upload falhou após 3 tentativas: ${error.message}`)
  }
  throw new Error('Upload falhou')
}
```

---

## PARTE 2 — FRONTEND (Next.js + Tailwind + shadcn/ui)

### 2.1 Princípios mobile-first obrigatórios

```
✅ Sempre mobile primeiro, depois md: lg:
✅ min-h-[44px] em todos os elementos tocáveis (WCAG)
✅ Usar Sheet (drawer bottom) ao invés de Dialog em mobile
✅ Usar input capture="environment" para câmera traseira
✅ Feedback visual imediato em todas as ações
✅ Loading states em todas as operações assíncronas
✅ Mensagens de erro inline, nunca só no console

❌ Nunca usar hover-only interactions sem fallback touch
❌ Nunca font-size < 16px em inputs (evita zoom no iOS)
❌ Nunca usar position: fixed com transform (bug iOS Safari)
❌ Nunca usar 100vh sem fallback (bug iOS Safari — usar 100dvh)
```

### 2.2 Componente CameraCapture

```tsx
// src/components/camera/CameraCapture.tsx
'use client'

import { useRef, useState } from 'react'
import { Camera, RotateCcw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  label?: string
  obrigatorio?: boolean
  disabled?: boolean
}

export function CameraCapture({
  onCapture,
  label = 'Foto da etiqueta',
  obrigatorio = true,
  disabled = false
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setPreview(URL.createObjectURL(file))
    onCapture(file)
  }

  function handleRefazer() {
    setPreview(null)
    setFileName('')
    // Reseta o input para permitir selecionar a mesma foto
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="ml-1 text-red-500">*</span>}
      </label>

      {!preview ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-3",
            "min-h-[180px] w-full rounded-xl border-2 border-dashed",
            "border-gray-300 bg-gray-50 transition-colors",
            !disabled && "cursor-pointer hover:border-blue-400 hover:bg-blue-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Camera className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Tirar foto</p>
            <p className="text-xs text-gray-400">ou selecionar da galeria</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"  // ← abre câmera traseira no mobile
            className="sr-only"
            onChange={handleChange}
            disabled={disabled}
            aria-label={label}
          />
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview da foto capturada"
            className="w-full object-cover max-h-[300px]"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-2 right-2 gap-1.5 shadow"
            onClick={handleRefazer}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refazer
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 2.3 Componente StatusBadge

```tsx
// src/components/pecas/StatusBadge.tsx
import { cn } from '@/lib/utils'

type Status =
  | 'EM_ESTOQUE_EMPRESA'
  | 'DISTRIBUIDA'
  | 'UTILIZADA'
  | 'DOA'
  | 'AGUARDANDO_ENVIO'
  | 'ENVIADA_LAB'
  | 'FINALIZADA'

const CONFIG: Record<Status, { label: string; className: string }> = {
  EM_ESTOQUE_EMPRESA: { label: 'Em estoque',        className: 'bg-gray-100 text-gray-700' },
  DISTRIBUIDA:        { label: 'Distribuída',        className: 'bg-blue-100 text-blue-700' },
  UTILIZADA:          { label: 'Utilizada',           className: 'bg-green-100 text-green-700' },
  DOA:                { label: 'DOA',                 className: 'bg-red-100 text-red-700' },
  AGUARDANDO_ENVIO:   { label: 'Aguard. envio',      className: 'bg-yellow-100 text-yellow-700' },
  ENVIADA_LAB:        { label: 'No laboratório',     className: 'bg-orange-100 text-orange-700' },
  FINALIZADA:         { label: 'Finalizada',          className: 'bg-gray-200 text-gray-500' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      className
    )}>
      {label}
    </span>
  )
}
```

### 2.4 Componente PecaCard (mobile)

```tsx
// src/components/pecas/PecaCard.tsx
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { Database } from '@/lib/types/database.types'

type Peca = Database['public']['Tables']['pecas']['Row']

interface PecaCardProps {
  peca: Peca
  onClick: () => void
}

export function PecaCard({ peca, onClick }: PecaCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4
                 shadow-sm transition-all active:scale-[0.98] active:shadow-none
                 hover:border-blue-300 hover:shadow-md min-h-[76px]"
      aria-label={`Peça ${peca.tipo} - ${peca.tag}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{peca.tipo}</span>
            <StatusBadge status={peca.status as any} />
          </div>
          {peca.modelo && (
            <p className="text-sm text-gray-600 mt-0.5 truncate">{peca.modelo}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 font-mono">TAG: {peca.tag}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
      </div>
    </button>
  )
}
```

### 2.5 Fluxo de Atendimento — componente de steps

```tsx
// src/app/(tecnico)/atendimento/page.tsx
// Padrão de multi-step form para mobile
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'dados' | 'pecas' | 'fotos' | 'confirmar'

const STEPS: Step[] = ['dados', 'pecas', 'fotos', 'confirmar']
const STEP_LABELS: Record<Step, string> = {
  dados:    '1. Dados',
  pecas:    '2. Peças',
  fotos:    '3. Fotos',
  confirmar:'4. Confirmar'
}

export default function AtendimentoPage() {
  const [step, setStep] = useState<Step>('dados')
  const [form, setForm] = useState({
    numeroChamado: '',
    localAtendimento: '',
    descricao: '',
    pecasSelecionadas: [] as string[],
    fotos: {} as Record<string, File>
  })

  // Indicador de progresso mobile-friendly
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                STEPS.indexOf(step) >= i ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">{STEP_LABELS[step]}</p>
      </div>

      {/* Conteúdo do step atual */}
      <div className="p-4">
        {step === 'dados'    && <StepDados    form={form} setForm={setForm} />}
        {step === 'pecas'    && <StepPecas    form={form} setForm={setForm} />}
        {step === 'fotos'    && <StepFotos    form={form} setForm={setForm} />}
        {step === 'confirmar'&& <StepConfirmar form={form} />}
      </div>

      {/* Navegação fixa no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="flex gap-3">
          {step !== 'dados' && (
            <button
              onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])}
              className="flex-1 min-h-[52px] rounded-xl border border-gray-300
                         text-gray-700 font-medium text-sm"
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => {
              const nextIndex = STEPS.indexOf(step) + 1
              if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
            }}
            className="flex-1 min-h-[52px] rounded-xl bg-blue-600 text-white
                       font-medium text-sm disabled:opacity-50"
          >
            {step === 'confirmar' ? 'Finalizar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 2.6 Bottom Navigation (técnico)

```tsx
// src/components/shared/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ClipboardCheck, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/tecnico/estoque',    label: 'Estoque',     icon: Package },
  { href: '/tecnico/atendimento',label: 'Atendimento', icon: ClipboardCheck },
  { href: '/tecnico/doa',        label: 'DOA',         icon: AlertTriangle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200
                    safe-area-bottom">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 min-h-[60px]",
                "text-xs transition-colors gap-1",
                active ? "text-blue-600" : "text-gray-500"
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className="font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

### 2.7 Feedback de ações — padrão de UX

```tsx
// Sempre use este padrão para ações assíncronas no mobile

// ✅ CORRETO: feedback imediato, loading, erro inline
const [loading, setLoading] = useState(false)
const [erro, setErro] = useState<string | null>(null)

async function handleAction() {
  setLoading(true)
  setErro(null)
  try {
    const result = await minhaAction(dados)
    if (result.error) {
      setErro(result.error)
    } else {
      toast.success('Operação realizada com sucesso!')
      router.push('/destino')
    }
  } catch {
    setErro('Erro inesperado. Tente novamente.')
  } finally {
    setLoading(false)
  }
}

// Botão com estado de loading
<button
  onClick={handleAction}
  disabled={loading}
  className="w-full min-h-[52px] rounded-xl bg-blue-600 text-white
             font-medium disabled:opacity-60 flex items-center justify-center gap-2"
>
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Salvando...
    </>
  ) : 'Confirmar'}
</button>

// Erro inline (nunca só no console)
{erro && (
  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
    {erro}
  </div>
)}
```

---

## PARTE 3 — BANCO DE DADOS (SQL completo)

### 3.1 Migrations (executar em ordem)

```sql
-- 001_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 002_enums.sql
CREATE TYPE status_peca AS ENUM (
  'EM_ESTOQUE_EMPRESA','DISTRIBUIDA','UTILIZADA',
  'DOA','AGUARDANDO_ENVIO','ENVIADA_LAB','FINALIZADA'
);
CREATE TYPE papel_usuario AS ENUM ('TECNICO', 'GESTOR');
CREATE TYPE tipo_movimentacao AS ENUM (
  'DISTRIBUICAO','TRANSFERENCIA','BAIXA','DOA',
  'ENVIO_LAB','FINALIZACAO','DEVOLUCAO'
);

-- 003_tables.sql
CREATE TABLE perfis (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  papel       papel_usuario NOT NULL,
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pecas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              TEXT NOT NULL,
  modelo            TEXT,
  tag               TEXT UNIQUE NOT NULL,
  status            status_peca NOT NULL DEFAULT 'EM_ESTOQUE_EMPRESA',
  tecnico_atual_id  UUID REFERENCES perfis(id),
  criado_em         TIMESTAMPTZ DEFAULT now(),
  atualizado_em     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE atendimentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id        UUID NOT NULL REFERENCES perfis(id),
  numero_chamado    TEXT NOT NULL,
  local_atendimento TEXT NOT NULL,
  descricao         TEXT,
  data_atendimento  TIMESTAMPTZ DEFAULT now(),
  criado_em         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE atendimento_pecas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  UUID NOT NULL REFERENCES atendimentos(id),
  peca_id         UUID NOT NULL REFERENCES pecas(id),
  foto_url        TEXT NOT NULL,
  criado_em       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(atendimento_id, peca_id)
);

CREATE TABLE movimentacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id         UUID NOT NULL REFERENCES pecas(id),
  tipo            tipo_movimentacao NOT NULL,
  status_anterior TEXT NOT NULL,
  status_novo     TEXT NOT NULL,
  origem_id       UUID REFERENCES perfis(id),
  destino_id      UUID REFERENCES perfis(id),
  usuario_id      UUID NOT NULL REFERENCES perfis(id),
  observacao      TEXT,
  atendimento_id  UUID REFERENCES atendimentos(id),
  criado_em       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE doa_registros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id     UUID NOT NULL REFERENCES pecas(id),
  tecnico_id  UUID NOT NULL REFERENCES perfis(id),
  motivo      TEXT NOT NULL,
  foto_url    TEXT NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

-- 004_indexes.sql
CREATE INDEX idx_pecas_status    ON pecas(status);
CREATE INDEX idx_pecas_tecnico   ON pecas(tecnico_atual_id);
CREATE INDEX idx_mov_peca        ON movimentacoes(peca_id);
CREATE INDEX idx_mov_data        ON movimentacoes(criado_em DESC);
CREATE INDEX idx_atend_tecnico   ON atendimentos(tecnico_id);
```

### 3.2 Funções PostgreSQL (transações atômicas)

```sql
-- 005_functions.sql

-- Registrar baixa de peça (atômico)
CREATE OR REPLACE FUNCTION registrar_baixa(
  p_peca_id         UUID,
  p_atendimento_id  UUID,
  p_foto_url        TEXT,
  p_usuario_id      UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pecas
    SET status = 'UTILIZADA',
        tecnico_atual_id = NULL,
        atualizado_em = now()
    WHERE id = p_peca_id
      AND status = 'DISTRIBUIDA'
      AND tecnico_atual_id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não disponível para baixa. Verifique o status.';
  END IF;

  INSERT INTO atendimento_pecas (atendimento_id, peca_id, foto_url)
    VALUES (p_atendimento_id, p_peca_id, p_foto_url);

  INSERT INTO movimentacoes (peca_id, tipo, status_anterior, status_novo,
                              origem_id, usuario_id, atendimento_id)
    VALUES (p_peca_id, 'BAIXA', 'DISTRIBUIDA', 'UTILIZADA',
            p_usuario_id, p_usuario_id, p_atendimento_id);
END;
$$;

-- Registrar DOA (atômico)
CREATE OR REPLACE FUNCTION registrar_doa(
  p_peca_id     UUID,
  p_tecnico_id  UUID,
  p_motivo      TEXT,
  p_foto_url    TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pecas
    SET status = 'DOA',
        tecnico_atual_id = NULL,
        atualizado_em = now()
    WHERE id = p_peca_id
      AND status = 'DISTRIBUIDA'
      AND tecnico_atual_id = p_tecnico_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não pode ser marcada como DOA. Verifique o status.';
  END IF;

  INSERT INTO doa_registros (peca_id, tecnico_id, motivo, foto_url)
    VALUES (p_peca_id, p_tecnico_id, p_motivo, p_foto_url);

  INSERT INTO movimentacoes (peca_id, tipo, status_anterior, status_novo,
                              origem_id, usuario_id)
    VALUES (p_peca_id, 'DOA', 'DISTRIBUIDA', 'DOA', p_tecnico_id, p_tecnico_id);
END;
$$;

-- Distribuir lote de peças para técnico (atômico)
CREATE OR REPLACE FUNCTION distribuir_pecas_lote(
  p_peca_ids   UUID[],
  p_tecnico_id UUID,
  p_gestor_id  UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_peca_id UUID;
BEGIN
  FOREACH p_peca_id IN ARRAY p_peca_ids LOOP
    UPDATE pecas
      SET status = 'DISTRIBUIDA',
          tecnico_atual_id = p_tecnico_id,
          atualizado_em = now()
      WHERE id = p_peca_id
        AND status = 'EM_ESTOQUE_EMPRESA';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Peça % não disponível para distribuição.', p_peca_id;
    END IF;

    INSERT INTO movimentacoes (peca_id, tipo, status_anterior, status_novo,
                                destino_id, usuario_id)
      VALUES (p_peca_id, 'DISTRIBUICAO', 'EM_ESTOQUE_EMPRESA', 'DISTRIBUIDA',
              p_tecnico_id, p_gestor_id);
  END LOOP;
END;
$$;
```

### 3.3 Row Level Security

```sql
-- 006_rls.sql
ALTER TABLE perfis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doa_registros  ENABLE ROW LEVEL SECURITY;

-- Helper: verificar papel do usuário logado
CREATE OR REPLACE FUNCTION is_gestor() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS(SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'GESTOR');
$$;

-- PERFIS
CREATE POLICY "perfis_select" ON perfis FOR SELECT
  USING (id = auth.uid() OR is_gestor());
CREATE POLICY "perfis_insert_gestor" ON perfis FOR INSERT
  WITH CHECK (is_gestor());
CREATE POLICY "perfis_update_gestor" ON perfis FOR UPDATE
  USING (is_gestor());

-- PEÇAS
CREATE POLICY "pecas_select" ON pecas FOR SELECT
  USING (is_gestor() OR tecnico_atual_id = auth.uid());
CREATE POLICY "pecas_all_gestor" ON pecas FOR ALL
  USING (is_gestor());

-- ATENDIMENTOS
CREATE POLICY "atendimentos_select" ON atendimentos FOR SELECT
  USING (is_gestor() OR tecnico_id = auth.uid());
CREATE POLICY "atendimentos_insert_tecnico" ON atendimentos FOR INSERT
  WITH CHECK (tecnico_id = auth.uid() OR is_gestor());

-- MOVIMENTAÇÕES
CREATE POLICY "movimentacoes_select" ON movimentacoes FOR SELECT
  USING (is_gestor() OR origem_id = auth.uid() OR destino_id = auth.uid());
CREATE POLICY "movimentacoes_insert" ON movimentacoes FOR INSERT
  WITH CHECK (usuario_id = auth.uid() OR is_gestor());

-- DOA REGISTROS
CREATE POLICY "doa_select" ON doa_registros FOR SELECT
  USING (is_gestor() OR tecnico_id = auth.uid());
CREATE POLICY "doa_insert" ON doa_registros FOR INSERT
  WITH CHECK (tecnico_id = auth.uid());

-- STORAGE BUCKET
-- Executar no dashboard Supabase > Storage > Policies
-- Bucket: evidencias
-- Policy SELECT: autenticado pode ver
-- Policy INSERT: autenticado pode fazer upload
```

---

## PARTE 4 — ORDEM DE DESENVOLVIMENTO

### Fase 1 — Base (semanas 1-2)

```
[ ] 1. Setup do projeto Next.js + Supabase + Tailwind + shadcn/ui
[ ] 2. Criar todas as tabelas (migrations 001-006)
[ ] 3. Criar funções PostgreSQL
[ ] 4. Configurar RLS
[ ] 5. Criar bucket 'evidencias' no Supabase Storage
[ ] 6. Configurar clientes Supabase (client + server)
[ ] 7. Implementar middleware de autenticação
[ ] 8. Tela de login
[ ] 9. Tela de primeiro acesso (definir senha)
```

### Fase 2 — Módulo Técnico (semanas 3-4)

```
[ ] 10. BottomNav do técnico
[ ] 11. Tela de estoque pessoal (US-01)
[ ] 12. Componente CameraCapture
[ ] 13. Fluxo de atendimento multi-step (US-02)
[ ] 14. Upload de fotos com compressão
[ ] 15. Tela de DOA (US-03)
[ ] 16. Tela de histórico de peça (US-04)
[ ] 17. Testes em iOS Safari e Android Chrome (obrigatório!)
```

### Fase 3 — Módulo Gestor (semanas 5-6)

```
[ ] 18. Layout do gestor (sidebar em desktop, nav em mobile)
[ ] 19. Tela de distribuição de peças (US-05)
[ ] 20. Tela de transferência entre técnicos (US-06)
[ ] 21. Tela de laboratório (US-07 + US-08)
[ ] 22. Tela de visão geral de peças + histórico (US-09)
[ ] 23. Tela de gestão de usuários (US-10)
```

### Fase 4 — Finalização (semana 7)

```
[ ] 24. Importação CSV de peças
[ ] 25. Dashboard com métricas básicas
[ ] 26. Testes end-to-end
[ ] 27. Testes de performance (upload, listagens)
[ ] 28. Deploy em Vercel + Supabase Cloud
```

---

## PARTE 5 — CHECKLIST DE QUALIDADE

### Mobile (testar em dispositivo real)
- [ ] Câmera abre direto (não galeria) no Android e iOS
- [ ] Botões têm área de toque mínima de 44px
- [ ] Inputs de texto não causam zoom no iOS (font-size >= 16px)
- [ ] Página não estoura horizontalmente em nenhuma tela
- [ ] Bottom nav não cobre conteúdo (padding-bottom correto)
- [ ] Loading states visíveis durante upload de foto

### Backend
- [ ] Toda mutation usa função PostgreSQL ou transaction
- [ ] RLS testado: técnico não vê peças de outros técnicos
- [ ] RLS testado: técnico não consegue mudar status para ENVIADA_LAB
- [ ] Upload de foto falha graciosamente (retry + mensagem clara)
- [ ] Tags de peças são únicas (constraint no banco)

### Geral
- [ ] Usuário sem permissão é redirecionado (não vê erro 403)
- [ ] Sessão expira e redireciona para login (não quebra)
- [ ] Formulários têm validação client-side e server-side
- [ ] Todas as ações críticas têm confirmação
