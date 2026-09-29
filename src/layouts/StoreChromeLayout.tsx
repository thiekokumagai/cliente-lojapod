import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import AddedToCartModal from "@/components/AddedToCartModal";
import BackToTopButton from "@/components/BackToTopButton";
import CartSidebar from "@/components/CartSidebar";
import StoreClosedModal from "@/components/StoreClosedModal";
import StoreTemporarilyClosedOverlay from "@/components/StoreTemporarilyClosedOverlay";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import StoreNotFound from "@/components/StoreNotFound";
import StoreOffline from "@/components/StoreOffline";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Chrome global da loja: carrinho, modal, navegação móvel e utilitários.
 * Mantém uma única montagem por sessão de rotas (ver SKILL.md — contexto de navegação).
 */
const StoreChromeLayout = () => {
  const { data: settings, isLoading, isError, error } = useStoreSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_ADMIN_API?.replace(/\/api$/, '') || 'http://localhost:3000';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Connected to websocket server for catalog updates');
    });

    socket.on('products.refresh', () => {
      console.log('Catalog update received via websocket');
      queryClient.invalidateQueries({ queryKey: ["api-products"] });
      queryClient.invalidateQueries({ queryKey: ["api-products-category"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!settings) return;

    if (settings.storeName) {
      document.title = settings.storeName;
    }

    if (settings.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = settings.faviconUrl;

      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.getElementsByTagName("head")[0].appendChild(appleLink);
      }
      appleLink.href = settings.faviconUrl;
    }

    // Aplicação dinâmica de cores primária e secundária do tema
    if (settings.primaryColor) {
      document.documentElement.style.setProperty("--primary-custom", settings.primaryColor);
      
      // Converter HEX para HSL para CSS Tailwind nativo
      const hexToHsl = (hex: string) => {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          let d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      const primaryHsl = hexToHsl(settings.primaryColor);
      if (primaryHsl) {
        document.documentElement.style.setProperty("--primary", primaryHsl);
        document.documentElement.style.setProperty("--ring", primaryHsl);
      }
    }

    // Aplicação da cor de preços independente
    if (settings.priceColor) {
      document.documentElement.style.setProperty("--price-color", settings.priceColor);
    } else if (settings.primaryColor) {
      document.documentElement.style.setProperty("--price-color", settings.primaryColor);
    }
  }, [settings]);

  if (isError) {
    if (error instanceof Error && error.message === "STORE_OFFLINE") {
      return <StoreOffline />;
    }
    return <StoreNotFound />;
  }

  if (!settings && !isLoading) {
    return <StoreNotFound />;
  }

  return (
    <>
      <Outlet />
      <CartSidebar />
      <AddedToCartModal />
      <StoreClosedModal />
      <StoreTemporarilyClosedOverlay />
      <MobileBottomNav />
      <WhatsAppButton />
      <BackToTopButton />
    </>
  );
};

export default StoreChromeLayout;
