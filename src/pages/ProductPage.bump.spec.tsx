import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Nada de rede: ofertas, produto, configurações da loja, pixel e análise do carrinho são mocks.
const getSuggestions = vi.fn();
vi.mock("@/services/order-bumps", () => ({
  orderBumpsService: { getSuggestions: (...args: unknown[]) => getSuggestions(...args) },
}));

const donuts = {
  id: "donuts",
  name: "Donuts Recheado com Brigadeiro",
  image: "",
  images: [],
  category: "Doces",
  categoryId: "doces",
  description: "Donuts fofinho e macio",
  price: 10.9,
  stock: 30,
  isVisible: true,
};
vi.mock("@/hooks/useProducts", () => ({ useProduct: () => ({ data: donuts, isLoading: false }) }));
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: { enableStockAlertNotification: true, theme: "classic" } }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/use-store-mobile-padding", () => ({ useStoreMobilePadding: () => 0 }));
vi.mock("@/components/FacebookPixel", () => ({ trackEvent: vi.fn(), trackCustomEvent: vi.fn() }));
vi.mock("@/services/analytics", () => ({ syncCartAnalytics: vi.fn() }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/MenuExpressHeader", () => ({ default: () => null }));
vi.mock("@/components/UrbanHeader", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/components/product/ProductContact", () => ({ default: () => null }));
vi.mock("@/components/product/ProductDesktopGallery", () => ({ default: () => null }));
vi.mock("@/components/product/ProductMobileGallery", () => ({ default: () => null }));
vi.mock("@/components/product/ProductInfo", () => ({ default: () => null }));

import ProductPage from "./ProductPage";
import { CartProvider, useCart } from "@/contexts/CartContext";

const offer = (id: string, title: string, price: number, sectionTitle = "Leve junto uma Bebida") => ({
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
  },
});

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/produto/donuts"]}>
      <CartProvider>
        <Routes>
          <Route path="/produto/:id" element={<ProductPage />} />
          <Route path="*" element={<div>lista</div>} />
        </Routes>
        <CartProbe />
      </CartProvider>
    </MemoryRouter>,
  );
}

// A página tem duas diagramações (celular e computador) no DOM; os dois grupos dividem a mesma escolha.
const plus = (name: string) => screen.getAllByLabelText(`Adicionar ${name}`)[0];

describe("ProductPage: grupo 'Peça também' dentro da página do produto", () => {
  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn();
    getSuggestions.mockReset();
    getSuggestions.mockResolvedValue([offer("coca", "Coca-Cola 310ml", 7), offer("fanta", "Fanta 310ml", 6.5)]);
  });
  afterEach(() => cleanup());

  it("pede as ofertas da tela do produto e mostra o grupo com título e sem 'Escolha até 10 opções'", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));
    expect(getSuggestions).toHaveBeenCalledWith(["donuts"], "PRODUCT");
    expect(screen.getAllByText("Leve junto uma Bebida").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Escolha até/)).not.toBeInTheDocument();
    expect(screen.getAllByText("+ R$ 7,00").length).toBeGreaterThan(0);
  });

  it("o + só guarda a escolha: o carrinho não muda e o botão passa a mostrar o total somado", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Adicionar ao Pedido").length).toBeGreaterThan(0);

    fireEvent.click(plus("Coca-Cola 310ml"));
    fireEvent.click(plus("Coca-Cola 310ml"));
    fireEvent.click(plus("Fanta 310ml"));

    expect(lines()).toEqual([]);
    expect(screen.getAllByText("Adicionar ao Pedido · R$ 31,40").length).toBeGreaterThan(0); // 10,90 + 2×7 + 6,50
  });

  it("Adicionar ao Pedido coloca o produto e as ofertas no carrinho, cada oferta com o preço da oferta", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));

    fireEvent.click(plus("Coca-Cola 310ml"));
    fireEvent.click(plus("Coca-Cola 310ml"));
    fireEvent.click(screen.getAllByText("Adicionar ao Pedido · R$ 24,90")[0]);

    await waitFor(() => expect(lines()).toHaveLength(2));
    expect(lines()).toContain("donuts||1|10.9");
    expect(lines()).toContain("coca|bump-coca|2|7");
  });

  it("sem escolher oferta, só o produto entra", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText("Adicionar ao Pedido")[0]);

    await waitFor(() => expect(lines()).toEqual(["donuts||1|10.9"]));
  });

  it("sem limite fixo no grupo: permite ultrapassar 10 unidades", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));

    for (let i = 0; i < 12; i++) fireEvent.click(plus("Coca-Cola 310ml"));

    expect(screen.getAllByText("12 selecionados").length).toBeGreaterThan(0);
    expect(plus("Coca-Cola 310ml")).not.toBeDisabled();
  });

  it("sem ofertas a página fica como sempre foi", async () => {
    getSuggestions.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(getSuggestions).toHaveBeenCalled());

    expect(screen.queryByTestId("product-order-bump-group")).not.toBeInTheDocument();
    expect(screen.getAllByText("Adicionar ao Pedido").length).toBeGreaterThan(0);
  });

  it("separa sugestões com títulos distintos em seções próprias (ex.: Frios & Queijos e Leve junto uma Bebida)", async () => {
    getSuggestions.mockResolvedValue([
      offer("presunto", "Presunto 100g", 4.5, "Frios & Queijos"),
      offer("mussarela", "Mussarela 100g", 6.5, "Frios & Queijos"),
      offer("coca", "Coca-Cola 310ml", 7, "Leve junto uma Bebida"),
      offer("fanta", "Fanta 310ml", 6.5, "Leve junto uma Bebida"),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId("product-order-bump-group").length).toBeGreaterThan(0));

    const firstContainer = screen.getAllByTestId("product-order-bump-group")[0];
    const sections = within(firstContainer).getAllByTestId("product-order-bump-section");
    expect(sections).toHaveLength(2);

    expect(within(sections[0]).getByRole("heading", { name: "Frios & Queijos" })).toBeInTheDocument();
    expect(within(sections[0]).getByText("Presunto 100g")).toBeInTheDocument();
    expect(within(sections[0]).getByText("Mussarela 100g")).toBeInTheDocument();
    expect(within(sections[0]).queryByText("Coca-Cola 310ml")).not.toBeInTheDocument();

    expect(within(sections[1]).getByRole("heading", { name: "Leve junto uma Bebida" })).toBeInTheDocument();
    expect(within(sections[1]).getByText("Coca-Cola 310ml")).toBeInTheDocument();
    expect(within(sections[1]).getByText("Fanta 310ml")).toBeInTheDocument();
    expect(within(sections[1]).queryByText("Presunto 100g")).not.toBeInTheDocument();

    fireEvent.click(plus("Presunto 100g"));
    fireEvent.click(plus("Coca-Cola 310ml"));
    expect(screen.getAllByText("Adicionar ao Pedido · R$ 22,40").length).toBeGreaterThan(0);
  });
});
