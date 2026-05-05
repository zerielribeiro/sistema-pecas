# External Integrations

## Supabase
- **Authentication**: Used for gestor and tecnico login. Implements SSR with `@supabase/ssr`.
- **Database**: PostgreSQL database hosted on Supabase.
- **Client**: Configured in `src/lib/supabase` (assumed based on structure).

## PWA
- **Next PWA**: Configured via `@ducanh2912/next-pwa` for offline capabilities and mobile home screen installation.

## Browser APIs
- **Storage**: Likely used for theme persistence via `next-themes`.
- **PDF**: Client-side PDF generation using `jspdf`.
