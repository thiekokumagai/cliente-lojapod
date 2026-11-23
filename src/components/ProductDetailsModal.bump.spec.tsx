import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";

// Nada de rede: ofertas, composições, configurações da loja, pixel e análise do carrinho são mocks.
const getSuggestions = vi.fn();
const getProductCompositions = vi.fn();
let mockStoreSettings: { enableStockAlertNotification: boolean; phone: string; businessType?: string } = {
  enableStockAlertNotification: true,
  phone: "",
  businessType: "POD",
};

vi.mock("@/services/order-bumps", () => ({
  orderBumpsService: { getSuggestions: (...args: unknown[]) => getSuggestions(...args) },
}));
vi.mock("@/services/compositions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/compositions")>();
  return {
    ...actual,
    compositionsService: {
      ...actual.compositionsService,
      getProductCompositions: (...args: unknown[]) => getProductCompositions(...args),
    },
  };
});
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: mockStoreSettings }),
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

const customBox = {
  id: "caixa-doces",
  name: "Caixa com 10 Doces",
  image: "",
  images: [],
  category: "Doces",
  description: "Monte sua caixa",
  price: 100,
  stock: 20,
  isCustomizable: true,
} as never;

const offer = (
  id: string,
  title: string,
  price: number,
  extra: Record<string, unknown> = {},
  sectionTitle = "Leve junto uma Bebida",
) => ({
  bumpId: `bump-${id}`,
  sectionTitle,
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
      {items.map((i, idx) => (
        <li
          key={`${i.product.id}-${i.orderBumpId ?? i.customizationLineId ?? "normal"}-${idx}`}
          data-line={`${i.product.id}|${i.orderBumpId ?? ""}|${i.quantity}|${i.product.price}`}
          data-obs={i.observation ?? ""}
          data-custom={i.isCustomized ? "1" : "0"}
        />
      ))}
    </ul>
  );
}

const lines = () => Array.from(screen.getByTestId("cart").querySelectorAll("li")).map((li) => li.getAttribute("data-line"));
const cartItemsMeta = () =>
  Array.from(screen.getByTestId("cart").querySelectorAll("li")).map((li) => ({
    line: li.getAttribute("data-line"),
    obs: li.getAttribute("data-obs"),
    custom: li.getAttribute("data-custom"),
  }));

function renderModal(product = donuts, onClose = () => {}) {
  return render(
    <CartProvider>
      <ProductDetailsModal product={product} onClose={onClose} />
      <CartProbe />
    </CartProvider>,
  );
}

const total = () => screen.getByText("Adicionar").parentElement!.textContent!.replace(/\s/g, " ");

