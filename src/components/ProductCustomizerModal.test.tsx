import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const get = vi.fn();
vi.mock("@/services/api", () => ({
  api: { get: (...args: unknown[]) => get(...args) },
}));

import ProductCustomizerModal from "./ProductCustomizerModal";
import { apiResponse } from "@/test/fixtures/compositions";

function renderModal(onConfirm = vi.fn()) {
  get.mockResolvedValue(apiResponse);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductCustomizerModal
        isOpen
        onClose={vi.fn()}
        product={{ id: "pMarmita", name: "Marmita", price: 25 } as never}
        onConfirm={onConfirm}
      />
    </QueryClientProvider>,
  );
  return onConfirm;
}

describe("ProductCustomizerModal com a resposta real da API", () => {
  it("abre as etapas de { product, stages } e cobra o que o servidor cobra", async () => {
    const onConfirm = renderModal();

    expect(await screen.findByText("1. Carne")).toBeInTheDocument();
    expect(screen.getByText("2. Molhos")).toBeInTheDocument();
    expect(screen.getByText("+ R$15,00")).toBeInTheDocument();

    // Carne (máx 3, sem grátis): Picanha x1. Molhos (2 grátis): Molho 1 x2 + Molho 2 x1.
    const plusButtons = () =>
      screen.getAllByRole("button").filter((b) => b.querySelector("svg.lucide-plus"));
    fireEvent.click(plusButtons()[0]);
    fireEvent.click(plusButtons()[1]);
    fireEvent.click(plusButtons()[1]);
    fireEvent.click(plusButtons()[2]);

    // 25 + 15 + 1 molho pago (3) = 43
    expect(screen.getByText("R$43,00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Adicionar ao Carrinho/ }));
    const item = onConfirm.mock.calls[0][0];
    expect(item.isCustomized).toBe(true);
    expect(item.product.price).toBe(43);
    expect(item.customizationSnapshot.stages).toEqual([
      {
        groupId: "gCarne",
        groupName: "Carne",
        options: [{ optionId: "optPicanha", name: "Picanha", quantity: 1, unitPrice: 15, totalPrice: 15 }],
      },
      {
        groupId: "gMolhos",
        groupName: "Molhos",
        options: [
          { optionId: "optMolho1", name: "Molho 1", quantity: 2, unitPrice: 3, totalPrice: 0 },
          { optionId: "optMolho2", name: "Molho 2", quantity: 1, unitPrice: 3, totalPrice: 3 },
        ],
      },
    ]);
  });
});
