# External Integrations

**Analysis Date:** 2026-05-19

## APIs & External Services

**Vendizap Integration:**
- Vendizap API - Backing service for fetching product list, detailed product options, inventory, and categories
  - SDK/Client: REST API accessed indirectly via Supabase Edge Function proxy
  - Methods: `supabase.functions.invoke("vendizap-api", { body: { action } })`
  - Actions used:
    - `products` - Retrieves all products
    - `product` - Retrieves detail of a single product
    - `categories` - Retrieves product categories
    - `productsByCategory` - Retrieves products filtered by a category ID

**Google Maps API:**
- Google Maps Javascript API - Address autocomplete & search during checkout
  - SDK/Client: Dynamic script loading via custom component `src/components/GoogleMapsLoader.tsx`
  - Auth: API key stored in `VITE_GOOGLE_MAPS_API_KEY` environment variable
  - Hooks used: `src/hooks/use-address-autocomplete.tsx` leveraging `google.maps.places.AutocompleteService` and `google.maps.places.PlacesService`

**WhatsApp Direct Ordering:**
- WhatsApp Click-to-Chat API - Immediate checkout ordering & customer support channel
  - SDK/Client: Standard URL redirect (`https://wa.me/` or `https://api.whatsapp.com/send`)
  - Usage: `src/components/WhatsAppButton.tsx` and cart final checkout dispatch (converts shopping cart data into a formatted Portuguese text message sent directly to the store's phone number)

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Cloud database backing Supabase services & Edge functions
  - Client: `@supabase/supabase-js` client SDK
  - Configuration: Configured in `src/integrations/supabase/client.ts`

**Storage:**
- Supabase Storage - Holds assets and images
  - SDK/Client: `@supabase/supabase-js`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Handles authenticated user sessions (if any, e.g. for saved addresses or checkout profiles)
  - Implementation: `src/integrations/supabase/client.ts` configured with `persistSession: true` and `storage: localStorage`
  - Session storage: `localStorage`

## CI/CD & Deployment

**Hosting:**
- SPA Static Hosting - Static front-end hosted on a CDN/Static Host (Vercel, Netlify, or similar)
- Supabase Edge Hosting - Supabase Edge Functions hosted on Deno runtime in Supabase Cloud

## Environment Configuration

**Development:**
- Required Env Vars:
  - `VITE_SUPABASE_URL` - Supabase URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase Publishable Key
  - `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API Key
- Secrets location: `.env` file (gitignored)

**Production:**
- Managed via production environment variables in the hosting provider dashboard (Vercel/Netlify) and Supabase Cloud dashboard.

---

*Integration audit: 2026-05-19*
*Update when adding/removing external services*
