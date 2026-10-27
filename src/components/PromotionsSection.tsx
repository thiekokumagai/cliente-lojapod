import ProductCard from "./ProductCard";
import MenuExpressProductCard from "./MenuExpressProductCard";
import UrbanProductCard from "./UrbanProductCard";
import { Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { matchesProductSearch } from "@/utils/search";
import { sortProducts } from "@/utils/sortProducts";
import { cn } from "@/lib/utils";

const PromotionsSection = () => {
  const { selectedCategory, searchTerm, selectedNicotineStrength, selectedVariationFilters, sortOption } = useCart();
  const { data: allProducts = [] } = useProducts();
  const { data: apiCategories = [] } = useCategories();
  const { data: settings } = useStoreSettings();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const promoProducts = allProducts.filter((p) => p.isPromo);

  const filteredProducts = promoProducts.filter((product) => {
    const groups =
      product.variationGroups && product.variationGroups.length > 0
        ? product.variationGroups
        : product.variationGroup
          ? [product.variationGroup]
          : [];

    const allowsNotification = settings?.enableStockAlertNotification !== false;
    const hasAvailableVariations =
      groups.length > 0
        ? groups.some((group) => group.options.some((option) => option.available))
        : true;

    const isAvailableOrNotifiable =
      product.isCombo
        ? (product.stock ?? 0) > 0 || allowsNotification
        : hasAvailableVariations || allowsNotification;

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

    return isAvailableOrNotifiable && matchesCategory && matchesSearch && matchesNicotine;
  });

  const visibleProducts = sortProducts(filteredProducts, sortOption, apiCategories);

  if (visibleProducts.length === 0) return null;

  const isMenuExpress = settings?.templateId === "menu-express";
  const isUrban = settings?.templateId === "urban" || settings?.templateId === "urban";

  return (
    <section id="promocoes" className={isUrban ? "py-4 md:py-6" : "py-8 md:py-12"}>
      <div className={cn(isUrban ? "w-full px-0" : "mx-auto max-w-7xl px-4 md:px-8")}>
        <div className="flex items-center gap-3 mb-6">
          <Flame className="h-6 w-6 text-red-500" />
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {normalizedSearch
              ? "Resultados em Promoção"
              : selectedCategory
                ? `${selectedCategory} em Promoção`
                : "Promoções"}
          </h2>
        </div>
        <div
          className={cn(
            "grid gap-3.5",
            isUrban
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              : isMenuExpress
                ? "grid-cols-1 md:grid-cols-2 lg:gap-4"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4"
          )}
        >
          {visibleProducts.map((product, i) =>
            isUrban ? (
              <UrbanProductCard
                key={product.id}
                product={product}
                isBestSeller={Boolean(product.isBestSeller)}
              />
            ) : isMenuExpress ? (
              <MenuExpressProductCard
                key={product.id}
                product={product}
                isBestSeller={Boolean(product.isBestSeller)}
              />
            ) : (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                isBestSeller={Boolean(product.isBestSeller)}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;
