import { useEffect, useMemo, useState } from "react";
import { orderBumpsService, type OrderBumpSuggestion } from "@/services/order-bumps";
import { offersForProductScreen } from "@/utils/order-bump-selection";
import type { BusinessType } from "@/hooks/useStoreSettings";

/**
 * Ofertas "Peça também" marcadas para a TELA DO PRODUTO (e para "os dois") que combinam com o produto
 * aberto. `enabled` falso (produto já no carrinho, esgotado...) não busca nada. Erro de rede: sem ofertas,
 * a tela do produto continua normal. Ofertas com variação ou montagem (loja de comida) ficam de fora.
 */
export function useProductOrderBumps(
  productId: string | undefined,
  enabled = true,
  businessType?: BusinessType,
): OrderBumpSuggestion[] {
  const [offers, setOffers] = useState<OrderBumpSuggestion[]>([]);

  useEffect(() => {
    if (!productId || !enabled) {
      setOffers([]);
      return;
    }

    let alive = true;
    orderBumpsService
      .getSuggestions([productId], "PRODUCT")
      .then((data) => {
        if (alive) setOffers(data || []);
      })
      .catch(() => {
        if (alive) setOffers([]);
      });

    return () => {
      alive = false;
    };
  }, [productId, enabled]);

  return useMemo(() => offersForProductScreen(offers, businessType), [offers, businessType]);
}
