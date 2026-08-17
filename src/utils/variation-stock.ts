import type { Product } from "@/data/products";

/**
 * Checks if a specific option in a target group is available (has stock > 0)
 * given the user's active selections in OTHER variation groups.
 */
export function isOptionAvailableGivenSelections(
  product: Product,
  groupName: string,
  optionLabel: string,
  selections: Record<string, string>
): boolean {
  if (!product.items || product.items.length === 0) {
    return true;
  }

  const otherSelectedValues = Object.entries(selections)
    .filter(([gName, val]) => gName !== groupName && !!val)
    .map(([, val]) => val);

  return product.items.some((item) => {
    if ((item.stock || 0) <= 0) return false;
    if (!item.options || item.options.length === 0) return false;

    const hasThisOption = item.options.some(
      (o) => o.option?.value === optionLabel
    );
    if (!hasThisOption) return false;

    const hasAllOtherOptions = otherSelectedValues.every((otherVal) =>
      item.options.some((o) => o.option?.value === otherVal)
    );

    return hasAllOtherOptions;
  });
}

/**
 * Checks stock for the complete combination of selected options across all variation groups.
 * Returns the SKU stock count if complete match found, 0 if combination doesn't exist/has 0 stock, or null if items not defined.
 */
export function getSelectedCombinationStock(
  product: Product,
  selections: Record<string, string>,
  allGroupNames: string[]
): number | null {
  if (!product.items || product.items.length === 0) {
    return null;
  }

  const isComplete = allGroupNames.length > 0 && allGroupNames.every((name) => !!selections[name]);
  if (!isComplete) return null;

  const selectedValues = allGroupNames.map((name) => selections[name]);

  const matchingItem = product.items.find((item) =>
    selectedValues.every((val) =>
      item.options?.some((o) => o.option?.value === val)
    )
  );

  return matchingItem ? (matchingItem.stock ?? 0) : 0;
}
