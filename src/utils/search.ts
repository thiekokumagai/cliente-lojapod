import { Product } from "@/data/products";

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesProductSearch(searchTerm: string, product: Product): boolean {
  const trimmed = searchTerm.trim();
  if (!trimmed) return true;

  const searchWords = normalizeSearchText(trimmed)
    .split(/\s+/)
    .filter(Boolean);

  if (searchWords.length === 0) return true;

  let searchableText = `${product.name || ""} ${product.description || ""} ${product.category || ""}`;

  const groups =
    product.variationGroups && product.variationGroups.length > 0
      ? product.variationGroups
      : product.variationGroup
        ? [product.variationGroup]
        : [];

  for (const group of groups) {
    if (group.name) searchableText += ` ${group.name}`;
    for (const opt of group.options || []) {
      if (opt.label) searchableText += ` ${opt.label}`;
    }
  }

  const normalizedSearchable = normalizeSearchText(searchableText);

  return searchWords.every((word) => normalizedSearchable.includes(word));
}
