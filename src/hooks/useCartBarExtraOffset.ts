import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";

/** Altura (px) do progresso de frete grátis exibido na MobileBottomNav (apenas menu express). */
export const FREE_SHIPPING_BAR_HEIGHT = 36;

/**
 * Altura extra da barra do carrinho no mobile, para os botões flutuantes
 * (WhatsApp / voltar ao topo) subirem junto. Retorna 0 fora do menu express.
 */
export function useCartBarExtraOffset(): number {
  const { totalItems } = useCart();
  const { data: settings } = useStoreSettings();

  const minValue = Number(settings?.freeShippingMinValue);
  const hasGoal = Boolean(settings?.freeShippingEnabled) && !isNaN(minValue) && minValue > 0;

  return settings?.templateId === "menu-express" && hasGoal && totalItems > 0
    ? FREE_SHIPPING_BAR_HEIGHT
    : 0;
}
