# Development Concerns

## Version Stability
The project uses **Next.js 16.2.4**, which is an experimental/unstable version. This has already caused "Router action dispatched before initialization" errors during HMR. Consider a downgrade to a stable v15.x if stability issues persist.

## State Management
As the piece distribution and laboratory logic grows, simple `useState` and `Set` in client components might become difficult to manage. A more robust state solution (Zustand or React Context) might be needed.

## Security
Authorization checks must be consistently applied both in `middleware.ts` and within each **Server Action** to ensure cross-role access is prohibited at the database level.

## Documentation
The codebase is currently lacking internal documentation (JSDoc) and technical READMEs for complex modules like the distribution logic.
