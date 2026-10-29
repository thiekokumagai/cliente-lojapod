import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { cn } from "@/lib/utils";

import StoreHoursTopBar from "./StoreHoursTopBar";

const CategoriesSection = () => {
  const {
    selectedCategory,
    searchTerm,
    setSearchTerm,
    selectedNicotineStrength,
    selectedVariationFilters,
    setSelectedCategory,
    setSelectedNicotineStrength,
  } = useCart();

  const { data: apiCategories = [], isLoading } = useCategories();
  const { data: settings } = useStoreSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const banners = settings?.bannerUrls || [];
  const normalizedSearch = searchTerm.trim();
  const hasBanner = banners.length > 0 && !selectedCategory && !normalizedSearch && !selectedNicotineStrength && selectedVariationFilters.length === 0;
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

  const [isScrolledPastScreen, setIsScrolledPastScreen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;

    const handleWindowScroll = () => {
      // Fixa o menu depois que der scroll do tamanho da tela (window.innerHeight)
      setIsScrolledPastScreen(window.scrollY >= window.innerHeight);
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    if (container) container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      if (container) container.removeEventListener("scroll", updateScrollState);
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

    // No tema menu express ou classic, quando trocar de categoria sobe a página suavemente até o catálogo
    requestAnimationFrame(() => {
      const target = document.getElementById("produtos") || document.getElementById("categorias");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
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

  const isMenuExpress = settings?.templateId === "menu-express";

  return (
    <section
      ref={sectionRef}
      id="categorias"
      className={cn(
        isMenuExpress
          ? cn(
              "z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle py-3 shadow-xs transition-all",
              isScrolledPastScreen ? "fixed top-0 left-0 right-0 animate-in fade-in slide-in-from-top-2 duration-200" : "relative"
            )
          : "pb-10 md:pb-14",
        !isMenuExpress && (hasBanner ? "pt-6 sm:pt-8 md:pt-10" : "pt-4 sm:pt-6 md:pt-8")
      )}
    >
      {/* Barra de Status no topo ao fixar no scroll (100% da largura da tela) */}
      {isMenuExpress && isScrolledPastScreen && (
        <div className="w-full -mt-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <StoreHoursTopBar />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {!isMenuExpress && (
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
        )}

        {/* Topo do Header no Menu Express */}
        {isMenuExpress && (
          <div className="mb-3 space-y-2.5">
            {/* Input de Busca */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full pl-10 pr-9 py-2 rounded-full border border-border bg-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={cn("relative", !isMenuExpress && "mt-6")}>
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
                isMenuExpress ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-24 rounded-full bg-muted/80 animate-pulse shrink-0 border border-border"
                    />
                  ))
                ) : (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex w-[88px] shrink-0 flex-col items-center gap-2 md:w-[104px]">
                      <div className="overflow-hidden rounded-full border-2 border-transparent bg-secondary p-1">
                        <div className="aspect-square w-20 rounded-full bg-zinc-800/50 animate-pulse md:w-24" />
                      </div>
                      <div className="h-4 w-16 bg-zinc-800/50 animate-pulse rounded-md mt-1" />
                    </div>
                  ))
                )
              ) : (
                categories.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  const isMenuExpress = settings?.templateId === "menu-express";

                  if (isMenuExpress) {
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleCategoryChange(cat.name, cat.id, isActive)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/80 text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {cat.name}
                      </button>
                    );
                  }

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
