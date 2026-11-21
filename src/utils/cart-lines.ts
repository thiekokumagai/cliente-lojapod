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
  customizationLineId?: string | null;
};

/** Linha criada por uma oferta "Peça também" (tem o id da oferta). */
export const isBumpLine = (item: Pick<LineLike, "orderBumpId" | "isOrderBump">): boolean =>
  !!item.orderBumpId || !!item.isOrderBump;

/** É a linha deste produto/variação/oferta/customização? `orderBumpId` ou `customizationLineId` ausentes = linha padrão. */
export const isSameCartLine = (
  item: LineLike,
  productId: string,
  selectedVariation?: string,
  orderBumpId?: string | null,
  customizationLineId?: string | null,
): boolean =>
  item.product.id === productId &&
  item.selectedVariation === selectedVariation &&
  (item.orderBumpId ?? null) === (orderBumpId ?? null) &&
  (item.customizationLineId ?? null) === (customizationLineId ?? null);

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

export interface CartItemWithBumpLike {
  product: {
    id: string;
    price: number;
    oldPrice?: number;
    isPromo?: boolean;
    categoryId?: string;
    isCombo?: boolean;
    comboItems?: Array<{ productId: string; componentProduct?: { categoryId?: string } }>;
  };
  quantity: number;
  selectedVariation?: string;
  comboSelections?: Array<{ productId: string; productItemId?: string; variation?: string }>;
  isOrderBump?: boolean;
  orderBumpId?: string;
  orderBumpTrigger?: {
    triggerType?: "ALL" | "CATEGORY" | "PRODUCT";
    triggerProductId?: string | null;
    triggerCategoryId?: string | null;
  };
  isCustomized?: boolean;
  customizationSnapshot?: any;
  customizationLineId?: string;
}

/**
 * Revalida os itens de Order Bump do carrinho sempre que um item é removido ou alterado:
 * - Se uma linha de Order Bump perdeu seu gatilho (ex.: não sobrou nenhum produto principal na sacola,
 *   ou o produto/categoria gatilho específico foi removido), ela perde o desconto do Order Bump:
 *   `price` volta para `oldPrice`, `isOrderBump` e `orderBumpId` são limpos, e se já houver uma linha
 *   normal do mesmo produto/variação, as quantidades são somadas.
 */
export function reconcileOrderBumpItems<T extends CartItemWithBumpLike>(items: T[]): T[] {
  const hasAnyBump = items.some((it) => isBumpLine(it));
  if (!hasAnyBump) return items;

  // Produtos presentes no carrinho (incluindo componentes de combos) com índice da linha
  const entries: Array<{ lineIdx: number; productId: string; categoryId?: string | null; isBump: boolean }> = [];
  items.forEach((it, lineIdx) => {
    const isBump = isBumpLine(it);
    if (it.product.isCombo && Array.isArray(it.product.comboItems)) {
      it.product.comboItems.forEach((ci) => {
        if (ci.productId) {
          entries.push({
            lineIdx,
            productId: ci.productId,
            categoryId: ci.componentProduct?.categoryId ?? null,
            isBump: false,
          });
        }
      });
    } else if (it.product?.id) {
      entries.push({
        lineIdx,
        productId: it.product.id,
        categoryId: it.product.categoryId ?? null,
        isBump,
      });
    }
  });

  const hasNonBumpItem = entries.some((e) => !e.isBump);

  let changed = false;
  const converted = items.map((item, idx) => {
    if (!isBumpLine(item)) return item;

    // Outros itens no carrinho além desta própria linha de order bump
    const others = entries.filter((e) => e.lineIdx !== idx && e.productId !== item.product.id);
    const trigger = item.orderBumpTrigger;
    const triggerType = trigger?.triggerType ?? "ALL";

    let triggerMet = false;
    if (hasNonBumpItem) {
      if (triggerType === "ALL") {
        triggerMet =
          others.length > 0 ||
          entries.some((e) => e.lineIdx !== idx && !e.isBump && e.productId === item.product.id);
      } else if (triggerType === "PRODUCT") {
        if (trigger?.triggerProductId) {
          triggerMet =
            others.some((e) => e.productId === trigger.triggerProductId) ||
            (trigger.triggerProductId === item.product.id &&
              entries.some((e) => e.lineIdx !== idx && !e.isBump && e.productId === trigger.triggerProductId));
        } else {
          triggerMet = others.length > 0;
        }
      } else if (triggerType === "CATEGORY") {
        if (trigger?.triggerCategoryId) {
          triggerMet = others.some((e) => e.categoryId === trigger.triggerCategoryId);
        } else {
          triggerMet = others.length > 0;
        }
      }
    }

    if (triggerMet) return item;

    changed = true;
    const revertedPrice =
      typeof item.product.oldPrice === "number" && item.product.oldPrice > item.product.price
        ? item.product.oldPrice
        : item.product.price;

    return {
      ...item,
      isOrderBump: undefined,
      orderBumpId: undefined,
      orderBumpTrigger: undefined,
      product: {
        ...item.product,
        price: revertedPrice,
        oldPrice: undefined,
        isPromo: false,
      },
    } as T;
  });

  if (!changed) return items;

  // Se uma linha de bump revertida coincidir com uma linha normal existente do mesmo produto/variação, soma as quantidades
  const merged: T[] = [];
  for (const item of converted) {
    if (!isBumpLine(item) && !item.product.isCombo && !item.customizationLineId) {
      const existingNormal = merged.find(
        (m) =>
          !isBumpLine(m) &&
          !m.product.isCombo &&
          !m.customizationLineId &&
          m.product.id === item.product.id &&
          m.selectedVariation === item.selectedVariation,
      );
      if (existingNormal) {
        existingNormal.quantity += item.quantity;
        continue;
      }
    }
    merged.push({ ...item });
  }

  return merged;
}
