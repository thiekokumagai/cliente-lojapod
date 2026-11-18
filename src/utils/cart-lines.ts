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
