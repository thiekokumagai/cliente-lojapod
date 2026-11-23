import { describe, expect, it, vi } from "vitest";
import type { OrderBumpSuggestion } from "@/services/order-bumps";
import {
  addChosenOffersToCart,
  canIncrease,
  chosenOffers,
  decrease,
  groupOrderBumpsByTitle,
  increase,
  offersForProductScreen,
  pruneSelection,
  selectedCount,
  selectionTotal,
  stockLeft,
} from "./order-bump-selection";

const offer = (id: string, price: number, extra: Record<string, unknown> = {}): OrderBumpSuggestion =>
  ({
    bumpId: `bump-${id}`,
    sectionTitle: "Leve junto uma Bebida",
    product: {
      id,
      title: `Bebida ${id}`,
      price,
      originalPrice: price + 2,
      hasDiscount: true,
      imageUrl: null,
      description: "Lata 310ml",
      totalStock: 20,
      hasVariations: false,
      items: [{ id: `i-${id}`, stock: 20 }],
      ...extra,
    },
  }) as OrderBumpSuggestion;

describe("order-bump-selection: seleção dentro da tela do produto", () => {
  const coca = offer("coca", 7);
  const fanta = offer("fanta", 6.5);

  describe("sem limite fixo no grupo (livre até o estoque)", () => {
    it("permite somar além de 10 unidades respeitando o estoque de cada produto", () => {
      let sel = {};
      for (let i = 0; i < 15; i++) sel = increase(sel, coca);
      expect(selectedCount(sel)).toBe(15);
      expect(canIncrease(sel, coca)).toBe(true);

      for (let i = 0; i < 5; i++) sel = increase(sel, coca);
      expect(selectedCount(sel)).toBe(20); // totalStock de coca é 20
      expect(canIncrease(sel, coca)).toBe(false); // atingiu o estoque de coca

      // fanta ainda tem estoque e pode ser adicionada
      expect(canIncrease(sel, fanta)).toBe(true);
      sel = increase(sel, fanta);
      expect(selectedCount(sel)).toBe(21);
    });

    it("tirar uma unidade libera para adicionar de novo", () => {
      let sel = {};
      for (let i = 0; i < 20; i++) sel = increase(sel, coca);
      expect(canIncrease(sel, coca)).toBe(false);
      sel = decrease(sel, coca.bumpId);
      expect(selectedCount(sel)).toBe(19);
      expect(canIncrease(sel, coca)).toBe(true);
    });
  });

  describe("estoque", () => {
    it("não deixa escolher mais do que o estoque", () => {
      const raro = offer("raro", 7, { totalStock: 2 });
      let sel = {};
      sel = increase(sel, raro);
      sel = increase(sel, raro);
      sel = increase(sel, raro);
      expect(sel).toEqual({ "bump-raro": 2 });
    });

    it("desconta o que já está no carrinho", () => {
      const raro = offer("raro", 7, { totalStock: 3 });
      expect(stockLeft(raro, 2)).toBe(1);
      expect(stockLeft(raro, 5)).toBe(0);
      let sel = {};
      sel = increase(sel, raro, 2);
      sel = increase(sel, raro, 2);
      expect(sel).toEqual({ "bump-raro": 1 });
    });
  });

  describe("o + só guarda a escolha", () => {
    it("increase e decrease devolvem um novo objeto e nunca mexem no carrinho", () => {
      const original = {};
      const next = increase(original, coca);
      expect(next).toEqual({ "bump-coca": 1 });
      expect(original).toEqual({});
    });

    it("decrease até zero remove a oferta da escolha; abaixo de zero não faz nada", () => {
      expect(decrease({ "bump-coca": 1 }, "bump-coca")).toEqual({});
      expect(decrease({}, "bump-coca")).toEqual({});
    });
  });

  describe("total do botão Adicionar", () => {
    it("soma preço da oferta × quantidade de cada oferta escolhida", () => {
      const sel = { "bump-coca": 2, "bump-fanta": 1 };
      expect(selectionTotal(sel, [coca, fanta])).toBe(20.5); // 2×7 + 6,5
    });

    it("sem escolha: zero", () => {
      expect(selectionTotal({}, [coca, fanta])).toBe(0);
    });

    it("ignora oferta que saiu da lista", () => {
      expect(selectionTotal({ "bump-coca": 1, "bump-sumiu": 3 }, [coca])).toBe(7);
    });

    it("arredonda centavos", () => {
      expect(selectionTotal({ "bump-a": 3 }, [offer("a", 0.1)])).toBe(0.3);
    });
  });

  describe("quais ofertas aparecem", () => {
    it("oferta de produto com variação fica só no carrinho; sem estoque some", () => {
      const comVariacao = offer("tam", 5, { hasVariations: true });
      const semEstoque = offer("zero", 5, { totalStock: 0 });
      expect(offersForProductScreen([coca, comVariacao, semEstoque, fanta]).map((o) => o.product.id)).toEqual([
        "coca",
        "fanta",
      ]);
    });
  });

  describe("pruneSelection", () => {
    it("tira da escolha o que não está mais na lista (trocou de produto)", () => {
      expect(pruneSelection({ "bump-coca": 2, "bump-velha": 1 }, [coca])).toEqual({ "bump-coca": 2 });
    });

    it("sem mudança devolve o mesmo objeto (evita re-render)", () => {
      const sel = { "bump-coca": 2 };
      expect(pruneSelection(sel, [coca, fanta])).toBe(sel);
    });
  });

  describe("addChosenOffersToCart: o Adicionar põe cada oferta no carrinho como linha própria", () => {
    it("manda produto, isOrderBump e orderBumpId, com o preço da OFERTA", () => {
      const addToCart = vi.fn();
      const updateQuantity = vi.fn();
      addChosenOffersToCart(chosenOffers({ "bump-coca": 1 }, [coca, fanta]), addToCart, updateQuantity);

      expect(addToCart).toHaveBeenCalledTimes(1);
      const arg = addToCart.mock.calls[0][0];
      expect(arg.isOrderBump).toBe(true);
      expect(arg.orderBumpId).toBe("bump-coca");
      expect(arg.product.id).toBe("coca");
      expect(arg.product.price).toBe(7);
      expect(updateQuantity).not.toHaveBeenCalled();
    });

    it("quantidade maior que 1 ajusta a linha DA OFERTA (não a linha normal)", () => {
      const addToCart = vi.fn();
      const updateQuantity = vi.fn();
      addChosenOffersToCart(chosenOffers({ "bump-coca": 3, "bump-fanta": 1 }, [coca, fanta]), addToCart, updateQuantity);

      expect(addToCart).toHaveBeenCalledTimes(2);
      expect(updateQuantity).toHaveBeenCalledTimes(1);
      expect(updateQuantity).toHaveBeenCalledWith("coca", 3, undefined, "bump-coca");
    });

    it("sem escolha não adiciona nada", () => {
      const addToCart = vi.fn();
      addChosenOffersToCart(chosenOffers({}, [coca]), addToCart, vi.fn());
      expect(addToCart).not.toHaveBeenCalled();
    });
  });

  describe("groupOrderBumpsByTitle", () => {
    it("agrupa ofertas por título normalizado preservando ordem da primeira aparição e fallback padrão", () => {
      const presunto = { ...offer("presunto", 6.5), sectionTitle: "Frios & Queijos" };
      const mussarela = { ...offer("mussarela", 8.5), sectionTitle: "  Frios & Queijos  " };
      const cocaBebida = { ...offer("coca-2l", 12), sectionTitle: "Leve junto uma Bebida" };
      const guaranazinho = { ...offer("guarana", 7), sectionTitle: "Leve junto uma Bebida" };
      const semTitulo = { ...offer("extra", 5), sectionTitle: "   " };

      const groups = groupOrderBumpsByTitle([presunto, cocaBebida, mussarela, semTitulo, guaranazinho]);

      expect(groups.map((g) => g.title)).toEqual([
        "Frios & Queijos",
        "Leve junto uma Bebida",
        "Peça também",
      ]);
      expect(groups[0].offers.map((o) => o.product.id)).toEqual(["presunto", "mussarela"]);
      expect(groups[1].offers.map((o) => o.product.id)).toEqual(["coca-2l", "guarana"]);
      expect(groups[2].offers.map((o) => o.product.id)).toEqual(["extra"]);
    });

    it("retorna lista vazia quando não há ofertas", () => {
      expect(groupOrderBumpsByTitle([])).toEqual([]);
    });
  });
});
