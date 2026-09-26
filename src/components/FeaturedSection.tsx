import ProductCard from "./ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { matchesProductSearch } from "@/utils/search";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

const FeaturedSection = () => {
  const { selectedCategory, searchTerm, selectedNicotineStrength, selectedVariationFilters } = useCart();
  const { data: allProducts = [] } = useProducts();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
    containScroll: "trimSnaps",
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

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

        <div className="mt-6 overflow-hidden" ref={emblaRef}>
          <div className="flex items-stretch gap-1.5 -ml-2.5 md:-ml-2.5 py-1">
            {visibleProducts.map((product, i) => (
              <div
                key={product.id}
                className="pl-2.5 md:pl-2.5 w-[220px] sm:w-[240px] md:w-[260px] shrink-0 min-w-0 flex"
              >
                <ProductCard product={product} index={i} isBestSeller={Boolean(product.isBestSeller)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;

