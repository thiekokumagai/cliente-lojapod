import { useState, useEffect, useRef, useCallback } from "react";
import ProductCard from "./ProductCard";
import { Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 12;

const AllProductsSection = () => {
  const { selectedCategory, selectedCategoryId, searchTerm, selectedNicotineStrength, selectedVariationFilters } = useCart();
  const { data: allProducts = [], isLoading } = useProducts(selectedCategoryId);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const [visibleCount, setVisibleCount] = useState(() => {
    const saved = sessionStorage.getItem("store_visible_count");
    return saved ? parseInt(saved, 10) : ITEMS_PER_PAGE;
  });
  const [sortOption, setSortOption] = useState("default");
  const loaderRef = useRef<HTMLDivElement>(null);

  const prevFiltersRef = useRef({ selectedCategory, searchTerm, selectedNicotineStrength });

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [sortOption]);

  const filteredProducts = allProducts
    .filter((p) => !p.isPromo)
    .filter((product) => {
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
                  (option) =>
                    option.available && option.label === filterOption
                )
              )
            )
          : true;

      return hasAvailableVariations && matchesSearch && matchesNicotine;
    })
    .sort((a, b) => {
      if (sortOption === "a-z") {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === "z-a") {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === "lowest-price") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortOption === "highest-price") {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortOption === "newest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOption === "category") {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
      }

      if (a.isBestSeller && !b.isBestSeller) return -1;
      if (!a.isBestSeller && b.isBestSeller) return 1;
      return 0;
    });

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
        setSortOption("default");
      }
    }
  }, [selectedCategory, searchTerm, selectedNicotineStrength]);

  const hasMore = visibleCount < filteredProducts.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + ITEMS_PER_PAGE, filteredProducts.length);
      sessionStorage.setItem("store_visible_count", next.toString());
      return next;
    });
  }, [filteredProducts.length]);

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

  if (filteredProducts.length === 0) return null;

  const visible = filteredProducts.slice(0, visibleCount);

  return (
    <section id="produtos" className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
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
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl focus:ring-primary font-medium text-slate-700">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="default" className="font-medium rounded-md">Destaques</SelectItem>
                <SelectItem value="category" className="font-medium rounded-md">Categoria</SelectItem>
                <SelectItem value="a-z" className="font-medium rounded-md">Alfabética (A-Z)</SelectItem>
                <SelectItem value="z-a" className="font-medium rounded-md">Alfabética (Z-A)</SelectItem>
                <SelectItem value="highest-price" className="font-medium rounded-md">Maior Preço</SelectItem>
                <SelectItem value="lowest-price" className="font-medium rounded-md">Menor Preço</SelectItem>
                <SelectItem value="newest" className="font-medium rounded-md">Novidades</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} isBestSeller={Boolean(product.isBestSeller)} />
          ))}
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
