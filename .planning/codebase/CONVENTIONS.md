# Coding Conventions

## File Naming
- **Components**: PascalCase (e.g., `Button.tsx`).
- **Pages/Routes**: kebab-case or standard Next.js names (`page.tsx`, `layout.tsx`).
- **Actions**: kebab-case (e.g., `pecas.ts`).

## Language
- **UI/UX**: Portuguese (PT-BR) as the primary language for the user interface.
- **Code**: English for variables, functions, and documentation.

## Patterns
- **Data Mutations**: Use Server Actions (`src/app/actions`) instead of client-side `fetch` where possible.
- **UI Primitives**: Follow the shadcn/ui pattern of copying components to `src/components/ui`.
- **Client Components**: Mark only the necessary leaf nodes as `'use client'`.
