# Architecture Overview

## Pattern
The application follows the **Next.js App Router** architecture, utilizing **React Server Components (RSC)** for data fetching and **Client Components** for interactive UI elements.

## Data Flow
- **Mutations**: Performed via **Server Actions** located in `src/app/actions`.
- **Fetching**: Mixture of server-side fetching in layouts/pages and client-side interaction with Supabase.
- **State Management**: Primarily relies on local React state (`useState`, `useMemo`) and server-side revalidation (`revalidatePath`).

## Security & Auth
- **Middleware**: `src/middleware.ts` likely handles session verification and routing protection.
- **Role-based Access**: Separated into `/gestor` and `/tecnico` paths.

## Design System
- **Composition**: Atomic-like component structure in `src/components/ui` (shadcn pattern).
- **Shell**: `GestorShell` and `TecnicoShell` components wrap the main content for consistent navigation.
