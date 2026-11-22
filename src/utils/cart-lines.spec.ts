import { describe, expect, it } from "vitest";
import { isBumpLine, isSameCartLine, resolveEffectiveCartItem , reconcileOrderBumpItems } from "./cart-lines";

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

describe("reconcileOrderBumpItems — múltiplos triggerProductIds (regra OU)", () => {
  const makeItem = (id: string, price: number, extra: Record<string, unknown> = {}) =>
    ({
      product: { id, name: id, price, ...((extra.product as Record<string, unknown>) || {}) },
      quantity: 1,
      selectedVariation: "",
      ...extra,
    }) as never;

  it("mantém desconto enquanto qualquer um dos produtos gatilho estiver no carrinho e reverte quando nenhum restar", () => {
    const p1 = makeItem("p1", 30);
    const p2 = makeItem("p2", 35);
    const bump = makeItem("coca", 5, {
      product: { id: "coca", name: "Coca Zero", price: 5, oldPrice: 8, isPromo: true },
      isOrderBump: true,
      orderBumpId: "bump-coca",
      orderBumpTrigger: {
        triggerType: "PRODUCT",
        triggerProductId: "p1",
        triggerProductIds: ["p1", "p2", "p3"],
      },
    });

    // Com p1 e p2 -> mantém desconto
    const withBoth = reconcileOrderBumpItems([p1, p2, bump]);
    expect(withBoth.find((i) => i.product.id === "coca")?.isOrderBump).toBe(true);
    expect(withBoth.find((i) => i.product.id === "coca")?.product.price).toBe(5);

    // Tira p1, sobra p2 -> ainda mantém desconto (regra OU)
    const withOnlyP2 = reconcileOrderBumpItems([p2, bump]);
    expect(withOnlyP2.find((i) => i.product.id === "coca")?.isOrderBump).toBe(true);
    expect(withOnlyP2.find((i) => i.product.id === "coca")?.product.price).toBe(5);

    // Tira p2, sobra só p99 (não é gatilho) -> perde desconto e volta para oldPrice (8)
    const p99 = makeItem("p99", 20);
    const withUnrelated = reconcileOrderBumpItems([p99, bump]);
    const reverted = withUnrelated.find((i) => i.product.id === "coca");
    expect(reverted?.isOrderBump).toBeUndefined();
    expect(reverted?.product.price).toBe(8);
  });
});
