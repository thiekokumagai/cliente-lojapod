# Codebase Structure

**Analysis Date:** 2026-05-19

## Directory Layout

```
[project-root]/
├── .planning/             # GSD planning resources and codebase documents
│   └── codebase/          # Structured analysis files (stack, architecture, etc.)
├── public/                # Static assets served directly (icons, logos, manifests)
├── src/                   # React frontend application source code
│   ├── assets/            # Core visual media assets
│   ├── components/        # Storefront React UI components
│   │   ├── checkout/      # Address searches and delivery forms
│   │   ├── product/       # Galleries, descriptors, and product sticky bars
│   │   └── ui/            # shadcn/ui base elements (button, dialog, sheet)
│   ├── contexts/          # In-memory client state providers (CartContext)
│   ├── data/              # Types, interfaces, and static models (products.ts)
│   ├── hooks/             # Custom React Hooks (caching, autocomplete, media hooks)
│   ├── layouts/           # Chrome wrapper layouts (StoreChromeLayout)
│   ├── lib/               # Utility functions and class merging helpers
│   ├── pages/             # Route-level views (home catalogs, product details)
│   └── test/              # Vitest test files and environment configurations
├── supabase/              # Local Supabase configurations and Edge functions
│   └── functions/         # Deno serverless edge APIs
│       ├── fetch-categories/ # Legacy category synchronization Edge Function
│       └── vendizap-api/  # Deno function acting as a proxy for the Vendizap API
└── package.json           # Node.js project manifest & script commands
```

## Directory Purposes

**.planning/codebase/**
- Purpose: Active codebase mapping and architecture analysis documentation.
- Contains: `STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`.
- Key files: `STACK.md` - runtime dependencies; `ARCHITECTURE.md` - layered design schemas.

**src/components/**
- Purpose: Dynamic storefront layout widgets.
- Contains: `.tsx` files representing components (Hero banner, product catalog grids, mobile navigation bars, footer groups, WhatsApp buttons).
- Key subdirectories:
  - `checkout/` - `AddressSearch.tsx` integration with Google Maps.
  - `product/` - `ProductFreightCalculator.tsx` estimating courier metrics.
  - `ui/` - Custom buttons, selectors, tabs, cards, sheets, scroll regions.

**src/contexts/**
- Purpose: Unified state managers.
- Contains: `CartContext.tsx` - in-memory shopping cart array storage, checkout item calculators, delivery options, and local storage serializers.

**src/hooks/**
- Purpose: Logic encapsulators and data fetchers.
- Contains: React Hooks wrapping external logic.
- Key files:
  - `useVendizapProducts.ts` - fetches products, details, and categories via Supabase.
  - `use-address-autocomplete.tsx` - Google Places autocomplete service integration.
  - `use-calculator-freight.tsx` - custom distance/freight computation formulas.

**src/pages/**
- Purpose: Application routing milestones.
- Contains:
  - `Index.tsx` - primary landing dashboard showing promotions, best sellers, categories menu, filter systems, and product catalog grids.
  - `ProductPage.tsx` - dynamic detail dashboard showcasing desktop/mobile image galleries, descriptive sheets, variation configurations, sticky action triggers, and shipping estimators.

**supabase/functions/**
- Purpose: Serverless backend gateways.
- Contains: Deno Edge Function API endpoints.
- Key subdirectories:
  - `vendizap-api/` - receives client invocations, connects securely to the Vendizap API, and returns formatted responses, keeping third-party auth tokens safe.

## Key File Locations

**Entry Points:**
- `src/main.tsx` - React client-side Virtual DOM mounting.
- `src/App.tsx` - Configures browser routes (`/` and `/produto/:id`) and global React providers.
- `index.html` - Core HTML document serving the React entry.

**Configuration:**
- `package.json` - Node metadata, compiler dependencies, and script aliases.
- `components.json` - shadcn/ui styles and directory structure configuration.
- `tsconfig.json` & `tsconfig.app.json` - TypeScript compile settings.
- `vite.config.ts` - Bundler settings, file path aliases (`@/`), and plugins.
- `tailwind.config.ts` - Custom colors, HSL visual themes, radii, and custom animations.
- `postcss.config.js` & `autoprefixer` - Style compilers.
- `supabase/config.toml` - Supabase configurations.

**Testing:**
- `vitest.config.ts` - Vitest settings and DOM mock frameworks.
- `src/test/setup.ts` - Visual window mock definitions.
- `playwright.config.ts` - E2E automated test pipeline configurations.

## Naming Conventions

**Files:**
- `kebab-case.ts`/`kebab-case.tsx` - Lowercase modules, helpers, and utilities (`eslint.config.js`, `use-mobile.tsx`, `playwright-fixture.ts`).
- `PascalCase.tsx` - React storefront visual components (`ProductCard.tsx`, `CartSidebar.tsx`, `Index.tsx`, `StoreChromeLayout.tsx`).
- `*.test.ts` - Unit and integration test suites.

**Directories:**
- `kebab-case` - Feature collections and structural domains (`checkout`, `product`, `ui`, `supabase/functions/vendizap-api`).
- Plural collection names - `components/`, `contexts/`, `hooks/`, `layouts/`, `pages/`, `functions/`.

## Where to Add New Code

**New Component:**
- Implementation: `src/components/` (or subdirectories `checkout/` / `product/` based on scope).
- Base Primitive: Create via shadcn CLI if missing (`npx shadcn-ui@latest add [component]`) to place in `src/components/ui/`.

**New Page / Route:**
- Page dashboard: `src/pages/[Name].tsx` using PascalCase.
- Route definition: Register path in `src/App.tsx` within standard `<Routes>` list.

**New API Query / Data Fetcher:**
- Queries & Mutations: Add custom hook to `src/hooks/useVendizapProducts.ts` if related to catalog data, or define a new file in `src/hooks/`.

**New Backend Logic:**
- Supabase edge logic: Create a new serverless function in `supabase/functions/`.

---

*Structure analysis: 2026-05-19*
*Update when directory structure changes*
