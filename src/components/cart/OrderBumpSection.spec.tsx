import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";

// Nada de rede: ofertas, pixel e análise do carrinho são mocks.
const getSuggestions = vi.fn();
vi.mock("@/services/order-bumps", () => ({
  orderBumpsService: { getSuggestions: (...args: unknown[]) => getSuggestions(...args) },
}));
vi.mock("@/components/FacebookPixel", () => ({ trackEvent: vi.fn(), trackCustomEvent: vi.fn() }));
vi.mock("@/services/analytics", () => ({ syncCartAnalytics: vi.fn() }));

import { OrderBumpSection } from "./OrderBumpSection";
import { CartProvider, useCart } from "@/contexts/CartContext";

const offer = {
  bumpId: "bump-coca",
  sectionTitle: "Peça também",
  product: {
    id: "coca",
    title: "Coca-Cola 310ml",
    price: 6,
    originalPrice: 8,
    hasDiscount: true,
    imageUrl: null,
    totalStock: 50,
    hasVariations: false,
    items: [{ id: "i1", stock: 50 }],
  },
};

const cocaNormal = { id: "coca", name: "Coca-Cola 310ml", image: "", category: "", description: "", price: 8, stock: 50 } as never;
const donuts = { id: "donuts", name: "Donuts", image: "", category: "", description: "", price: 10, stock: 50 } as never;

function Probe() {
  const { items } = useCart();
  return (
    <ul data-testid="cart">
      {items.map((i) => (
        <li key={`${i.product.id}-${i.orderBumpId ?? "n"}`} data-line={`${i.product.id}|${i.orderBumpId ?? ""}|${i.quantity}|${i.product.price}`} />
      ))}
    </ul>
  );
}
function Seed({ products }: { products: unknown[] }) {
  const { addToCart } = useCart();
  return <button onClick={() => products.forEach((p) => addToCart(p as never))}>seed</button>;
}
const lines = () => Array.from(screen.getByTestId("cart").querySelectorAll("li")).map((li) => li.getAttribute("data-line"));

describe("OrderBumpSection (carrinho)", () => {
  beforeEach(() => {
    localStorage.clear();
    getSuggestions.mockReset();
    getSuggestions.mockResolvedValue([offer]);
  });
  afterEach(() => cleanup());

  it("pede só as ofertas do CARRINHO (ou dos dois), com os produtos que estão nele", async () => {
    render(
      <CartProvider>
        <Seed products={[donuts]} />
        <OrderBumpSection />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));

    await waitFor(() => expect(getSuggestions).toHaveBeenCalledWith(["donuts"], "CART"));
    expect(await screen.findByText("Peça também")).toBeInTheDocument();
  });

  it("a oferta entra como linha PRÓPRIA, sem se juntar à linha normal do mesmo produto", async () => {
    render(
      <CartProvider>
        <Seed products={[donuts, cocaNormal]} />
        <OrderBumpSection />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));
    fireEvent.click(await screen.findByLabelText("Adicionar ao carrinho"));

    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(lines()).toContain("coca||1|8"); // normal, preço cheio
    expect(lines()).toContain("coca|bump-coca|1|6"); // oferta, preço da oferta
  });

  it("os botões +/− da oferta mexem só na linha da oferta", async () => {
    render(
      <CartProvider>
        <Seed products={[donuts, cocaNormal]} />
        <OrderBumpSection />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));
    fireEvent.click(await screen.findByLabelText("Adicionar ao carrinho"));
    fireEvent.click(await screen.findByLabelText("Aumentar Coca-Cola 310ml"));
    await waitFor(() => expect(lines()).toContain("coca|bump-coca|2|6"));
    expect(lines()).toContain("coca||1|8");

    fireEvent.click(screen.getByLabelText("Diminuir Coca-Cola 310ml"));
    await waitFor(() => expect(lines()).toContain("coca|bump-coca|1|6"));
    expect(lines()).toContain("coca||1|8");
  });

  it("separa sugestões do carrinho em blocos distintos quando os títulos de seção são diferentes", async () => {
    getSuggestions.mockResolvedValue([
      {
        ...offer,
        bumpId: "bump-presunto",
        sectionTitle: "Frios & Queijos",
        product: { ...offer.product, id: "presunto", title: "Presunto 100g" },
      },
      {
        ...offer,
        bumpId: "bump-mussarela",
        sectionTitle: "Frios & Queijos",
        product: { ...offer.product, id: "mussarela", title: "Mussarela 100g" },
      },
      {
        ...offer,
        bumpId: "bump-coca",
        sectionTitle: "Leve junto uma Bebida",
        product: { ...offer.product, id: "coca", title: "Coca-Cola 310ml" },
      },
    ]);

    render(
      <CartProvider>
        <Seed products={[donuts]} />
        <OrderBumpSection />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));

    const groups = await screen.findAllByTestId("cart-order-bump-group");
    expect(groups).toHaveLength(2);

    expect(within(groups[0]).getByRole("heading", { name: "Frios & Queijos" })).toBeInTheDocument();
    expect(within(groups[0]).getByText("Presunto 100g")).toBeInTheDocument();
    expect(within(groups[0]).getByText("Mussarela 100g")).toBeInTheDocument();
    expect(within(groups[0]).queryByText("Coca-Cola 310ml")).not.toBeInTheDocument();

    expect(within(groups[1]).getByRole("heading", { name: "Leve junto uma Bebida" })).toBeInTheDocument();
    expect(within(groups[1]).getByText("Coca-Cola 310ml")).toBeInTheDocument();
    expect(within(groups[1]).queryByText("Presunto 100g")).not.toBeInTheDocument();
  });
});

