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
