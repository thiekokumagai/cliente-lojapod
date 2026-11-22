import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatServesLabel, supportsCustomization } from "@/utils/business-type";
import { isSameCartLine, normalizeCartObservation } from "@/utils/cart-lines";
import ServesIndicator from "@/components/product/ServesIndicator";

describe("formatServesLabel, ServesIndicator e observação por item no carrinho", () => {
  it("formata corretamente singular, plural e valores vazios/inválidos", () => {
    expect(formatServesLabel(1)).toBe("Serve 1 pessoa");
    expect(formatServesLabel(2)).toBe("Serve 2 pessoas");
    expect(formatServesLabel(4)).toBe("Serve 4 pessoas");
    expect(formatServesLabel(0)).toBeNull();
    expect(formatServesLabel(-2)).toBeNull();
    expect(formatServesLabel(null)).toBeNull();
    expect(formatServesLabel(undefined)).toBeNull();
  });

  it("renderiza ícone de 1 pessoa para servesCount === 1 e de várias pessoas para >= 2", () => {
    const { rerender, container } = render(<ServesIndicator servesCount={1} show />);
    expect(screen.getByText("Serve 1 pessoa")).toBeInTheDocument();
    expect(screen.getByTestId("serves-icon-single")).toBeInTheDocument();

    rerender(<ServesIndicator servesCount={2} show />);
    expect(screen.getByText("Serve 2 pessoas")).toBeInTheDocument();
    expect(screen.getByTestId("serves-icon-multiple")).toBeInTheDocument();

    rerender(<ServesIndicator servesCount={2} show={false} />);
    expect(container.firstChild).toBeNull();
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
