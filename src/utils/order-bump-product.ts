import type { Product, ProductVariationGroup } from "@/data/products";
import type { OrderBumpSuggestion } from "@/services/order-bumps";
import { buildImageUrl } from "@/utils/image-url";

/** Variações que a API pode mandar junto da sugestão (produto com tamanho, sabor...). */
interface RawVariation {
  variation?: { title?: string; options?: Array<{ value: string }> } | null;
}

/**
 * Converte a sugestão da API ("Peça também") em um produto do carrinho, com o preço da OFERTA
 * (preço promocional da regra ou desconto), que é o preço que a API aceita no pedido.
 * Usado pelo carrinho e pelo grupo dentro da tela do produto.
 */
export function convertSuggestionToProduct(sug: OrderBumpSuggestion): Product {
  const raw = sug.product;

  // Monta os variationGroups caso o produto tenha variações
  const variationGroups: ProductVariationGroup[] = [];
  const rawVariations = (raw as unknown as { variations?: RawVariation[] }).variations;
  if (rawVariations && rawVariations.length > 0) {
    for (const vItem of rawVariations) {
      const v = vItem?.variation;
      if (!v || !v.options || v.options.length === 0) continue;

      const options = v.options.map((opt) => ({
        label: opt.value,
        available: true,
        stock: raw.totalStock,
      }));

      if (options.length > 0) {
        variationGroups.push({
          name: v.title || "Variação",
          options,
        });
      }
    }
  }

  const rawPrice = Number(raw.price);
  const rawOrig = Number(raw.originalPrice);
  const finalPrice = rawPrice > 0 ? rawPrice : rawOrig > 0 ? rawOrig : 0;
  const hasDiscount = !!raw.hasDiscount && rawOrig > finalPrice;

  return {
    id: raw.id,
    name: raw.title,
    image: raw.imageUrl ? buildImageUrl(raw.imageUrl) : "",
    images: raw.imageUrl ? [buildImageUrl(raw.imageUrl)] : [],
    category: "",
    description: "",
    price: finalPrice,
    oldPrice: hasDiscount ? rawOrig : undefined,
    isPromo: hasDiscount,
    stock: raw.totalStock,
    variationGroups: variationGroups.length > 0 ? variationGroups : undefined,
    items: (raw.items || []).map((it) => ({
      stock: it.stock,
      options: (it.options || []).map((opt) => ({
        option: {
          id: opt.option.id,
          value: opt.option.value,
        },
      })),
    })),
  };
}
