import type { SelectedProduct } from "@/data/products";
import type { OrderBumpSuggestion } from "@/services/order-bumps";
import { convertSuggestionToProduct } from "@/utils/order-bump-product";
import { requiresProductDetails } from "@/utils/business-type";
import type { BusinessType } from "@/hooks/useStoreSettings";

/**
 * Escolha das ofertas "Peça também" dentro da tela do produto. O "+" só GUARDA a escolha aqui; o
 * botão "Adicionar" é que coloca o produto e as ofertas no carrinho.
 */

/** `bumpId` -> quantidade escolhida. */
export type BumpSelection = Record<string, number>;

export const DEFAULT_ORDER_BUMP_TITLE = "Peça também";

export interface OrderBumpGroup {
  title: string;
  offers: OrderBumpSuggestion[];
}

/**
 * Agrupa sugestões pelo título da seção (normalizando espaços nas pontas e usando fallback padrão
 * quando vazio), preservando a ordem da primeira aparição de cada título e dos itens dentro dele.
 */
export function groupOrderBumpsByTitle(
  offers: OrderBumpSuggestion[],
  fallbackTitle = DEFAULT_ORDER_BUMP_TITLE,
): OrderBumpGroup[] {
  const groups: OrderBumpGroup[] = [];
  const byTitle = new Map<string, OrderBumpGroup>();

  for (const offer of offers) {
    const title = offer.sectionTitle?.trim() || fallbackTitle;
    let group = byTitle.get(title);
    if (!group) {
      group = { title, offers: [] };
      byTitle.set(title, group);
      groups.push(group);
    }
    group.offers.push(offer);
  }

  return groups;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Total de unidades escolhidas. */
export const selectedCount = (selection: BumpSelection): number =>
  Object.values(selection).reduce((sum, qty) => sum + qty, 0);

/**
 * A oferta pode ir junto com o produto principal, sem escolha nenhuma? Não pode quando tem variação
 * (tamanho, sabor) ou montagem (loja de comida): essas ficam só no carrinho, onde o "+" abre a escolha.
 */
export const isQuickOffer = (offer: OrderBumpSuggestion, businessType?: BusinessType): boolean =>
  !offer.product.hasVariations &&
  !requiresProductDetails({ isCustomizable: offer.product.isCustomizable }, businessType);

/** Ofertas que o grupo mostra na tela do produto: só as rápidas e com estoque. */
export const offersForProductScreen = (
  offers: OrderBumpSuggestion[],
  businessType?: BusinessType,
): OrderBumpSuggestion[] =>
  offers.filter((offer) => isQuickOffer(offer, businessType) && offer.product.totalStock > 0);

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
  businessType?: BusinessType,
): void {
  for (const { offer, quantity } of chosen) {
    // Oferta com variação ou montagem nunca entra direto (a escolha é feita no carrinho)
    if (!isQuickOffer(offer, businessType)) continue;
    addToCart({
      product: convertSuggestionToProduct(offer),
      isOrderBump: true,
      orderBumpId: offer.bumpId,
      orderBumpTrigger: {
        triggerType: offer.triggerType,
        triggerProductId: offer.triggerProductId,
      triggerProductIds: offer.triggerProductIds,
        triggerCategoryId: offer.triggerCategoryId,
        triggerCategoryIds: offer.triggerCategoryIds,
      },
    });
    if (quantity > 1) {
      updateQuantity(offer.product.id, quantity, undefined, offer.bumpId);
    }
  }
}
