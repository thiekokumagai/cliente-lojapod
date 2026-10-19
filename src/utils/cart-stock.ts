import type { CartItem } from "@/contexts/CartContext";
import type { Product } from "@/data/products";

/**
 * Normalizes variation text for fuzzy comparison (e.g., "35mg" -> "35mg", "Uva / Ice" -> "uva / ice")
 */
function normalizeVar(v?: string | null): string {
  if (!v) return "";
  return v
    .trim()
    .toLowerCase()
    .replace(/\s*[\/\-]\s*/g, " - ")
    .replace(/\s+/g, " ");
}

/**
 * Checks if two variation labels represent the same variation.
 */
export function areVariationsEqual(v1?: string | null, v2?: string | null): boolean {
  const n1 = normalizeVar(v1);
  const n2 = normalizeVar(v2);
  if (!n1 && !n2) return true;
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

/**
 * Returns the total quantity of a specific product (and optional variation)
 * currently committed across all items in the cart (including components of combos).
 *
 * @param cartItems Current items in cart
 * @param targetProductId Product ID to look for
 * @param targetVariation Optional variation label of the product
 * @param excludeCartIndex Optional cart item index to exclude (useful when recalculating for updateQuantity)
 */
export function getReservedStockInCart(
  cartItems: CartItem[],
  targetProductId: string,
  targetVariation?: string | null,
  excludeCartIndex?: number
): number {
  let total = 0;

  cartItems.forEach((item, idx) => {
    if (excludeCartIndex !== undefined && idx === excludeCartIndex) {
      return;
    }

    if (item.product.isCombo) {
      // Look inside combo items
      const comboComponents = item.product.comboItems || [];
      comboComponents.forEach((ci) => {
        if (ci.productId === targetProductId) {
          const chosen = item.comboSelections?.find((cs) => cs.productId === ci.productId);
          const compVar = ci.variation || chosen?.variation;

          if (
            !targetVariation ||
            !compVar ||
            areVariationsEqual(compVar, targetVariation)
          ) {
            total += (ci.quantity || 1) * item.quantity;
          }
        }
      });
    } else {
      // Standalone product
      if (item.product.id === targetProductId) {
        if (
          !targetVariation ||
          !item.selectedVariation ||
          areVariationsEqual(item.selectedVariation, targetVariation)
        ) {
          total += item.quantity;
        }
      }
    }
  });

  return total;
}

/**
 * Resolves the available stock for a product, checking its variation options or base stock.
 */
export function getProductAvailableStock(
  product: Product,
  variationLabel?: string | null
): number | null {
  if (variationLabel && product.variationGroup) {
    const opt = product.variationGroup.options.find((o) =>
      areVariationsEqual(o.label, variationLabel)
    );
    if (opt?.stock !== undefined) return opt.stock;
  }

  if (variationLabel && product.variationGroups && product.variationGroups.length > 0) {
    for (const group of product.variationGroups) {
      const opt = group.options.find((o) =>
        areVariationsEqual(o.label, variationLabel)
      );
      if (opt?.stock !== undefined) return opt.stock;
    }
  }

  // Check product.items for exact or partial variation match
  if (variationLabel && product.items && product.items.length > 0) {
    const norm = normalizeVar(variationLabel);
    const matched = product.items.find((item) => {
      const vals = (item.options || [])
        .map((o) => normalizeVar(o.option?.value))
        .filter(Boolean);
      const joined = vals.join(" - ");
      return joined === norm || vals.includes(norm) || norm.includes(joined);
    });
    if (matched?.stock !== undefined) return matched.stock;
  }

  if (product.stock !== undefined) {
    return product.stock;
  }

  return null;
}

/**
 * Validates whether an entire cart state has any item/component exceeding available stock.
 * Returns an error message string if any SKU exceeds stock, or null if all valid.
 */
export function validateCartStockAllocation(cartItems: CartItem[]): string | null {
  // Aggregate demand per SKU key: `${productId}:::${variation}`
  const demandMap = new Map<
    string,
    { productId: string; variation?: string; productName: string; quantity: number; stock: number | null }
  >();

  for (const item of cartItems) {
    if (item.product.isCombo) {
      const comboComponents = item.product.comboItems || [];
      for (const ci of comboComponents) {
        const chosen = item.comboSelections?.find((cs) => cs.productId === ci.productId);
        const compVar = ci.variation || chosen?.variation || undefined;
        const key = `${ci.productId}:::${compVar || ""}`;
        const qty = (ci.quantity || 1) * item.quantity;

        const current = demandMap.get(key) || {
          productId: ci.productId,
          variation: compVar,
          productName: ci.productName || item.product.name,
          quantity: 0,
          stock: ci.componentProduct
            ? getProductAvailableStock(ci.componentProduct, compVar)
            : null,
        };
        current.quantity += qty;
        demandMap.set(key, current);
      }
    } else {
      const key = `${item.product.id}:::${item.selectedVariation || ""}`;
      const current = demandMap.get(key) || {
        productId: item.product.id,
        variation: item.selectedVariation,
        productName: item.product.name,
        quantity: 0,
        stock: getProductAvailableStock(item.product, item.selectedVariation),
      };
      current.quantity += item.quantity;
      demandMap.set(key, current);
    }
  }

  for (const record of demandMap.values()) {
    if (record.stock !== null && record.quantity > record.stock) {
      const varSuffix = record.variation ? ` (${record.variation})` : "";
      return `Estoque insuficiente para "${record.productName}${varSuffix}". Disponível no estoque: ${record.stock}, total no carrinho: ${record.quantity}.`;
    }
  }

  return null;
}
