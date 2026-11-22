import type { SelectedProduct } from "@/data/products";
import type { OrderBumpSuggestion } from "@/services/order-bumps";
import { convertSuggestionToProduct } from "@/utils/order-bump-product";

/**
 * Escolha das ofertas "Peça também" dentro da tela do produto. O "+" só GUARDA a escolha aqui; o
 * botão "Adicionar" é que coloca o produto e as ofertas no carrinho.
 */

/** `bumpId` -> quantidade escolhida. */
export type BumpSelection = Record<string, number>;

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Total de unidades escolhidas. */
export const selectedCount = (selection: BumpSelection): number =>
  Object.values(selection).reduce((sum, qty) => sum + qty, 0);

/**
 * Ofertas que o grupo mostra na tela do produto. Oferta de produto com variação (tamanho, sabor)
 * fica só no carrinho, onde o cliente escolhe a variação.
 */
export const offersForProductScreen = (offers: OrderBumpSuggestion[]): OrderBumpSuggestion[] =>
  offers.filter((offer) => !offer.product.hasVariations && offer.product.totalStock > 0);

/** Quantas unidades dessa oferta ainda cabem: o estoque menos o que já está no carrinho. */
export const stockLeft = (offer: OrderBumpSuggestion, alreadyInCart: number): number =>
  Math.max(0, offer.product.totalStock - alreadyInCart);

/** Dá para somar mais uma unidade? Respeita o estoque da oferta (descontando o carrinho). */
export function canIncrease(
  selection: BumpSelection,
  offer: OrderBumpSuggestion,
  alreadyInCart = 0,
): boolean {
  return (selection[offer.bumpId] ?? 0) < stockLeft(offer, alreadyInCart);
}

export function increase(
  selection: BumpSelection,
  offer: OrderBumpSuggestion,
  alreadyInCart = 0,
): BumpSelection {
  if (!canIncrease(selection, offer, alreadyInCart)) return selection;
  return { ...selection, [offer.bumpId]: (selection[offer.bumpId] ?? 0) + 1 };
}

export function decrease(selection: BumpSelection, bumpId: string): BumpSelection {
  const current = selection[bumpId] ?? 0;
  if (current <= 0) return selection;
  const next = { ...selection };
  if (current === 1) delete next[bumpId];
  else next[bumpId] = current - 1;
  return next;
}

/** Tira da escolha as ofertas que não existem mais na lista (a lista mudou de produto, por exemplo). */
export function pruneSelection(selection: BumpSelection, offers: OrderBumpSuggestion[]): BumpSelection {
  const valid = new Set(offers.map((o) => o.bumpId));
  const entries = Object.entries(selection).filter(([id, qty]) => valid.has(id) && qty > 0);
  return entries.length === Object.keys(selection).length ? selection : Object.fromEntries(entries);
}

/** Ofertas escolhidas com a quantidade de cada uma. */
export function chosenOffers(
  selection: BumpSelection,
  offers: OrderBumpSuggestion[],
): Array<{ offer: OrderBumpSuggestion; quantity: number }> {
  return offers
    .filter((offer) => (selection[offer.bumpId] ?? 0) > 0)
    .map((offer) => ({ offer, quantity: selection[offer.bumpId] }));
}

/** Soma em R$ das ofertas escolhidas, ao preço da oferta (o mesmo que a API aceita no pedido). */
export function selectionTotal(selection: BumpSelection, offers: OrderBumpSuggestion[]): number {
  return round2(
    chosenOffers(selection, offers).reduce(
      (sum, { offer, quantity }) => sum + Number(offer.product.price) * quantity,
      0,
    ),
  );
}

/**
 * Coloca as ofertas escolhidas no carrinho, cada uma como linha própria (produto + id da oferta), com
 * o preço da oferta. A quantidade da oferta não multiplica pela do produto principal.
 */
export function addChosenOffersToCart(
  chosen: Array<{ offer: OrderBumpSuggestion; quantity: number }>,
  addToCart: (item: SelectedProduct & { isOrderBump?: boolean; orderBumpId?: string }) => void,
  updateQuantity: (
    productId: string,
    quantity: number,
    selectedVariation?: string,
    orderBumpId?: string | null,
  ) => void,
): void {
  for (const { offer, quantity } of chosen) {
    addToCart({
      product: convertSuggestionToProduct(offer),
      isOrderBump: true,
      orderBumpId: offer.bumpId,
      orderBumpTrigger: {
        triggerType: offer.triggerType,
        triggerProductId: offer.triggerProductId,
      triggerProductIds: offer.triggerProductIds,
        triggerCategoryId: offer.triggerCategoryId,
      },
    });
    if (quantity > 1) {
      updateQuantity(offer.product.id, quantity, undefined, offer.bumpId);
    }
  }
}
