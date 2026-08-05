import ProductCard from "./ProductCard";
import { Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";

const PromotionsSection = () => {
  const { selectedCategory, searchTerm, selectedNicotineStrength } = useCart();
  const { data: allProducts = [] } = useProducts();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const promoProducts = allProducts.filter((p) => p.isPromo);

  const visibleProducts = promoProducts.filter((product) => {
    const hasAvailableVariations = product.variationGroup
      ? product.variationGroup.options.some((option) => option.available)
      : true;
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSearch = normalizedSearch
      ? product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch)
      : true;
    const matchesNicotine = selectedNicotineStrength
      ? product.variationGroup?.options.some(
          (option) => option.available && option.label === selectedNicotineStrength
        ) ?? false
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
