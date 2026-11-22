import { describe, expect, it } from "vitest";
import { getCustomizationCopy, supportsCustomization } from "./business-type";

describe("business-type helpers (vitrine)", () => {
  it("habilita montagem apenas para FOOD e ACAI e oculta em POD/indefinido", () => {
    expect(supportsCustomization("FOOD")).toBe(true);
    expect(supportsCustomization("ACAI")).toBe(true);
    expect(supportsCustomization("POD")).toBe(false);
    expect(supportsCustomization(undefined)).toBe(false);
  });

  it("retorna chamada unificada \"Monte seu pedido\" para FOOD e ACAI legado e fallback genérico", () => {
    expect(getCustomizationCopy("FOOD").buttonLabel).toBe("Monte seu pedido");
    expect(getCustomizationCopy("ACAI").buttonLabel).toBe("Monte seu pedido");
    expect(getCustomizationCopy("POD").buttonLabel).toBe("Montar Produto");
  });
});
