import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import GoogleMapsLoader from "@/components/GoogleMapsLoader";
import StoreChromeLayout from "@/layouts/StoreChromeLayout";
import Index from "./pages/Index.tsx";
import ProductPage from "./pages/ProductPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import LinksPage from "./pages/LinksPage.tsx";

import FacebookPixel from "@/components/FacebookPixel";
import { initAnalytics } from "@/services/analytics";
import { useEffect } from "react";
import { useCategories } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";

const FallbackRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: apiCategories = [], isLoading } = useCategories();

  useEffect(() => {
    if (!isLoading && apiCategories.length > 0) {
      const currentPath = location.pathname.startsWith('/') ? location.pathname.substring(1) : location.pathname;
      
      const matchedCategory = apiCategories.find((c: any) => {
        if (!c.oldUrl) return false;
        const oldUrlTrimmed = c.oldUrl.startsWith('/') ? c.oldUrl.substring(1) : c.oldUrl;
        return oldUrlTrimmed === currentPath;
      });

      if (matchedCategory) {
        const generateSlug = (name: string) => 
          name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        
        navigate(`/${generateSlug(matchedCategory.nome)}`, { replace: true });
      }
    }
  }, [isLoading, apiCategories, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPath = location.pathname.startsWith('/') ? location.pathname.substring(1) : location.pathname;
  const isMatch = apiCategories.some((c: any) => {
    if (!c.oldUrl) return false;
    const oldUrlTrimmed = c.oldUrl.startsWith('/') ? c.oldUrl.substring(1) : c.oldUrl;
    return oldUrlTrimmed === currentPath;
  });

  if (isMatch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <NotFound />;
};

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const cleanup = initAnalytics();
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    return cleanup;
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <GoogleMapsLoader />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FacebookPixel />
          <Routes>
            <Route path="/links" element={<LinksPage />} />
            <Route element={<StoreChromeLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/:slug" element={<Index />} />
              <Route path="/produto/:id" element={<ProductPage />} />
            </Route>
            <Route path="*" element={<FallbackRoute />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
