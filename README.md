# Vedhaprem Mandi

Wholesale onion trading workspace. The visual system is the Curated Academic design in `DESIGN.md`. This repository is the frontend only. The production API lives in a separate backend repository.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- shadcn/ui primitives themed to the existing design tokens
- TanStack Query for server state

## Structure

- `src/app` — thin routes
- `src/pages` — feature screens
- `src/api` — typed client for the external backend
- `src/hooks/queries` and `src/hooks/mutations` — TanStack Query
- `src/data` — mock seed and local stand-in until `NEXT_PUBLIC_API_BASE_URL` is set
- `src/auth` — roles and permissions

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

Copy `.env.example` to `.env.local`. Leave `NEXT_PUBLIC_API_BASE_URL` empty to use the mock API.
