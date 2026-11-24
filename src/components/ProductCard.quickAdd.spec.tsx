import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Product } from "@/data/products";
import MenuExpressProductCard from "./MenuExpressProductCard";
import UrbanProductCard from "./UrbanProductCard";
import ProductCard from "./ProductCard";
import { requiresProductDetails } from "@/utils/business-type";

const addToCart = vi.fn();
let isMobile = true;

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ items: [], addToCart, updateQuantity: vi.fn(), removeFromCart: vi.fn() }),
}));
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: { businessType: "FOOD", enableStockAlertNotification: true } }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile }));
vi.mock("@/components/ProductDetailsModal", () => ({
  default: ({ product }: { product: Product }) => <div data-testid="details-modal">{product.name}</div>,
}));

const burger: Product = {
  id: "burger",
  name: "Hambúrguer",
  image: "",
  category: "Lanches",
  description: "",
  price: 100,
  stock: 10,
  isCustomizable: true,
};
const coke: Product = { ...burger, id: "coke", name: "Coca-Cola", isCustomizable: false, price: 8 };

const themes = [
  ["menu-express", MenuExpressProductCard],
  ["urban", UrbanProductCard],
] as const;

function renderCard(Card: (typeof themes)[number][1], product: Product) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Card product={product} />} />
        <Route path="/produto/:id" element={<div data-testid="product-page">página do produto</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function clickQuickAdd() {
  fireEvent.click(screen.getAllByRole("button", { name: /adicionar/i })[0]);
}

describe("requiresProductDetails", () => {
  it("só exige a tela do produto para montagem em loja de comida", () => {
    expect(requiresProductDetails({ isCustomizable: true }, "FOOD")).toBe(true);
    expect(requiresProductDetails({ isCustomizable: true }, "ACAI")).toBe(true);
    expect(requiresProductDetails({ isCustomizable: true }, "POD")).toBe(false);
    expect(requiresProductDetails({ isCustomizable: false }, "FOOD")).toBe(false);
    expect(requiresProductDetails({ isCustomizable: true, isCombo: true }, "FOOD")).toBe(false);
  });
});

describe.each(themes)("'+' rápido no tema %s", (_name, Card) => {
  beforeEach(() => {
    addToCart.mockClear();
    isMobile = true;
  });

  it("produto com montagem abre os detalhes no celular e não adiciona", () => {
    renderCard(Card, burger);
    clickQuickAdd();
    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.getByTestId("details-modal")).toHaveTextContent("Hambúrguer");
  });

  it("produto com montagem vai para a página do produto no desktop e não adiciona", () => {
    isMobile = false;
    renderCard(Card, burger);
    clickQuickAdd();
    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.getByTestId("product-page")).toBeInTheDocument();
  });

  it("produto simples continua adicionando direto", () => {
    renderCard(Card, coke);
    clickQuickAdd();
    expect(addToCart).toHaveBeenCalledWith(coke);
    expect(screen.queryByTestId("details-modal")).not.toBeInTheDocument();
  });
});

describe("tema classic", () => {
  beforeEach(() => addToCart.mockClear());

  it("produto com montagem vai para a página do produto e não adiciona", () => {
    renderCard(ProductCard, burger);
    fireEvent.click(screen.getByRole("button", { name: /monte seu pedido/i }));
    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.getByTestId("product-page")).toBeInTheDocument();
  });

  it("produto simples continua adicionando direto", () => {
    renderCard(ProductCard, coke);
    fireEvent.click(screen.getByRole("button", { name: /^comprar$/i }));
    expect(addToCart).toHaveBeenCalledWith(coke);
  });
});
