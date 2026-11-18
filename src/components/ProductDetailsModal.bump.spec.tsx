import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";

// Nada de rede: ofertas, configurações da loja, pixel e análise do carrinho são mocks.
const getSuggestions = vi.fn();
vi.mock("@/services/order-bumps", () => ({
  orderBumpsService: { getSuggestions: (...args: unknown[]) => getSuggestions(...args) },
}));
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: { enableStockAlertNotification: true, phone: "" } }),
}));
vi.mock("@/components/FacebookPixel", () => ({ trackEvent: vi.fn(), trackCustomEvent: vi.fn() }));
vi.mock("@/services/analytics", () => ({ syncCartAnalytics: vi.fn() }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/components/product/ProductContact", () => ({ default: () => null }));

import ProductDetailsModal from "./ProductDetailsModal";
import { CartProvider, useCart } from "@/contexts/CartContext";

const donuts = {
  id: "donuts",
  name: "Donuts Recheado com Brigadeiro",
  image: "",
  images: [],
  category: "Doces",
  description: "Donuts fofinho e macio",
  price: 10.9,
  stock: 30,
} as never;

const offer = (id: string, title: string, price: number, extra: Record<string, unknown> = {}) => ({
  bumpId: `bump-${id}`,
  sectionTitle: "Leve junto uma Bebida",
  product: {
    id,
    title,
    price,
    originalPrice: price,
    hasDiscount: false,
    imageUrl: null,
    description: "Lata 310ml",
    totalStock: 50,
    hasVariations: false,
    items: [{ id: `i-${id}`, stock: 50 }],
    ...extra,
  },
});

/** Mostra o que está no carrinho, para os testes conferirem o resultado real. */
function CartProbe() {
  const { items } = useCart();
  return (
    <ul data-testid="cart">
      {items.map((i) => (
        <li
          key={`${i.product.id}-${i.orderBumpId ?? "normal"}`}
          data-line={`${i.product.id}|${i.orderBumpId ?? ""}|${i.quantity}|${i.product.price}`}
        />
      ))}
    </ul>
  );
}

const lines = () => Array.from(screen.getByTestId("cart").querySelectorAll("li")).map((li) => li.getAttribute("data-line"));

function renderModal() {
  return render(
    <CartProvider>
      <ProductDetailsModal product={donuts} onClose={() => {}} />
      <CartProbe />
    </CartProvider>,
  );
}

const total = () => screen.getByText("Adicionar").parentElement!.textContent!.replace(/\s/g, " ");

describe("ProductDetailsModal: grupo 'Peça também' dentro da tela do produto", () => {
  beforeEach(() => {
    localStorage.clear();
    getSuggestions.mockReset();
    getSuggestions.mockResolvedValue([
      offer("coca", "Coca-Cola 310ml", 7),
      offer("fanta", "Fanta 310ml", 6.5),
    ]);
  });
  afterEach(() => cleanup());

  it("pede as ofertas DA TELA DO PRODUTO para este produto", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");
    expect(getSuggestions).toHaveBeenCalledWith(["donuts"], "PRODUCT");
  });

  it("mostra título, 'Escolha até 10 opções', nome, descrição curta e preço de cada oferta", async () => {
    renderModal();
    const group = await screen.findByTestId("product-order-bump-group");

    expect(within(group).getByText("Leve junto uma Bebida")).toBeInTheDocument();
    expect(within(group).getByText("Escolha até 10 opções")).toBeInTheDocument();
    expect(within(group).getByText("Coca-Cola 310ml")).toBeInTheDocument();
    expect(within(group).getAllByText("Lata 310ml")).toHaveLength(2);
    expect(within(group).getByText("+ R$ 7,00")).toBeInTheDocument();
    expect(within(group).getByText("+ R$ 6,50")).toBeInTheDocument();
  });

  it("o + só GUARDA a escolha: nada entra no carrinho, e o total do Adicionar soma as ofertas", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");
    expect(total()).toContain("R$ 10,90");

    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    fireEvent.click(screen.getByLabelText("Adicionar Fanta 310ml"));

    expect(lines()).toEqual([]); // carrinho continua vazio
    expect(total()).toContain("R$ 31,40"); // 10,90 + 2×7,00 + 6,50
    expect(screen.getByText("3/10")).toBeInTheDocument();
  });

  it("o Adicionar coloca o produto e as ofertas no carrinho, cada oferta com o preço da oferta", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    fireEvent.click(screen.getByLabelText("Adicionar Fanta 310ml"));
    fireEvent.click(screen.getByText("Adicionar"));

    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(lines()).toContain("donuts||1|10.9");
    expect(lines()).toContain("coca|bump-coca|2|7");
    expect(lines()).toContain("fanta|bump-fanta|1|6.5");
  });

  it("sem escolher nenhuma oferta, o Adicionar põe só o produto", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    fireEvent.click(screen.getByText("Adicionar"));

    await waitFor(() => expect(lines()).toEqual(["donuts||1|10.9"]));
  });

  it("o botão − tira da escolha, e voltar a zero tira a oferta do total", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    expect(total()).toContain("R$ 17,90");
    fireEvent.click(screen.getByLabelText("Diminuir Coca-Cola 310ml"));

    expect(total()).toContain("R$ 10,90");
    expect(screen.queryByText("1/10")).not.toBeInTheDocument();
  });

  it("limite fixo de 10 unidades no grupo: o + trava", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));

    expect(screen.getByText("10/10")).toBeInTheDocument();
    expect(screen.getByLabelText("Adicionar Coca-Cola 310ml")).toBeDisabled();
    expect(screen.getByLabelText("Adicionar Fanta 310ml")).toBeDisabled();
    fireEvent.click(screen.getByText("Adicionar"));
    await waitFor(() => expect(lines()).toContain("coca|bump-coca|10|7"));
  });

  it("respeita o estoque da oferta", async () => {
    getSuggestions.mockResolvedValue([offer("raro", "Suco raro", 9, { totalStock: 2 })]);
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByLabelText("Adicionar Suco raro"));

    expect(screen.getByLabelText("Adicionar Suco raro")).toBeDisabled();
    expect(total()).toContain("R$ 28,90"); // 10,90 + 2×9,00
  });

  it("oferta de produto com variação não aparece na tela do produto (fica no carrinho)", async () => {
    getSuggestions.mockResolvedValue([
      offer("tam", "Suco de caixa", 5, { hasVariations: true }),
      offer("coca", "Coca-Cola 310ml", 7),
    ]);
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    expect(screen.queryByLabelText("Adicionar Suco de caixa")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Adicionar Coca-Cola 310ml")).toBeInTheDocument();
  });

  it("sem ofertas (ou erro de rede) a tela do produto fica como sempre foi", async () => {
    getSuggestions.mockResolvedValue([]);
    renderModal();
    await waitFor(() => expect(getSuggestions).toHaveBeenCalled());
    expect(screen.queryByTestId("product-order-bump-group")).not.toBeInTheDocument();

    cleanup();
    getSuggestions.mockRejectedValue(new Error("rede"));
    renderModal();
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("product-order-bump-group")).not.toBeInTheDocument();
    expect(screen.getByText("Adicionar")).toBeInTheDocument();
  });

  it("a mesma bebida que já está no carrinho como linha normal NÃO se junta à da oferta", async () => {
    // Coca já no carrinho, normal (R$ 8). A oferta dela (R$ 7) entra como outra linha.
    function Seed() {
      const { addToCart } = useCart();
      return (
        <button
          onClick={() =>
            addToCart({ id: "coca", name: "Coca-Cola 310ml", image: "", category: "", description: "", price: 8, stock: 50 } as never)
          }
        >
          seed
        </button>
      );
    }
    render(
      <CartProvider>
        <Seed />
        <ProductDetailsModal product={donuts} onClose={() => {}} />
        <CartProbe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));
    await screen.findByTestId("product-order-bump-group");

    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    fireEvent.click(screen.getByText("Adicionar"));

    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(lines()).toContain("coca||1|8");
    expect(lines()).toContain("coca|bump-coca|1|7");
  });
});
