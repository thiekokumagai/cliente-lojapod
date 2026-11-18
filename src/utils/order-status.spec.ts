import { describe, it, expect } from "vitest";
import { formatOrderStatus } from "./order-status";

describe("formatOrderStatus", () => {
  it.each([
    ["PENDING", undefined, "Pedido Recebido"],
    ["CONFIRMED", undefined, "Em Preparo"],
    ["DISPATCHED", undefined, "Saiu para Entrega"],
    ["COMPLETED", undefined, "Entregue"],
    ["CANCELLED", undefined, "Pedido Cancelado"],
    ["CANCELED", undefined, "Pedido Cancelado"],
    ["pending", undefined, "Pedido Recebido"],
    ["  Completed ", undefined, "Entregue"],
  ])("%s (entrega) -> %s", (status, modality, expected) => {
    expect(formatOrderStatus(status, modality)).toBe(expected);
  });

  it.each([
    ["PENDING", "Pedido Recebido"],
    ["CONFIRMED", "Pronto para Retirada"],
    ["DISPATCHED", "Pronto para Retirada"],
    ["COMPLETED", "Retirado"],
    ["CANCELLED", "Pedido Cancelado"],
  ])("%s (retirada na loja) -> %s", (status, expected) => {
    expect(formatOrderStatus(status, "STORE_PICKUP")).toBe(expected);
  });

  it("sem status: Pedido Recebido (como o padrão antigo PENDING)", () => {
    expect(formatOrderStatus(undefined)).toBe("Pedido Recebido");
    expect(formatOrderStatus(null)).toBe("Pedido Recebido");
    expect(formatOrderStatus("")).toBe("Pedido Recebido");
  });

  it("status desconhecido: nunca sai o código cru", () => {
    expect(formatOrderStatus("REFUNDED")).toBe("Status indisponível");
    expect(formatOrderStatus("SOME_NEW_STATUS")).not.toMatch(/SOME_NEW_STATUS|_/);
  });

  it("nenhum status conhecido sai em inglês", () => {
    for (const s of ["PENDING", "CONFIRMED", "DISPATCHED", "COMPLETED", "CANCELLED"]) {
      expect(formatOrderStatus(s)).not.toMatch(/pending|confirmed|dispatched|completed|cancelled|canceled/i);
    }
  });
});
