# Codebase Concerns

**Analysis Date:** 2026-05-19

## Tech Debt

**Disabled ESLint Unused Variables Check:**
- Issue: ESLint's unused variable rule is bypassed (`"@typescript-eslint/no-unused-vars": "off"`).
- File: `eslint.config.js` (line 23)
- Why: Implemented during fast development iterations to prevent lint errors from halting builds.
- Impact: Dead code, unused imports, or forgotten variables can accumulate, inflating client bundle sizes and decreasing code clarity.
- Fix approach: Change rule to `"warn"` or `"error"`, then perform a codebase-wide clean up of dead variables.

**Giant CartSidebar File:**
- Issue: `CartSidebar.tsx` is an extremely large file (~77KB) containing a mix of rendering layout, shipping calculators, payment selections, state logic, and WhatsApp serialization formatters.
- File: `src/components/CartSidebar.tsx`
- Why: Checkout and cart functionalities were consolidated into a single side-sheet for easy access.
- Impact: Hard to maintain, complex to review, and prone to regression errors when modifying individual checkout sections.
- Fix approach: Refactor `CartSidebar.tsx` by extracting sub-sections (e.g., `PaymentSelector.tsx`, `CartItemsList.tsx`, `WhatsAppFormatter.ts`) into collocated modular components.

## Known Bugs & Failures

**Missing Cart Sidebar Image Mockups:**
- Symptoms: Product cart thumbnails appear empty if no image URL is present from the Vendizap API.
- File: `src/components/CartItemImage.tsx`
- Trigger: Loading a product that has no default image in Vendizap.
- Workaround: Renders a gray placeholder container.
- Fix: Implement a robust fallback UI showing a branded store asset icon.

## Security Considerations

**API Key Exposure in Browser Env:**
- Risk: Client environment variables can be decompiled or inspected from browser resources.
- File: `.env`
- Current mitigation: The critical Vendizap token is secured inside a Deno Supabase Edge Function (`supabase/functions/vendizap-api/`), preventing browser leakages. However, `VITE_GOOGLE_MAPS_API_KEY` is loaded directly in the client.
- Recommendations: Set up Google Maps HTTP referrers restriction policies in the Google Cloud Console to prevent unauthorized usage on external domains.

## Performance Bottlenecks

**No Local Query Caching on Client Switches:**
- Problem: Frequent navigation back and forth between home catalogs and dynamic product details page triggers Edge function queries.
- File: `src/hooks/useVendizapProducts.ts`
- Measurement: 200ms - 600ms latency depending on Supabase Deno cold starts.
- Cause: React Query default `staleTime` is set, but no persistent query storage exists on the client.
- Improvement path: Optimize Edge Functions through caching layers or integrate React Query Local Storage Persister.

## Fragile Areas

**WhatsApp Text Serialization Logic:**
- File: `src/components/CartSidebar.tsx` (within checkout dispatch functions)
- Why fragile: Composes a multi-line plain text message via template literals, wrapping shopping lists, delivery instructions, and payment methods. Small modifications can corrupt spacing, encoding, or text formatting, leading to bad orders.
- Common failures: URI encoding issues on special Portuguese characters (`ç`, `ã`, `é`).
- Safe modification: Add comprehensive unit tests asserting string output formatting for different cart permutations.

## Scaling Limits

**WhatsApp Direct-to-Merchant Limits:**
- Limit: Handled via direct messaging. While stateless and scaling easily, high-volume storefronts will lead to merchants receiving hundreds of unstructured chat messages, making manual dispatch management chaotic.
- Scaling path: Introduce an intermediate checkout webhook that saves orders into a Supabase relational table before dispatching the user to WhatsApp.

## Test Coverage Gaps

**Commerce Engine Untested:**
- What's not tested: Core shopping cart mechanics (`src/contexts/CartContext.tsx`), item additions, variation constraints, and checkout shipping fee formulas.
- Risk: High. An accidental modification to the cart reducer could prevent users from purchasing products, going completely unnoticed in builds.
- Priority: High
- Difficulty to test: Low. Can be unit-tested via Vitest by creating standard wrapper test instances.

---

*Concerns audit: 2026-05-19*
*Update as issues are fixed or new ones discovered*
