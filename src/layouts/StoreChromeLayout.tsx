import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import AddedToCartModal from "@/components/AddedToCartModal";
import BackToTopButton from "@/components/BackToTopButton";
import CartSidebar from "@/components/CartSidebar";
import StoreClosedModal from "@/components/StoreClosedModal";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Chrome global da loja: carrinho, modal, navegação móvel e utilitários.
 * Mantém uma única montagem por sessão de rotas (ver SKILL.md — contexto de navegação).
 */
const StoreChromeLayout = () => {
  const { data: settings } = useStoreSettings();
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
    }
  }, [settings]);

  return (
    <>
      <Outlet />
      <CartSidebar />
      <AddedToCartModal />
      <StoreClosedModal />
      <MobileBottomNav />
      <WhatsAppButton />
      <BackToTopButton />
    </>
  );
};

export default StoreChromeLayout;
