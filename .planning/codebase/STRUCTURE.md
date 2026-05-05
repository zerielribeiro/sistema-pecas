# Project Structure

```text
sistema_peças/
├── .agent/                  # Antigravity agent configuration
├── .planning/               # GSD planning and codebase map
└── app/                     # Next.js Application
    ├── public/              # Static assets
    └── src/
        ├── app/             # App Router pages and actions
        │   ├── (auth)/      # Auth groups (login)
        │   ├── gestor/      # Manager dashboard and modules
        │   │   ├── dashboard/
        │   │   ├── distribuir/ # Piece distribution
        │   │   ├── pecas/      # Inventory management
        │   │   └── usuarios/   # User management
        │   ├── tecnico/     # Technician interface
        │   ├── actions/     # Server-side logic (Supabase mutations)
        │   ├── globals.css  # Global styles (Tailwind v4)
        │   └── layout.tsx   # Root layout
        ├── components/      # React components
        │   ├── ui/          # Low-level UI primitives (shadcn)
        │   └── ...          # Domain-specific components
        ├── lib/             # Shared utilities (supabase client, etc.)
        └── middleware.ts    # Auth and routing middleware
```
