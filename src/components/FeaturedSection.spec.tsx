import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeaturedSection from "./FeaturedSection";

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    selectedCategory: null,
    selectedCategoryId: null,
    searchTerm: "",
    selectedNicotineStrength: null,
    selectedVariationFilters: [],
    sortOption: "newest",
    items: [],
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    data: [
      { id: "p1", name: "Produto Destaque 1", price: 25, isFeatured: true, image: "/img1.jpg", isBestSeller: true },
      { id: "p2", name: "Produto Destaque 2", price: 30, isFeatured: true, image: "/img2.jpg" },
      { id: "p3", name: "Produto Destaque 3", price: 35, isFeatured: true, image: "/img3.jpg" },
    ],
  }),
  useCategories: () => ({ data: [] }),
}));

vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({
    data: { enableStockAlertNotification: true },
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

describe("FeaturedSection e Carrossel Mobile", () => {
  it("renderiza container com classes de scroll snap nativo acelerado por hardware", () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedSection />
      </MemoryRouter>
    );

    const scrollContainer = container.querySelector(".snap-x.snap-mandatory");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("overflow-x-auto");
    expect(scrollContainer?.className).toContain("scroll-smooth");
    expect(scrollContainer?.className).toContain("overscroll-x-contain");
  });

  it("configura imagens dos 2 primeiros cards como eager e o terceiro como lazy para evitar sobrecarga no mobile", () => {
    render(
      <MemoryRouter>
        <FeaturedSection />
      </MemoryRouter>
    );

    const img1 = screen.getByAltText("Produto Destaque 1");
    const img2 = screen.getByAltText("Produto Destaque 2");
    const img3 = screen.getByAltText("Produto Destaque 3");

    expect(img1).toHaveAttribute("loading", "eager");
    expect(img2).toHaveAttribute("loading", "eager");
    expect(img3).toHaveAttribute("loading", "lazy");

    expect(img1).toHaveAttribute("decoding", "async");
    expect(img1).toHaveAttribute("width", "400");
    expect(img1).toHaveAttribute("height", "400");
  });

  it("selo de mais vendido possui dimensões explícitas e decoding assíncrono", () => {
    render(
      <MemoryRouter>
        <FeaturedSection />
      </MemoryRouter>
    );

    const selo = screen.getByAltText("Selo Mais Vendido");
    expect(selo).toHaveAttribute("width", "40");
    expect(selo).toHaveAttribute("height", "40");
    expect(selo).toHaveAttribute("decoding", "async");
  });

  it("setas de navegação acionam scrollBy suavemente no container", () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedSection />
      </MemoryRouter>
    );

    const scrollContainer = container.querySelector(".snap-x.snap-mandatory") as HTMLElement;
    const scrollByMock = vi.fn();
    scrollContainer.scrollBy = scrollByMock;

    const nextBtn = screen.getByLabelText("Próximo");
    fireEvent.click(nextBtn);
    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );

    const prevBtn = screen.getByLabelText("Anterior");
    fireEvent.click(prevBtn);
    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );
  });
});
