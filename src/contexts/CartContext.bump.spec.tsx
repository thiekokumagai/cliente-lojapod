import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

// Sem rede nem pixel: análise do carrinho e rastreio são mocks.
vi.mock("@/components/FacebookPixel", () => ({ trackEvent: vi.fn(), trackCustomEvent: vi.fn() }));
vi.mock("@/services/analytics", () => ({ syncCartAnalytics: vi.fn() }));

import { CartProvider, useCart } from "./CartContext";
import { isBumpLine, isSameCartLine } from "@/utils/cart-lines";

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const coca = (price: number) =>
  ({ id: "coca", name: "Coca-Cola 310ml", image: "", category: "", description: "", price, stock: 50 }) as never;

const normal = () => ({ product: coca(8) });
const bump = (id = "b1") => ({ product: coca(6), isOrderBump: true, orderBumpId: id });

function setup() {
  return renderHook(() => useCart(), { wrapper });
}

describe("CartContext: a linha de oferta 'Peça também' não se junta à linha normal do mesmo produto", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("a mesma bebida normal e como oferta vira DUAS linhas, cada uma com o seu preço", () => {
    const { result } = setup();

    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(bump()));

    expect(result.current.items).toHaveLength(2);
    const normalLine = result.current.items.find((i) => !i.orderBumpId)!;
    const bumpLine = result.current.items.find((i) => i.orderBumpId === "b1")!;
    expect(normalLine.product.price).toBe(8);
    expect(bumpLine.product.price).toBe(6);
  });

  it("na ordem inversa (oferta primeiro) também são duas linhas, e a normal não herda o preço da oferta", () => {
    const { result } = setup();

    act(() => result.current.addToCart(bump()));
    act(() => result.current.addToCart(normal()));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find((i) => !i.orderBumpId)!.product.price).toBe(8);
    expect(result.current.items.find((i) => i.orderBumpId === "b1")!.product.price).toBe(6);
  });

  it("a mesma oferta adicionada de novo soma na linha da oferta; a normal somada fica na normal", () => {
    const { result } = setup();

    act(() => result.current.addToCart(bump()));
    act(() => result.current.addToCart(bump()));
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(normal()));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find((i) => i.orderBumpId === "b1")!.quantity).toBe(2);
    expect(result.current.items.find((i) => !i.orderBumpId)!.quantity).toBe(3);
  });

  it("ofertas diferentes do mesmo produto também ficam em linhas separadas", () => {
    const { result } = setup();

    act(() => result.current.addToCart(bump("b1")));
    act(() => result.current.addToCart(bump("b2")));

    expect(result.current.items).toHaveLength(2);
  });

  it("updateQuantity com o id da oferta mexe só na linha da oferta", () => {
    const { result } = setup();
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(bump()));

    act(() => result.current.updateQuantity("coca", 4, undefined, "b1"));

    expect(result.current.items.find((i) => i.orderBumpId === "b1")!.quantity).toBe(4);
    expect(result.current.items.find((i) => !i.orderBumpId)!.quantity).toBe(1);
  });

  it("updateQuantity sem o id da oferta mexe só na linha normal", () => {
    const { result } = setup();
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(bump()));

    act(() => result.current.updateQuantity("coca", 3));

    expect(result.current.items.find((i) => !i.orderBumpId)!.quantity).toBe(3);
    expect(result.current.items.find((i) => i.orderBumpId === "b1")!.quantity).toBe(1);
  });

  it("removeFromCart com o id da oferta tira só a oferta; sem o id tira a linha normal e o bump que sobrou sozinho perde o desconto da oferta", () => {
    const { result } = setup();
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(bump()));

    act(() => result.current.removeFromCart("coca", undefined, "b1"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].orderBumpId).toBeUndefined();

    act(() =>
      result.current.addToCart({
        product: { ...coca(6), oldPrice: 8, isPromo: true } as never,
        isOrderBump: true,
        orderBumpId: "b1",
      }),
    );
    act(() => result.current.removeFromCart("coca"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].orderBumpId).toBeUndefined();
    expect(result.current.items[0].isOrderBump).toBeUndefined();
    expect(result.current.items[0].product.price).toBe(8);
  });

  it("quando o produto gatilho é removido do carrinho, o item de Order Bump perde o desconto e volta ao preço normal", () => {
    const { result } = setup();
    const triggerProduct = {
      product: { id: "pod-principal", name: "Pod Principal", image: "", category: "", categoryId: "cat-1", description: "", price: 100, stock: 10 } as never,
    };
    const bumpItem = {
      product: { id: "ignite-v400", name: "IGNITE v400 (Cópia)", image: "", category: "", description: "", price: 25, oldPrice: 50, isPromo: true, stock: 10 } as never,
      isOrderBump: true,
      orderBumpId: "bump-ignite",
      orderBumpTrigger: { triggerType: "PRODUCT" as const, triggerProductId: "pod-principal" },
    };

    act(() => result.current.addToCart(triggerProduct));
    act(() => result.current.addToCart(bumpItem));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find((i) => i.product.id === "ignite-v400")!.product.price).toBe(25);
    expect(result.current.items.find((i) => i.product.id === "ignite-v400")!.orderBumpId).toBe("bump-ignite");

    // Remove o produto principal gatilho
    act(() => result.current.removeFromCart("pod-principal"));

    expect(result.current.items).toHaveLength(1);
    const remaining = result.current.items[0];
    expect(remaining.product.id).toBe("ignite-v400");
    expect(remaining.product.price).toBe(50);
    expect(remaining.product.oldPrice).toBeUndefined();
    expect(remaining.product.isPromo).toBe(false);
    expect(remaining.isOrderBump).toBeUndefined();
    expect(remaining.orderBumpId).toBeUndefined();
  });

  it("quantidade 0 na linha da oferta remove só ela", () => {
    const { result } = setup();
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(bump()));

    act(() => result.current.updateQuantity("coca", 0, undefined, "b1"));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].orderBumpId).toBeUndefined();
  });

  it("sem oferta nada muda: o mesmo produto normal continua somando numa linha só", () => {
    const { result } = setup();
    act(() => result.current.addToCart(normal()));
    act(() => result.current.addToCart(normal()));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });
});

describe("cart-lines", () => {
  const line = (extra: Record<string, unknown> = {}) => ({ product: { id: "coca" }, selectedVariation: undefined, ...extra });

  it("isSameCartLine: produto + variação + oferta", () => {
    expect(isSameCartLine(line(), "coca")).toBe(true);
    expect(isSameCartLine(line({ orderBumpId: "b1" }), "coca")).toBe(false);
    expect(isSameCartLine(line({ orderBumpId: "b1" }), "coca", undefined, "b1")).toBe(true);
    expect(isSameCartLine(line({ orderBumpId: "b1" }), "coca", undefined, "b2")).toBe(false);
    expect(isSameCartLine(line({ selectedVariation: "P" }), "coca", "M")).toBe(false);
    expect(isSameCartLine(line(), "outro")).toBe(false);
  });

  it("orderBumpId nulo e ausente valem o mesmo (linha normal)", () => {
    expect(isSameCartLine(line({ orderBumpId: null }), "coca", undefined, undefined)).toBe(true);
    expect(isSameCartLine(line(), "coca", undefined, null)).toBe(true);
  });

  it("isBumpLine reconhece a linha da oferta", () => {
    expect(isBumpLine({ orderBumpId: "b1" })).toBe(true);
    expect(isBumpLine({ isOrderBump: true })).toBe(true);
    expect(isBumpLine({})).toBe(false);
    expect(isBumpLine({ orderBumpId: null, isOrderBump: false })).toBe(false);
  });
});
