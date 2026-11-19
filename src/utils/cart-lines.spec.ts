import { describe, expect, it } from "vitest";
import { isBumpLine, isSameCartLine, resolveEffectiveCartItem } from "./cart-lines";

describe("cart-lines & resolveEffectiveCartItem", () => {
  it("identifica linha de order bump corretamente por orderBumpId ou isOrderBump", () => {
    expect(isBumpLine({ orderBumpId: "bump-1" })).toBe(true);
    expect(isBumpLine({ isOrderBump: true })).toBe(true);
    expect(isBumpLine({ orderBumpId: null, isOrderBump: false })).toBe(false);
    expect(isBumpLine({})).toBe(false);
  });

  it("compara linhas do carrinho considerando produto, variação e oferta", () => {
    const item = { product: { id: "p1" }, selectedVariation: "v1", orderBumpId: "b1" };
    expect(isSameCartLine(item, "p1", "v1", "b1")).toBe(true);
    expect(isSameCartLine(item, "p1", "v1", null)).toBe(false);
    expect(isSameCartLine(item, "p1", "v2", "b1")).toBe(false);
    expect(isSameCartLine(item, "p2", "v1", "b1")).toBe(false);
  });

  describe("resolveEffectiveCartItem", () => {
    it("quando promoAllowed é true (ex: Pix), mantém o preço promocional do produto normal", () => {
      const normalItem = {
        product: { id: "p1", price: 80, oldPrice: 100, isPromo: true },
        quantity: 1,
      };
      const resolved = resolveEffectiveCartItem(normalItem, true);
      expect(resolved.product.price).toBe(80);
      expect(resolved.product.isPromo).toBe(true);
    });

    it("quando promoAllowed é false (ex: Cartão), reverte produto normal em promoção para oldPrice", () => {
      const normalItem = {
        product: { id: "p1", price: 80, oldPrice: 100, isPromo: true },
        quantity: 1,
      };
      const resolved = resolveEffectiveCartItem(normalItem, false);
      expect(resolved.product.price).toBe(100);
      expect(resolved.product.isPromo).toBe(false);
      expect(resolved.product.oldPrice).toBeUndefined();
    });

    it("quando promoAllowed é false, NUNCA reverte o preço de COMBO (isCombo: true) para oldPrice", () => {
      const comboItem = {
        product: { id: "c1", price: 70, oldPrice: 120, isPromo: true, isCombo: true },
        quantity: 1,
      };
      const resolved = resolveEffectiveCartItem(comboItem, false);
      expect(resolved.product.price).toBe(70);
      expect(resolved.product.isCombo).toBe(true);
    });

    it("quando promoAllowed é false, NUNCA reverte o preço de ORDER BUMP (orderBumpId / isOrderBump) para oldPrice", () => {
      const bumpItem = {
        product: { id: "p2", price: 25, oldPrice: 40, isPromo: true },
        quantity: 1,
        isOrderBump: true,
        orderBumpId: "b1",
      };
      const resolved = resolveEffectiveCartItem(bumpItem, false);
      expect(resolved.product.price).toBe(25);
    });
  });
});
