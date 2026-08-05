import { useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import HeroBanner from "@/components/HeroBanner";
import CategoriesSection from "@/components/CategoriesSection";
import NicotineFilter from "@/components/NicotineFilter";
import PromotionsSection from "@/components/PromotionsSection";
import AllProductsSection from "@/components/AllProductsSection";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/contexts/CartContext";
import { useStoreMobilePadding } from "@/hooks/use-store-mobile-padding";
import { useProducts, useCategories } from "@/hooks/useProducts";

const Index = () => {
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategory,
    selectedNicotineStrength,
    setSelectedNicotineStrength,
  } = useCart();
  const mobileBottom = useStoreMobilePadding("home");
  const { data: allProducts = [], isLoading } = useProducts(selectedCategoryId);
  const { data: apiCategories = [] } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams();
  const navigate = useNavigate();

  const lastAppliedSlug = useRef<string | null>(null);

  useEffect(() => {
    // 1. Check old URL query param format
    const urlCategoryId = searchParams.get("categoryId");
    const urlCategoryName = searchParams.get("category");
    if (urlCategoryId && urlCategoryName) {
      if (selectedCategoryId !== urlCategoryId) {
        setSelectedCategory(urlCategoryName, urlCategoryId);
      }
      searchParams.delete("categoryId");
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    // 2. Check nice slug format from route
    if (slug && apiCategories.length > 0) {
      const generateSlug = (name: string) => 
        name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      const matchedCategory = apiCategories.find(c => generateSlug(c.nome) === slug);
      
      // If we already applied this slug, but the user manually changed the category in the UI to something else,
      // we should clean the URL so it doesn't mismatch the selected category.
      if (lastAppliedSlug.current === slug && selectedCategoryId && matchedCategory && selectedCategoryId !== matchedCategory.id) {
        navigate('/', { replace: true });
        return;
      }

      // Apply the slug category on first load
      if (matchedCategory && lastAppliedSlug.current !== slug) {
        setSelectedCategory(matchedCategory.nome, matchedCategory.id);
        lastAppliedSlug.current = slug;
      }
    }
  }, [searchParams, selectedCategoryId, setSelectedCategory, setSearchParams, slug, apiCategories]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const showBanner = !selectedCategory && !normalizedSearch && !selectedNicotineStrength;

  const hasResults = allProducts.some((product) => {
    const hasAvailableVariations = product.variationGroup
      ? product.variationGroup.options.some((option) => option.available)
      : true;
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

    return hasAvailableVariations && matchesSearch && matchesNicotine;
  });

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedNicotineStrength(null);
  };

  useEffect(() => {
    let isRestoring = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    if (!isLoading) {
      const savedScroll = sessionStorage.getItem("store_scroll_pos");
      if (savedScroll) {
        const targetScroll = parseInt(savedScroll, 10);
        if (targetScroll > 0) {
          isRestoring = true;
          const doScroll = () => {
            window.scrollTo({ top: targetScroll, behavior: "instant" });
          };

          // Perform immediate restore and staggered frames to handle DOM rendering on mobile
          requestAnimationFrame(doScroll);
          
          const delays = [50, 150, 300, 500];
          delays.forEach(delay => {
            timeouts.push(setTimeout(doScroll, delay));
          });

          // Allow scroll listener to resume saving after restoration completes
          timerId = setTimeout(() => {
            isRestoring = false;
          }, 600);
        }
      }
    }

    const handleScroll = () => {
      // Never overwrite saved position with 0 during initial render/restoration
      if (!isRestoring && window.scrollY > 0) {
        sessionStorage.setItem("store_scroll_pos", window.scrollY.toString());
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timerId) clearTimeout(timerId);
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [isLoading]);

  return (
    <div className={`min-h-screen bg-background md:pb-0 ${mobileBottom}`}>
      <SiteHeader />
      {showBanner && <HeroBanner />}
      <CategoriesSection />
      <NicotineFilter />
      {!isLoading && !hasResults && (normalizedSearch || selectedNicotineStrength) && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
            <h2 className="text-2xl font-bold text-foreground">Nenhum produto encontrado</h2>
            <p className="mt-2 text-muted-foreground">
              Sua busca não retornou nenhum produto altere seus filtros ou seu termo de busca
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Limpar busca
            </button>
          </div>
        </section>
      )}
      <PromotionsSection />
      <AllProductsSection />
      <SiteFooter />
    </div>
  );
};

export default Index;
