# Coding Conventions

**Analysis Date:** 2026-05-19

## Naming Patterns

**Files:**
- `PascalCase.tsx` for React storefront visual components (`ProductCard.tsx`, `CartSidebar.tsx`).
- `PascalCase.tsx` for route-level dashboard pages (`Index.tsx`, `ProductPage.tsx`).
- `kebab-case.ts` / `kebab-case.tsx` for hooks, utility files, and setups (`use-mobile.tsx`, `playwright-fixture.ts`).
- Collocated test files alongside source with `*.test.ts` naming (e.g., `example.test.ts`).

**Functions:**
- `camelCase` for standard helper functions, variables, and custom hook definitions.
- `handle[EventName]` for event handlers (e.g., `handleScroll`, `handleVariationSelect`, `handleAddToCart`).

**Variables:**
- `camelCase` for normal variable declarations.
- `UPPER_SNAKE_CASE` for global configuration constant tokens (e.g., `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).

**Types & Interfaces:**
- `PascalCase` for TypeScript interfaces and type declarations.
- No `I` prefixes on interfaces (use `Product`, not `IProduct`).
- Interface names describe the concrete model (`ProductVariationOption`, `SelectedProduct`).

## Code Style

**Formatting:**
- 2-space indentation.
- Double quotes inside JSX/TSX attributes (`className="..."`, `type="button"`).
- Single quotes for string literal values in TS/JS modules (`import { createClient } from '@supabase/supabase-js'`).
- Semicolons are consistently required and written at the end of all statements.
- Braces are strictly formatted, utilizing early return statements to minimize nested blocks.

**Linting:**
- Configured in `eslint.config.js` via ESLint v9 flat config.
- Extends standard JS recommended rules and TypeScript recommended configurations.
- Unused variables checking is bypassed (`"@typescript-eslint/no-unused-vars": "off"`) to speed up rapid prototyping.
- React hooks recommended guidelines are fully enforced.

## Import Organization

**Order:**
1. React core libraries and built-in hooks (`import { useEffect, useState } from "react"`).
2. External npm dependencies (e.g., React Router routing, Lucide icons, Supabase SDK, Radix primitives).
3. Local modules using the path alias `@/` (e.g., `@/contexts/...`, `@/components/ui/...`, `@/hooks/...`).
4. Relative file imports (`./types`, `../products`).

**Grouping:**
- A single blank line separates external, aliased, and relative imports.
- Explicit type-only imports use the `import type` keyword syntax for compiler clarity.

## Error Handling

**Form Validation:**
- Performed client-side at form inputs using `zod` schema schemas compiled via `react-hook-form` resolvers.
- Displays inline inputs validation markers or alerts to intercept bad actions early.

**API Integrations:**
- Handled gracefully via React Query states. Invocations of Supabase functions inspect the `{ data, error }` return structure, throwing explicit errors if the `error` object is populated.
- Captures fetch issues asynchronously, dispatching immediate notification toasts via Sonner (`sonner`) or shadcn `use-toast.ts` alerts to warn users.

## Component & Module Design

**Visual Styling & Tokens:**
- Tailwind utilities are styled directly inline. Theme colors utilize shadcn HSL CSS custom variables configured inside `src/index.css` (e.g., `bg-background`, `border-border`, `text-gradient`).
- Custom media padding checks utilize specialized hooks (`use-store-mobile-padding.ts`, `use-mobile.tsx`) to adjust margins reactively.

**Exports:**
- Default exports are strictly used for all React components, page views, and layout containers (`export default ProductPage`).
- Named exports are utilized for type interfaces, static models, constant tables, and utility helpers (`export interface Product`, `export const supabase`).

---

*Convention analysis: 2026-05-19*
*Update when patterns change*
