import { useEffect, useState } from "react";
import { orderBumpsService, type OrderBumpSuggestion } from "@/services/order-bumps";
import { offersForProductScreen } from "@/utils/order-bump-selection";

/**
 * Ofertas "Peça também" marcadas para a TELA DO PRODUTO (e para "os dois") que combinam com o produto
 * aberto. `enabled` falso (produto já no carrinho, esgotado...) não busca nada. Erro de rede: sem ofertas,
 * a tela do produto continua normal.
 */
export function useProductOrderBumps(productId: string | undefined, enabled = true): OrderBumpSuggestion[] {
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
        if (alive) setOffers(offersForProductScreen(data || []));
      })
      .catch(() => {
        if (alive) setOffers([]);
      });

    return () => {
      alive = false;
    };
  }, [productId, enabled]);

  return offers;
}
