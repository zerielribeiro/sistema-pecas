# Testing Strategy

## Current State
The project currently does not have an automated testing suite (Unit, Integration, or E2E).

## Manual Verification
Development relies on manual verification of features in the local environment (`npm run dev`).

## Recommendations
- **Unit Testing**: Implement Vitest or Jest for Server Actions and utility functions.
- **E2E Testing**: Integrate Playwright to test critical flows like piece distribution and laboratory reports.
