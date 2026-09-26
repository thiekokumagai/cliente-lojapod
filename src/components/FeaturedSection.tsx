import ProductCard from "./ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { matchesProductSearch } from "@/utils/search";
import { useEffect, useRef, useState } from "react";

const FeaturedSection = () => {
  const { selectedCategory, searchTerm, selectedNicotineStrength, selectedVariationFilters } = useCart();
  const { data: allProducts = [] } = useProducts();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Produtos destacados que passam nos filtros ativos
  const featuredProducts = allProducts.filter((p) => p.isFeatured);

  const visibleProducts = featuredProducts.filter((product) => {
    const groups =
      product.variationGroups && product.variationGroups.length > 0
        ? product.variationGroups
        : product.variationGroup
          ? [product.variationGroup]
          : [];

    const hasAvailableVariations =
      groups.length > 0
        ? groups.some((group) => group.options.some((option) => option.available))
        : true;
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSearch = matchesProductSearch(searchTerm, product);

    const activeFilters =
      selectedVariationFilters.length > 0
        ? selectedVariationFilters
        : selectedNicotineStrength
          ? [selectedNicotineStrength]
          : [];

    const matchesNicotine =
      activeFilters.length > 0
        ? activeFilters.every((filterOption) =>
            groups.some((group) =>
              group.options.some(
                (option) => option.available && option.label === filterOption
              )
            )
          )
        : true;

    return hasAvailableVariations && matchesCategory && matchesSearch && matchesNicotine;
  });

  // Duplicar a lista de itens para criar o efeito Infinito continuo
  const infiniteProducts =
    visibleProducts.length > 0
      ? visibleProducts.length < 5
        ? [...visibleProducts, ...visibleProducts, ...visibleProducts, ...visibleProducts]
        : [...visibleProducts, ...visibleProducts]
      : [];

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const cardWidth = 280;
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Efeito de Rotação Automática Infinita
  useEffect(() => {
    if (visibleProducts.length === 0 || isHovered) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = 280;
      const maxScroll = container.scrollWidth / 2;

      // Se passou da metade (fim do primeiro bloco), reseta sem animação perceptível para o inicio
      if (container.scrollLeft >= maxScroll) {
        container.scrollLeft = 0;
      }

      container.scrollBy({ left: cardWidth, behavior: "smooth" });
    }, 3000);

    return () => clearInterval(interval);
  }, [visibleProducts.length, isHovered]);

  // Efeito para ajustar o scroll infinito ao rolar manualmente
  const handleScrollInfiniteCheck = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth / 2;

    if (container.scrollLeft >= maxScroll) {
      container.scrollLeft -= maxScroll;
    } else if (container.scrollLeft <= 0) {
      container.scrollLeft += maxScroll;
    }
  };

  if (visibleProducts.length === 0) return null;

  return (
    <section id="destaques" className="py-8 md:py-12 my-4">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {normalizedSearch
                ? "Destaques Encontrados"
                : selectedCategory
                  ? `${selectedCategory} em Destaque`
                  : "Produtos em Destaque"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Seleção especial dos nossos produtos favoritos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground transition-all hover:bg-accent hover:border-border active:scale-95 shadow-xs"
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground transition-all hover:bg-accent hover:border-border active:scale-95 shadow-xs"
              aria-label="Rolar para direita"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onScroll={handleScrollInfiniteCheck}
          className="mt-6 flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {infiniteProducts.map((product, i) => (
            <div key={`${product.id}-${i}`} className="w-[240px] sm:w-[260px] md:w-[280px] shrink-0 snap-start">
              <ProductCard product={product} index={i} isBestSeller={Boolean(product.isBestSeller)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
