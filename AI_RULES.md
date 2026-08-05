# AI Rules

## Tech stack
- React 18 with TypeScript for all application code.
- Vite is used for development, builds, and previewing the app.
- React Router DOM handles client-side routing, with routes defined in `src/App.tsx`.
- Tailwind CSS is the primary styling system for layout, spacing, typography, and responsive design.
- shadcn/ui is the default component library, with reusable UI primitives located under `src/components/ui/`.
- Radix UI powers accessible low-level primitives underneath the shadcn/ui components.
- TanStack React Query is available for async server-state management and data fetching.
- React Hook Form with Zod is available for form state and validation.
- Lucide React is the standard icon library.
- Sonner and the existing toast utilities are available for notifications.

## Library usage rules
- Use **React + TypeScript** for all new components, hooks, pages, and app logic.
- Put all source files inside **`src/`**.
- Put route pages in **`src/pages/`** and reusable components in **`src/components/`**.
- Define and update app routes in **`src/App.tsx`** using **React Router DOM**.
- Use **Tailwind CSS** classes for styling. Do not introduce plain CSS files, CSS modules, styled-components, or other styling systems unless an existing file already requires a tiny targeted change.
- Use **shadcn/ui components first** for common UI needs like buttons, dialogs, forms, inputs, cards, tabs, sheets, dropdowns, tables, and toasts.
- Do **not** edit the existing shadcn/ui primitives in **`src/components/ui/`** unless the task is specifically about fixing one of those primitives. Prefer composing them in new wrapper components instead.
- Use **Radix-backed shadcn/ui components** instead of building custom accessible primitives from scratch when an equivalent already exists.
- Use **Lucide React** for icons. Do not add a different icon library.
- Use **`cn()` from `src/lib/utils.ts`** to combine conditional Tailwind class names.
- Use **TanStack React Query** for API/server-state concerns such as fetching, caching, invalidation, and async loading states.
- Use **React local state / context** for UI-only state, and only use context when state genuinely needs to be shared.
- Use **React Hook Form** for non-trivial forms and **Zod** for schema validation at user-input boundaries.
- Use the existing **Sonner/toast** setup for notifications instead of creating a custom notification system.
- Reuse existing project patterns and assets before introducing new dependencies.
- Avoid adding new libraries when the current stack already covers the use case.
