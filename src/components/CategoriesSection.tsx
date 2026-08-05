import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

const CategoriesSection = () => {
  const {
    selectedCategory,
    searchTerm,
    selectedNicotineStrength,
    setSelectedCategory,
    setSelectedNicotineStrength,
  } = useCart();

  const { data: apiCategories = [], isLoading } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchTerm.trim();
  const showBanner = !selectedCategory && !normalizedSearch && !selectedNicotineStrength;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const categories = apiCategories.map((cat) => ({
    id: cat.id,
    name: cat.nome.trim(),
    image: cat.imagem || "",
  }));

  const updateScrollState = () => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [apiCategories]);

  const handleCategoryChange = (category: string, categoryId: string, isActive: boolean) => {
    if (isActive) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category, categoryId);
    }
    setSelectedNicotineStrength(null);
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = Math.min(320, container.clientWidth * 0.75);
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="categorias"
      className={cn(
        "py-10 md:py-14",
        !showBanner && "pt-36 md:pt-14"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Categorias
          </h2>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedNicotineStrength(null);
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="relative mt-6">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount("left")}
              aria-label="Ver categorias anteriores"
              className="absolute left-[-16px] top-[42px] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md md:left-0"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount("right")}
              aria-label="Ver próximas categorias"
              className="absolute right-[-16px] top-[42px] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md md:right-0"
            >
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="scrollbar-none overflow-x-auto scroll-smooth"
          >
            <div className="flex min-w-max gap-2 px-1 pb-2 md:gap-6">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex w-[88px] shrink-0 flex-col items-center gap-2 md:w-[104px]">
                    <div className="overflow-hidden rounded-full border-2 border-transparent bg-secondary p-1">
                      <div className="aspect-square w-20 rounded-full bg-zinc-800/50 animate-pulse md:w-24" />
                    </div>
                    <div className="h-4 w-16 bg-zinc-800/50 animate-pulse rounded-md mt-1" />
                  </div>
                ))
              ) : (
                categories.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleCategoryChange(cat.name, cat.id, isActive)}
                      className="flex w-[88px] shrink-0 flex-col items-center gap-2 md:w-[104px]"
                    >
                      <div
                        className={cn(
                          "overflow-hidden rounded-full border-2 bg-secondary p-1",
                          isActive ? "border-primary" : "border-transparent"
                        )}
                      >
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="aspect-square w-20 rounded-full object-cover md:w-24"
                          />
                        ) : (
                          <div className="aspect-square w-20 rounded-full bg-muted md:w-24" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-center text-xs font-medium md:text-sm",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
