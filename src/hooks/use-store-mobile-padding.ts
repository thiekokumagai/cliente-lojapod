import { useCart } from "@/contexts/CartContext";

type StorePageKind = "home" | "product";

/**
 * Padding inferior no mobile para não cobrir conteúdo com a bottom nav / barra de CTA.
 */
export function useStoreMobilePadding(kind: StorePageKind): string {
  const { totalItems } = useCart();

  if (kind === "product") {
    return totalItems > 0
      ? "pb-[calc(env(safe-area-inset-bottom)+133px)]"
      : "pb-[77px]";
  }

  return totalItems > 0 ? "pb-[calc(env(safe-area-inset-bottom)+64px)]" : "pb-0";
}
