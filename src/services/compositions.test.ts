import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("./api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
}));

import { calculateCustomization, compositionsService } from "./compositions";
import { apiResponse } from "@/test/fixtures/compositions";

describe("compositionsService.getProductCompositions", () => {
  beforeEach(() => get.mockReset());

  it("chama o endpoint público e devolve { product, stages } como a API manda", async () => {
    get.mockResolvedValue(apiResponse);
    const res = await compositionsService.getProductCompositions("pMarmita");
    expect(get).toHaveBeenCalledWith("/store/compositions/product/pMarmita");
    expect(res.stages[1].freeQuantity).toBe(2);
    expect(res.stages[0].options[0].price).toBe(15);
  });
});

// Os mesmos casos de api-lojapod create-order.public.spec.ts ("montagem [SEGURANÇA]"):
// o preço que o front manda tem que ser o que o servidor aceita.
describe("calculateCustomization (paridade com o backend)", () => {
  it("6 molhos com 2 grátis cobram 4 x R$ 3 = R$ 12, como no servidor", () => {
    const r = calculateCustomization(
      apiResponse.stages,
      { gCarne: { optPicanha: 1 }, gMolhos: { optMolho1: 2, optMolho2: 2, optMolho3: 2 } },
      25,
    );
    expect(r.stages[1].options.map((o) => o.totalPrice)).toEqual([0, 6, 6]);
    expect(r.totalAdditions).toBe(27); // 15 picanha + 12 molhos
    expect(r.finalUnitPrice).toBe(52);
  });

  it("cota grátis de Molhos não vale para Carne", () => {
    const r = calculateCustomization(apiResponse.stages, { gCarne: { optPicanha: 1 }, gMolhos: { optMolho1: 1 } }, 25);
    expect(r.totalAdditions).toBe(15);
    expect(r.finalUnitPrice).toBe(40);
    expect(r.isAllValid).toBe(true);
  });

  it("monta o snapshot com groupId real e só optionId/quantity relevantes para o servidor", () => {
    const r = calculateCustomization(apiResponse.stages, { gCarne: { optPicanha: 2 } }, 25);
    expect(r.stages).toEqual([
      {
        groupId: "gCarne",
        groupName: "Carne",
        options: [{ optionId: "optPicanha", name: "Picanha", quantity: 2, unitPrice: 15, totalPrice: 30 }],
      },
    ]);
    expect(r.finalUnitPrice).toBe(55);
  });

  it("bloqueia confirmar sem o mínimo da etapa", () => {
    const r = calculateCustomization(apiResponse.stages, {}, 25);
    expect(r.isAllValid).toBe(false);
    expect(r.pendingStageMessage).toContain("Carne");
  });
});

describe("calculateCustomization — proteção defensiva min > max e plural", () => {
  it("normaliza etapa legada com min > max (ex.: Min 3 / Max 1) para não travar a compra e usa plural correto", () => {
    const legacyStage = {
      id: "pc1",
      groupId: "g1",
      name: "Ingredientes",
      minQuantity: 3,
      maxQuantity: 1,
      freeQuantity: 0,
      sortOrder: 0,
      options: [{ id: "o1", name: "Bacon", price: 5, maxQuantityPerItem: 1, sortOrder: 0 }],
    };

    const pending = calculateCustomization([legacyStage], {}, 30);
    expect(pending.isAllValid).toBe(false);
    expect(pending.pendingStageMessage).toBe('Escolha ao menos 1 opção em "Ingredientes"');
    expect(pending.firstPendingGroupId).toBe("g1");

    const satisfied = calculateCustomization([legacyStage], { g1: { o1: 1 } }, 30);
    expect(satisfied.isAllValid).toBe(true);
    expect(satisfied.finalUnitPrice).toBe(35);
  });

  it("usa plural 'opções' quando mínimo efetivo > 1", () => {
    const stage = {
      id: "pc2",
      groupId: "g2",
      name: "Sabores",
      minQuantity: 2,
      maxQuantity: 3,
      freeQuantity: 0,
      sortOrder: 0,
      options: [{ id: "o1", name: "Morango", price: 0, maxQuantityPerItem: 1, sortOrder: 0 }],
    };
    const pending = calculateCustomization([stage], {}, 20);
    expect(pending.pendingStageMessage).toBe('Escolha ao menos 2 opções em "Sabores"');
  });
});
