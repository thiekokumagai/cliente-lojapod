import { describe, it, expect } from "vitest";
import { formatServesLabel, supportsCustomization } from "@/utils/business-type";
import { isSameCartLine, normalizeCartObservation } from "@/utils/cart-lines";

describe("formatServesLabel e observação por item no carrinho", () => {
  it("formata corretamente singular, plural e valores vazios/inválidos", () => {
    expect(formatServesLabel(1)).toBe("Serve 1 pessoa");
    expect(formatServesLabel(2)).toBe("Serve 2 pessoas");
    expect(formatServesLabel(4)).toBe("Serve 4 pessoas");
    expect(formatServesLabel(0)).toBeNull();
    expect(formatServesLabel(-2)).toBeNull();
    expect(formatServesLabel(null)).toBeNull();
    expect(formatServesLabel(undefined)).toBeNull();
  });

  it("habilita recursos de alimentação apenas para FOOD e ACAI legado", () => {
    expect(supportsCustomization("FOOD")).toBe(true);
    expect(supportsCustomization("ACAI")).toBe(true);
    expect(supportsCustomization("POD")).toBe(false);
    expect(supportsCustomization(undefined)).toBe(false);
  });

  it("normaliza observação (trim, vazio -> null, limite 300 chars)", () => {
    expect(normalizeCartObservation("  Sem cebola  ")).toBe("Sem cebola");
    expect(normalizeCartObservation("   ")).toBeNull();
    expect(normalizeCartObservation(undefined)).toBeNull();
    expect(normalizeCartObservation("a".repeat(350))).toHaveLength(300);
  });

  it("separa linhas do carrinho quando o mesmo produto tem observações diferentes", () => {
    const baseItem = {
      product: { id: "prod-1" },
      selectedVariation: "Grande",
      observation: "Sem cebola",
    };

    expect(isSameCartLine(baseItem, "prod-1", "Grande", null, null, "  Sem cebola ")).toBe(true);
    expect(isSameCartLine(baseItem, "prod-1", "Grande", null, null, "Sem tomate")).toBe(false);
    expect(isSameCartLine(baseItem, "prod-1", "Grande", null, null, undefined)).toBe(false);
  });
});
