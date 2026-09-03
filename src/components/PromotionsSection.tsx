import ProductCard from "./ProductCard";
import { Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { matchesProductSearch } from "@/utils/search";

const PromotionsSection = () => {
  const { selectedCategory, searchTerm, selectedNicotineStrength, selectedVariationFilters } = useCart();
  const { data: allProducts = [] } = useProducts();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const promoProducts = allProducts.filter((p) => p.isPromo);

  const visibleProducts = promoProducts.filter((product) => {
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

  if (visibleProducts.length === 0) return null;

  return (
    <section id="promocoes" className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {normalizedSearch
              ? "Resultados em Promoção"
              : selectedCategory
                ? `${selectedCategory} em Promoção`
                : "Promoções"}
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {visibleProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} isBestSeller={Boolean(product.isBestSeller)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;
