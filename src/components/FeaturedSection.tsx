import ProductCard from "./ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { matchesProductSearch } from "@/utils/search";
import { sortProducts } from "@/utils/sortProducts";
import { useCallback, useMemo, useRef } from "react";

const FeaturedSection = () => {
  const {
    selectedCategory,
    selectedCategoryId,
    searchTerm,
    selectedNicotineStrength,
    selectedVariationFilters,
    sortOption,
  } = useCart();
  const { data: allProducts = [] } = useProducts();
  const { data: apiCategories = [] } = useCategories();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const { data: settings } = useStoreSettings();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allowsNotification = settings?.enableStockAlertNotification !== false;

  // Produtos destacados que passam nos filtros ativos. Só recalcula quando os dados ou os filtros mudam.
  const visibleProducts = useMemo(() => {
    const featuredProducts = allProducts.filter((p) => p.isFeatured);

    const filteredProducts = featuredProducts.filter((product) => {
      const groups =
        product.variationGroups && product.variationGroups.length > 0
          ? product.variationGroups
          : product.variationGroup
            ? [product.variationGroup]
            : [];

      const hasAvailableVariations =
        groups.length > 0
          ? groups.some((group) => group.options.some((option) => option.available))
          : (product.stock ?? 0) > 0;

      const isAvailableOrNotifiable =
        product.isCombo
          ? (product.stock ?? 0) > 0 || allowsNotification
          : hasAvailableVariations || allowsNotification;

      const matchesCategory =
        selectedCategoryId
          ? product.categoryId === selectedCategoryId
          : selectedCategory
            ? product.category === selectedCategory
            : true;
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
                  (option) =>
                    (allowsNotification || option.available) &&
                    option.label === filterOption
                )
              )
            )
          : true;

      return isAvailableOrNotifiable && matchesCategory && matchesSearch && matchesNicotine;
    });

    return sortProducts(filteredProducts, sortOption, apiCategories);
  }, [
    allProducts,
    apiCategories,
    allowsNotification,
    selectedCategory,
    selectedCategoryId,
    searchTerm,
    selectedNicotineStrength,
    selectedVariationFilters,
    sortOption,
  ]);

  const scrollPrev = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const firstCard = container.querySelector<HTMLElement>(":scope > div");
    const step = firstCard ? firstCard.offsetWidth + 12 : 252;
    container.scrollBy({ left: -step, behavior: "smooth" });
  }, []);

  const scrollNext = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const firstCard = container.querySelector<HTMLElement>(":scope > div");
    const step = firstCard ? firstCard.offsetWidth + 12 : 252;
    container.scrollBy({ left: step, behavior: "smooth" });
  }, []);

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

          {visibleProducts.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scrollPrev}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground transition-all hover:bg-accent hover:border-border active:scale-95 shadow-xs"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground transition-all hover:bg-accent hover:border-border active:scale-95 shadow-xs"
                aria-label="Próximo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-3 overflow-x-auto py-1 scroll-smooth snap-x snap-mandatory overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden will-change-scroll transform-gpu"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {visibleProducts.map((product, i) => (
              <div
                key={product.id}
                className="w-[220px] sm:w-[240px] md:w-[260px] shrink-0 min-w-0 flex snap-start"
              >
                <ProductCard
                  product={product}
                  index={i}
                  priority={i < 2}
                  isBestSeller={Boolean(product.isBestSeller)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
