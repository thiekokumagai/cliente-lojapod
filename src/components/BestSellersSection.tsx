import { useState } from "react";
import ProductCard from "./ProductCard";
import { TrendingUp } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";

const BestSellersSection = () => {
  const [showAll, setShowAll] = useState(false);
  const { selectedCategory, searchTerm, selectedNicotineStrength, selectedVariationFilters } = useCart();
  const { data: allProducts = [] } = useProducts();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const nonPromoProducts = allProducts.filter((p) => !p.isPromo);

  const filteredProducts = nonPromoProducts.filter((product) => {
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
    const matchesSearch = normalizedSearch
      ? product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch)
      : true;

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

  if (selectedCategory && filteredProducts.length === 0) return null;
  if (normalizedSearch && filteredProducts.length === 0) return null;
  if (selectedNicotineStrength && filteredProducts.length === 0) return null;
  if (!selectedCategory && !normalizedSearch && !selectedNicotineStrength && filteredProducts.length === 0) return null;

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.isBestSeller && !b.isBestSeller) return -1;
    if (!a.isBestSeller && b.isBestSeller) return 1;
    return 0;
  });

  const visible = showAll || normalizedSearch || selectedNicotineStrength ? sortedProducts : sortedProducts.slice(0, 8);

  return (
    <section id="produtos" className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {normalizedSearch || selectedNicotineStrength ? "Resultados encontrados" : "Mais Vendidos"}
            </h2>
          </div>
          {!normalizedSearch && !selectedNicotineStrength && filteredProducts.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-primary"
            >
              {showAll ? "Ver menos" : "Ver todos"}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {visible.map((product, i) => {
            const isBestSeller = Boolean(product.isBestSeller);
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={i} 
                isBestSeller={isBestSeller} 
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BestSellersSection;
