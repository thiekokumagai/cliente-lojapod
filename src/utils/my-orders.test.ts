import { beforeEach, describe, expect, it, vi } from "vitest";

const getStoreOrder = vi.fn();
vi.mock("@/services/orders", () => ({ ordersService: { getStoreOrder: (id: string) => getStoreOrder(id) } }));
vi.mock("@/services/api", () => ({ getSubdomain: () => "loja-a" }));

import { refreshActiveOrders, rememberOrder } from "./my-orders";

const KEY = "my-tracked-orders-v1";
const now = () => new Date().toISOString();
const yesterday = () => new Date(Date.now() - 36 * 3600 * 1000).toISOString();
const stored = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const seed = (orders: object[]) => localStorage.setItem(KEY, JSON.stringify(orders));

describe("my-orders", () => {
  beforeEach(() => {
    localStorage.clear();
    getStoreOrder.mockReset();
  });

  it("guarda só id, número, loja e data (sem dado pessoal)", () => {
    rememberOrder({ id: "o1", orderNumber: 12, createdAt: now() });
    expect(Object.keys(stored()[0]).sort()).toEqual(["createdAt", "id", "orderNumber", "store"]);
    expect(stored()[0].store).toBe("loja-a");
  });

  it("lista só pedidos em andamento e limpa finalizados, cancelados, antigos e inexistentes", async () => {
    seed([
      { id: "ativo", orderNumber: 1, store: "loja-a", createdAt: now() },
      { id: "pronto", orderNumber: 2, store: "loja-a", createdAt: now() },
      { id: "cancelado", orderNumber: 3, store: "loja-a", createdAt: now() },
      { id: "sumiu", orderNumber: 4, store: "loja-a", createdAt: now() },
      { id: "ontem", orderNumber: 5, store: "loja-a", createdAt: yesterday() },
      { id: "rede", orderNumber: 6, store: "loja-a", createdAt: now() },
      { id: "outra", orderNumber: 7, store: "loja-b", createdAt: now() },
    ]);
    getStoreOrder.mockImplementation(async (id: string) => {
      if (id === "ativo") return { status: "CONFIRMED", deliveryModality: "STORE_PICKUP" };
      if (id === "pronto") return { status: "COMPLETED" };
      if (id === "cancelado") return { status: "CANCELLED" };
      if (id === "sumiu") throw Object.assign(new Error("nf"), { status: 404 });
      throw new Error("offline");
    });

    const active = await refreshActiveOrders();

    expect(active.map((o) => o.id).sort()).toEqual(["ativo", "rede"]);
    expect(active.find((o) => o.id === "rede")?.status).toBeNull();
    expect(getStoreOrder).not.toHaveBeenCalledWith("outra");
    expect(getStoreOrder).not.toHaveBeenCalledWith("ontem");
    expect(stored().map((o: { id: string }) => o.id).sort()).toEqual(["ativo", "outra", "rede"]);
  });

  it("não mostra nada e limpa o storage quando não há pedido em andamento", async () => {
    seed([{ id: "x", orderNumber: 1, store: "loja-a", createdAt: now() }]);
    getStoreOrder.mockResolvedValue({ status: "COMPLETED" });
    expect(await refreshActiveOrders()).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
