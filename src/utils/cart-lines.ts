/**
 * Uma linha do carrinho é identificada por produto + variação + oferta "Peça também" (`orderBumpId`).
 * A mesma bebida pode estar no carrinho duas vezes: normal (preço cheio) e como oferta (preço da
 * oferta). Antes a linha era identificada só por produto + variação, e as duas viravam uma só, com o
 * preço da primeira que entrou.
 */
type LineLike = {
  product: { id: string };
  selectedVariation?: string;
  orderBumpId?: string | null;
  isOrderBump?: boolean;
};

/** Linha criada por uma oferta "Peça também" (tem o id da oferta). */
export const isBumpLine = (item: Pick<LineLike, "orderBumpId" | "isOrderBump">): boolean =>
  !!item.orderBumpId || !!item.isOrderBump;

/** É a linha deste produto/variação/oferta? `orderBumpId` ausente = linha normal (sem oferta). */
export const isSameCartLine = (
  item: LineLike,
  productId: string,
  selectedVariation?: string,
  orderBumpId?: string | null,
): boolean =>
  item.product.id === productId &&
  item.selectedVariation === selectedVariation &&
  (item.orderBumpId ?? null) === (orderBumpId ?? null);

/**
 * Ajusta o preço do item de acordo com as regras de forma de pagamento:
 * - Produtos normais em promoção revertem para `oldPrice` quando a forma de pagamento não permite preço promocional (ex: Cartão).
 * - Combos e itens de Order Bump NÃO revertem para `oldPrice`, pois possuem preços tabelados/de oferta próprios.
 */
export function resolveEffectiveCartItem<T extends { product: any; isOrderBump?: boolean; orderBumpId?: string | null }>(
  item: T,
  isPromoAllowed: boolean,
): T {
  if (isPromoAllowed) return item;
  if (!item.product?.isCombo && !isBumpLine(item) && item.product?.isPromo && item.product?.oldPrice) {
    return {
      ...item,
      product: {
        ...item.product,
        price: item.product.oldPrice,
        isPromo: false,
        oldPrice: undefined,
      },
    };
  }
  return item;
}