describe("OrderBumpSection: oferta de produto com montagem", () => {
  const burgerOffer = {
    ...offer,
    bumpId: "bump-burger",
    product: { ...offer.product, id: "burger", title: "Hambúrguer", price: 90, originalPrice: 100, isCustomizable: true },
  };

  beforeEach(() => {
    localStorage.clear();
    getSuggestions.mockReset();
  });
  afterEach(() => cleanup());

  async function clickAdd(name: string) {
    const card = (await screen.findByText(name)).closest("article") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Adicionar ao carrinho" }));
  }

  it("loja de comida: o '+' abre a tela do produto (preço normal) e NÃO adiciona", async () => {
    getSuggestions.mockResolvedValue([burgerOffer, offer]);
    const onOpenProductDetails = vi.fn();
    render(
      <CartProvider>
        <Seed products={[donuts]} />
        <OrderBumpSection businessType="FOOD" onOpenProductDetails={onOpenProductDetails} />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));

    await clickAdd("Hambúrguer");
    expect(onOpenProductDetails).toHaveBeenCalledTimes(1);
    expect(onOpenProductDetails.mock.calls[0][0]).toMatchObject({ id: "burger", price: 100, isPromo: false, isCustomizable: true });
    expect(lines()).toEqual(["donuts||1|10"]);

    // Produto simples continua indo direto, como oferta
    await clickAdd("Coca-Cola 310ml");
    expect(lines()).toEqual(["donuts||1|10", "coca|bump-coca|1|6"]);
    expect(onOpenProductDetails).toHaveBeenCalledTimes(1);
  });

  it("mesmo sem quem abra a tela do produto, produto com montagem nunca entra direto", async () => {
    getSuggestions.mockResolvedValue([burgerOffer]);
    render(
      <CartProvider>
        <Seed products={[donuts]} />
        <OrderBumpSection businessType="ACAI" />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));
    await clickAdd("Hambúrguer");
    expect(lines()).toEqual(["donuts||1|10"]);
  });

  it("loja de varejo (sem montagem): continua adicionando direto", async () => {
    getSuggestions.mockResolvedValue([burgerOffer]);
    render(
      <CartProvider>
        <Seed products={[donuts]} />
        <OrderBumpSection businessType="POD" />
        <Probe />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("seed"));
    await clickAdd("Hambúrguer");
    expect(lines()).toEqual(["donuts||1|10", "burger|bump-burger|1|90"]);
  });
});
