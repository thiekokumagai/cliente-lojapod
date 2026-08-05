# Technology Stack

**Analysis Date:** 2026-05-19

## Languages

**Primary:**
- TypeScript 5.8.3 - All application source code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- JavaScript - Configuration files (`eslint.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js 24.14.1 (development)
- Web Browser runtime (client-side execution only)

**Package Manager:**
- npm / pnpm / Bun - lockfiles present for `package-lock.json`, `pnpm-lock.yaml`, and `bun.lock`
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - Frontend UI library
- Vite 8.0.0 - Bundler and development server

**Testing:**
- Vitest 4.1.0 - Unit & Integration test runner
- Playwright 1.57.0 - End-to-end (E2E) testing framework
- React Testing Library 16.0.0 & Jest DOM 6.6.0 - Component unit test utilities

**Build/Dev:**
- Tailwind CSS 3.4.17 - Utility-first styling framework
- PostCSS 8.5.6 & Autoprefixer 10.4.21 - CSS post-processing
- ESLint 9.32.0 - Code linting and style verification

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` v2.99.3 - Client-side communication with Supabase backend (DB, Auth, Functions)
- `@tanstack/react-query` v5.83.0 - Data fetching, caching, synchronization and server state management
- `react-router-dom` v6.30.1 - Client-side routing and page navigation
- `react-hook-form` v7.61.1 & `zod` v3.25.76 - Form management and schema-based validation

**Infrastructure & UI Components:**
- Radix UI primitives (`@radix-ui/react-*`) - Unstyled, accessible UI components (dialogs, menus, select, tabs, accordion, etc.)
- `class-variance-authority` v0.7.1 - Utility to create design-system components with variants
- `tailwind-merge` v2.6.0 & `clsx` v2.1.1 - Safe CSS class merging for tailwind utilities
- `framer-motion` v12.38.0 - Declarative micro-animations and page transitions
- `lucide-react` v0.462.0 - Icon set
- `sonner` v1.7.4 - Toast notification component

## Configuration

**Environment:**
- Configured via client-side environment variables loaded from `.env`
- Required variables:
  - `VITE_SUPABASE_URL` - Supabase API endpoint
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public anon key

**Build & Compiler:**
- `tsconfig.json` - Base TypeScript options
- `tsconfig.app.json` - Application code TypeScript configuration
- `tsconfig.node.json` - Node scripts (vite/vitest config) TypeScript configuration
- `vite.config.ts` - Vite bundler and development server configuration
- `tailwind.config.ts` - Tailwind design tokens, colors, custom utility variables, and animations
- `postcss.config.js` - PostCSS runner configuration

## Platform Requirements

**Development:**
- macOS/Linux/Windows with Node.js v24.x or above
- Supabase CLI (optional, for local Edge Functions development)

**Production:**
- SPA static hosting (e.g., Vercel, Netlify, Cloudflare Pages, or AWS S3)
- Supabase Cloud hosting (database, auth, storage, and edge functions)

---

*Stack analysis: 2026-05-19*
*Update after major dependency changes*
