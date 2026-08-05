# Architecture

**Analysis Date:** 2026-05-19

## Pattern Overview

**Overall:** Layered Client-Side React SPA with Serverless Backend Integration

**Key Characteristics:**
- **Component-Driven UI:** UI structured into atomic and reusable React components using Tailwind CSS and Radix UI (shadcn/ui).
- **Client-Side State Synchronization:** Real-time client state managed via React Context (`CartContext.tsx`), while external data caching and synchronization is handled by TanStack React Query.
- **Serverless Edge Proxies:** All product and category data accesses are routed through Supabase Edge Functions (`vendizap-api`), protecting API secrets and transforming third-party APIs.
- **Direct Messaging Checkout:** No server-side relational database order-processing bottleneck; orders are composed client-side and dispatched directly to merchants via WhatsApp.

## Layers

**Router & Layout Layer:**
- Purpose: Configures navigation routes and mounts the persistent container elements (Headers, footers, carts, alerts, overlays).
- Contains: `src/App.tsx` and layout shells like `src/layouts/StoreChromeLayout.tsx`
- Depends on: Pages Layer and Components Layer
- Used by: React application mount (`src/main.tsx`)

**Pages Layer:**
- Purpose: Top-level route pages representing visual milestones in the customer flow.
- Contains: `src/pages/Index.tsx` (store home page), `src/pages/ProductPage.tsx` (product details page), and `src/pages/NotFound.tsx` (fallback page).
- Depends on: Components Layer and Hooks Layer
- Used by: Router Layer (`src/App.tsx`)

**Components Layer:**
- Purpose: Reusable interactive interface widgets implementing specific storefront logic (e.g., categories menus, product variations, search autocomplete, shopping cart lists).
- Contains: `src/components/` and sub-directories `src/components/checkout/` (address searches, saved address structures) and `src/components/product/` (mobile galleries, actions, sticky bars).
- Depends on: Contexts Layer, Hooks Layer, and UI primitives

**UI Primitives Layer (shadcn/ui):**
- Purpose: Base styled, unstyled, and highly accessible component blocks.
- Contains: `src/components/ui/` (buttons, sheets, alerts, badges, scroll areas, forms, dialogs, dropdowns, inputs).
- Depends on: Tailwind CSS utility classes and Radix UI tokens

**Contexts Layer:**
- Purpose: Application-wide client state management.
- Contains: `src/contexts/CartContext.tsx` - tracks cart items, active quantities, delivery address options, and controls the cart side-sheet drawer's toggle visibility.
- Depends on: Custom utility helpers

**Hooks Layer (Query & Integration):**
- Purpose: Abstracts data-fetching, side-effects, calculators, and API interfaces into reactive hooks.
- Contains: `src/hooks/useVendizapProducts.ts` (API queries for products and categories), `src/hooks/use-address-autocomplete.tsx` (Google Maps Autocomplete queries), and `src/hooks/use-calculator-freight.tsx` (freight cost estimations).
- Depends on: Services Layer

**Services Layer:**
- Purpose: Instantiates connections to external cloud providers.
- Contains: `src/integrations/supabase/client.ts` - initializes the `@supabase/supabase-js` client using client environment variables.

## Data Flow

**Product Discovery Flow:**
1. The customer opens the homepage (`src/pages/Index.tsx`).
2. The page calls the `useProducts` hook (`src/hooks/useVendizapProducts.ts`).
3. React Query invokes the Supabase Edge Function API `vendizap-api`.
4. Supabase Deno Edge Function communicates with Vendizap and forwards raw product items.
5. The hook's query mapper transforms raw API formats (`VendizapProduct`) into standard front-end models (`Product`), filters out out-of-stock variations, and returns reactive states.
6. `Index.tsx` maps the products to custom `ProductCard.tsx` elements.

**Checkout & WhatsApp Ordering Flow:**
1. The customer selects product variants via `ProductVariationModal.tsx` and adds items to their cart.
2. `CartContext.tsx` updates internal in-memory state (`cartItems`), serializes it to `localStorage`, and reveals the `CartSidebar.tsx` drawer.
3. The customer proceeds to checkout within the sidebar, typing delivery details validated via Google Autocomplete (`use-address-autocomplete.tsx`).
4. Total prices and freight rates are estimated via `use-calculator-freight.tsx` using geographic distance/shipping calculators.
5. When the user confirms, the cart serializes the items, shipping address, and chosen payment method into a formatted Portuguese text message.
6. The browser navigates the user to the WhatsApp Click-to-Chat URL, which populates the text in their mobile or desktop app, letting the customer submit the order to the store instantly.

## Key Abstractions

**React Query Hooks (`useQuery`):**
- Used to wrap all asynchronous integrations. Handles data stale timings, memory garbage collection, retry policies, and serializations in-context.
- Examples: `useProducts`, `useProductDetail`, `useCategories` in `useVendizapProducts.ts`.

**Cart Context Providers (`CartContext`):**
- Acts as a local relational state container representing items, quantities, addresses, and fees. Keeps inputs persistent across route navigation.

## Entry Points

**Main Entry:**
- Location: `src/main.tsx`
- Responsibilities: Imports global styling sheets (`src/index.css`), mounts the React virtual DOM tree, and binds it to the `#root` element of `index.html`.

**App Provider Shell:**
- Location: `src/App.tsx`
- Responsibilities: Wraps the app in global context boundaries (`QueryClientProvider`, `TooltipProvider`, `CartProvider`, `BrowserRouter`).

## Error Handling

**Form Validations:**
- Schema-based client validation is performed at component boundaries using `zod` and `react-hook-form`. Forms throw validation markers or inline tags instead of sending bad inputs to checkout.

**API Failures:**
- Edge function invocation failures are captured via Promise catch statements, dispatching friendly visual toast alerts to users via `sonner` / `use-toast.ts` while keeping the storefront functional.

## Cross-Cutting Concerns

**Styling Tokens:**
- Visual styles, borders, text colors, and gradients are centralized using Vanilla CSS HSL tokens in `src/index.css` under `@layer base`. Responsive sizes and component grids use Tailwind CSS classes.

**Iconography:**
- Unified Lucide icon system (`lucide-react`) is used across headers, nav-bars, footers, and modal triggers to maintain visual consistency.

---

*Architecture analysis: 2026-05-19*
*Update when major patterns change*
