import { useState, useEffect, useRef, useCallback } from "react";
import ProductCard from "./ProductCard";
import MenuExpressProductCard from "./MenuExpressProductCard";
import UrbanProductCard from "./UrbanProductCard";
import { Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { matchesProductSearch } from "@/utils/search";
import { sortProducts } from "@/utils/sortProducts";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 12;

const AllProductsSection = () => {
  const {
    selectedCategory,
    selectedCategoryId,
    searchTerm,
    selectedNicotineStrength,
    selectedVariationFilters,
    sortOption,
    setSortOption,
  } = useCart();
  const { data: settings } = useStoreSettings();
  const { data: allProducts = [], isLoading } = useProducts(selectedCategoryId);
  const { data: apiCategories = [] } = useCategories();
  const isMenuExpress = settings?.templateId === "menu-express";
  const isUrban = settings?.templateId === "urban" || settings?.templateId === "podify";
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const [visibleCount, setVisibleCount] = useState(() => {
    const saved = sessionStorage.getItem("store_visible_count");
    return saved ? parseInt(saved, 10) : ITEMS_PER_PAGE;
  });

  const defaultSort = settings?.defaultProductSort || "newest";
  const userChangedSortRef = useRef(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Sincroniza a ordenação padrão caso o admin altere ou quando as configurações forem carregadas
  useEffect(() => {
    if (!userChangedSortRef.current && settings?.defaultProductSort) {
      setSortOption(settings.defaultProductSort);
    }
  }, [settings?.defaultProductSort, setSortOption]);

  const handleSortChange = (newSort: string) => {
    userChangedSortRef.current = true;
    setSortOption(newSort);
  };

  const prevFiltersRef = useRef({ selectedCategory, searchTerm, selectedNicotineStrength });

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [sortOption]);

  const filteredProducts = allProducts
    .filter((p) => !p.isPromo || p.isCombo)
    .filter((product) => {
      const groups =
        product.variationGroups && product.variationGroups.length > 0
          ? product.variationGroups
          : product.variationGroup
            ? [product.variationGroup]
            : [];

      const allowsNotification =
        settings?.enableStockAlertNotification !== false;

      const hasAvailableVariations =
        groups.length > 0
          ? groups.some((group) => group.options.some((option) => option.available))
          : true;

      // Se o produto/combo estiver sem estoque ou sem variação disponível,
      // ele só deve ser exibido se a loja permitir a notificação "Avise-me quando chegar"
      const isAvailableOrNotifiable =
        product.isCombo
          ? (product.stock ?? 0) > 0 || allowsNotification
          : hasAvailableVariations || allowsNotification;

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
                    option.available && option.label === filterOption
                )
              )
            )
          : true;

      return isAvailableOrNotifiable && matchesSearch && matchesNicotine;
    });

  const sortedProducts = sortProducts(filteredProducts, sortOption, apiCategories);

  // Reset visible count ONLY when filters ACTUALLY change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.selectedCategory !== selectedCategory ||
      prev.searchTerm !== searchTerm ||
      prev.selectedNicotineStrength !== selectedNicotineStrength
    ) {
      setVisibleCount(ITEMS_PER_PAGE);
      sessionStorage.setItem("store_visible_count", ITEMS_PER_PAGE.toString());
      prevFiltersRef.current = { selectedCategory, searchTerm, selectedNicotineStrength };

      // Reset to default sort when filters are cleared
      if (!selectedCategory && !searchTerm && !selectedNicotineStrength) {
        userChangedSortRef.current = false;
        setSortOption(defaultSort);
      }
    }
  }, [selectedCategory, searchTerm, selectedNicotineStrength, defaultSort]);

  const hasMore = visibleCount < sortedProducts.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + ITEMS_PER_PAGE, sortedProducts.length);
      sessionStorage.setItem("store_visible_count", next.toString());
      return next;
    });
  }, [sortedProducts.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [loadMore, visibleCount, hasMore]);

  if (isLoading) {
    return (
      <section className="py-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Carregando catálogo...</p>
        </div>
      </section>
    );
  }

  if (sortedProducts.length === 0) return null;

  const visible = sortedProducts.slice(0, visibleCount);

  return (
    <section id="produtos" className={isUrban ? "py-6 md:py-10" : "py-12 md:py-16"}>
      <div className={cn(isUrban ? "w-full px-0" : "mx-auto max-w-7xl px-4 md:px-8")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {normalizedSearch || selectedNicotineStrength
                ? "Resultados encontrados"
                : selectedCategory
                  ? selectedCategory
                  : "Todos os Produtos"}
            </h2>
          </div>
          
          <div className="w-full sm:w-[200px]">
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl focus:ring-primary font-medium text-slate-700">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="newest" className="font-medium rounded-md">Novidades (Mais recentes)</SelectItem>
                <SelectItem value="category" className="font-medium rounded-md">Categoria</SelectItem>
                <SelectItem value="a-z" className="font-medium rounded-md">Alfabética (A-Z)</SelectItem>
                <SelectItem value="z-a" className="font-medium rounded-md">Alfabética (Z-A)</SelectItem>
                <SelectItem value="lowest-price" className="font-medium rounded-md">Menor Preço</SelectItem>
                <SelectItem value="highest-price" className="font-medium rounded-md">Maior Preço</SelectItem>
                <SelectItem value="default" className="font-medium rounded-md">Mais Vendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de Produtos */}
        <div
          className={cn(
            "mt-8 grid gap-3.5",
            isUrban
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              : isMenuExpress
                ? "grid-cols-1 md:grid-cols-2 lg:gap-4"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4"
          )}
        >
          {visible.map((product, i) =>
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

        {hasMore && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </section>
  );
};

export default AllProductsSection;