describe("ProductDetailsModal: grupo 'Peça também' dentro da tela do produto", () => {
  beforeEach(() => {
    localStorage.clear();
    mockStoreSettings = {
      enableStockAlertNotification: true,
      phone: "",
      businessType: "POD",
    };
    getSuggestions.mockReset();
    getProductCompositions.mockReset();
    getProductCompositions.mockResolvedValue({ stages: [] });
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

  it("mostra título, nome, descrição curta e preço de cada oferta (sem 'Escolha até 10 opções')", async () => {
    renderModal();
    const group = await screen.findByTestId("product-order-bump-group");

    expect(within(group).getByText("Leve junto uma Bebida")).toBeInTheDocument();
    expect(within(group).queryByText(/Escolha até/)).not.toBeInTheDocument();
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
    expect(screen.getByText("3 selecionados")).toBeInTheDocument();
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
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument();
  });

  it("sem limite de 10: permite escolher mais de 10 unidades respeitando o estoque", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");

    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));

    expect(screen.getByText("12 selecionados")).toBeInTheDocument();
    expect(screen.getByLabelText("Adicionar Coca-Cola 310ml")).not.toBeDisabled();
    expect(screen.getByLabelText("Adicionar Fanta 310ml")).not.toBeDisabled();
    fireEvent.click(screen.getByText("Adicionar"));
    await waitFor(() => expect(lines()).toContain("coca|bump-coca|12|7"));
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

  it("separa Order Bump em múltiplas seções por título no modal mobile", async () => {
    getSuggestions.mockResolvedValue([
      offer("presunto", "Presunto 100g", 4.5, {}, "Frios & Queijos"),
      offer("coca", "Coca-Cola 310ml", 7, {}, "Leve junto uma Bebida"),
    ]);
    renderModal();

    const group = await screen.findByTestId("product-order-bump-group");
    const sections = within(group).getAllByTestId("product-order-bump-section");
    expect(sections).toHaveLength(2);
    expect(within(sections[0]).getByRole("heading", { name: "Frios & Queijos" })).toBeInTheDocument();
    expect(within(sections[0]).getByText("Presunto 100g")).toBeInTheDocument();
    expect(within(sections[1]).getByRole("heading", { name: "Leve junto uma Bebida" })).toBeInTheDocument();
    expect(within(sections[1]).getByText("Coca-Cola 310ml")).toBeInTheDocument();
  });

  it("não exibe campo de observação em loja POD", async () => {
    renderModal();
    await screen.findByTestId("product-order-bump-group");
    expect(screen.queryByLabelText("Alguma observação?")).not.toBeInTheDocument();
  });

  it("em loja FOOD exibe montagem inline, observação, aviso obrigatório, soma em tempo real e adiciona tudo ao carrinho", async () => {
    mockStoreSettings = {
      enableStockAlertNotification: true,
      phone: "",
      businessType: "FOOD",
    };
    getProductCompositions.mockResolvedValue({
      stages: [
        {
          groupId: "g-sabores",
          name: "Escolha o sabor",
          description: null,
          minQuantity: 1,
          maxQuantity: 1,
          freeQuantity: 0,
          sortOrder: 0,
          options: [
            {
              id: "opt-brigadeiro",
              name: "Brigadeiro Gourmet",
              description: null,
              price: 15,
              maxQuantityPerItem: 1,
              sortOrder: 0,
              isActive: true,
            },
          ],
        },
      ],
    });
    getSuggestions.mockResolvedValue([
      offer("presunto", "Presunto 100g", 5, {}, "Frios & Queijos"),
      offer("coca", "Coca-Cola 310ml", 7, {}, "Leve junto uma Bebida"),
    ]);

    renderModal(customBox);

    expect(await screen.findByTestId("product-customization-section")).toBeInTheDocument();
    expect(screen.queryByText("Monte seu pedido")).not.toBeInTheDocument();
    expect(screen.getByText(/Escolha ao menos 1 opção em "Escolha o sabor"/)).toBeInTheDocument();
    expect(screen.getByLabelText("Alguma observação?")).toBeInTheDocument();
    expect(total()).toContain("R$ 100,00");

    // Clicar sem preencher etapa obrigatória não adiciona ao carrinho
    fireEvent.click(screen.getByText("Adicionar"));
    expect(lines()).toEqual([]);

    // Seleciona opção da montagem (+ R$ 15,00), escreve observação e marca 1 Order Bump (+ R$ 7,00)
    fireEvent.click(screen.getByText("Brigadeiro Gourmet"));
    expect(screen.queryByText(/Escolha ao menos 1 opção em/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Alguma observação?"), {
      target: { value: "  Sem granulado por favor  " },
    });
    expect(screen.getByText("27/300")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Adicionar Coca-Cola 310ml"));
    expect(total()).toContain("R$ 122,00"); // 100 + 15 + 7

    fireEvent.click(screen.getByText("Adicionar"));

    await waitFor(() => expect(cartItemsMeta()).toHaveLength(2));
    expect(cartItemsMeta()).toContainEqual({
      line: "caixa-doces||1|115",
      obs: "Sem granulado por favor",
      custom: "1",
    });
    expect(cartItemsMeta()).toContainEqual({
      line: "coca|bump-coca|1|7",
      obs: "",
      custom: "0",
    });
  });
});
