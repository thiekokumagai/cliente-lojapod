# Testing Patterns

**Analysis Date:** 2026-05-19

## Test Framework

**Runner:**
- Vitest 4.1.0 - Core unit & integration test runner, configured in `vitest.config.ts`.
- Playwright 1.57.0 - Core end-to-end (E2E) automated browser test suite runner, configured in `playwright.config.ts`.

**Assertion Library:**
- Vitest built-in expect.
- `@testing-library/jest-dom` v6.6.0 - Custom DOM matches (e.g., `toBeInTheDocument`, `toHaveTextContent`) for component validation.

**Run Commands:**
```bash
npm run test                      # Run all Vitest unit/integration tests once
npm run test:watch                # Run Vitest in hot-reload watch mode
npx playwright test               # Run E2E browser tests (if configured)
```

## Test File Organization

**Location:**
- Unit & Component tests: Located inside the dedicated `src/test/` directory, or collocated alongside the components as `*.test.ts`/`*.test.tsx`.
- Currently, only the baseline `src/test/example.test.ts` exists.

**Naming:**
- `*.test.ts` / `*.test.tsx` for unit and component tests.
- E2E files are configured to run via Playwright.

**Structure:**
```
src/
├── test/
│   ├── example.test.ts         # Baseline test script
│   └── setup.ts                # Global Vitest test environment initialization
├── playwright-fixture.ts       # Playwright E2E fixture helper
└── playwright.config.ts        # Playwright E2E config
```

## Global Test Environment Setup

The test environment setup in `src/test/setup.ts` loads required matchers and mocks global browser APIs that do not exist under standard JSDOM runtimes:

```typescript
import "@testing-library/jest-dom";

// Mock window.matchMedia (used by responsive layouts and components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

## Test Suite Structure

Tests are organized into structured blocks using standard Vitest semantics:

```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

## Mocking Guidelines

**What to Mock:**
- **External API Calls:** Mock Deno edge function calls (`supabase.functions.invoke`) using `vi.spyOn` or direct mock overrides to isolate tests from network states.
- **Third-Party Services:** Mock the Google Maps Place Service loaded via scripts in `GoogleMapsLoader.tsx` to prevent script execution exceptions in virtual DOMs.
- **Persistent Storage:** Stub out `localStorage` calls to isolate cart serialization assertions.

**What NOT to Mock:**
- In-memory cart transformations (`CartContext` logic).
- Product interface transformations (`transformProduct` in hooks).

## Coverage

**Target:**
- Awareness tracking; currently, no hard metrics are blocking pipelines.
- Code coverage is enabled using Vitest's built-in coverage reporting structures (`jsdom` environment).

---

*Testing analysis: 2026-05-19*
*Update when test patterns change*
