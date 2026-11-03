import { useState, useEffect, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { orderBumpsService, OrderBumpSuggestion } from "@/services/order-bumps";
import type { Product, ProductVariationGroup } from "@/data/products";
import { buildImageUrl } from "@/utils/image-url";
import { Plus } from "lucide-react";

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

interface OrderBumpSectionProps {
  onOpenVariationModal?: (product: Product) => void;
}

export function OrderBumpSection({ onOpenVariationModal }: OrderBumpSectionProps) {
  const { items, addToCart, updateQuantity } = useCart();
  const [suggestions, setSuggestions] = useState<OrderBumpSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lista de IDs dos produtos atualmente no carrinho
  const cartProductIds = useMemo(() => {
    return items.map((it) => it.product.id).filter(Boolean);
  }, [items]);

  useEffect(() => {
    if (cartProductIds.length === 0) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    orderBumpsService
      .getSuggestions(cartProductIds)
      .then((data) => {
        if (isMounted) {
          setSuggestions(data || []);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar sugestões do carrinho:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cartProductIds.join(",")]);

  // Se não houver sugestões, não renderiza nada para não poluir
  if (suggestions.length === 0) {
    return null;
  }

  const sectionTitle = suggestions[0]?.sectionTitle || "Peça também";

  // Converte a sugestão em um objeto compatível com Product
  const convertSuggestionToProduct = (sug: OrderBumpSuggestion): Product => {
    const raw = sug.product;

    // Monta os variationGroups caso o produto tenha variações
    const variationGroups: ProductVariationGroup[] = [];
    if ((raw as any).variations && (raw as any).variations.length > 0) {
      for (const vItem of (raw as any).variations) {
        const v = vItem?.variation;
        if (!v || !v.options || v.options.length === 0) continue;

        const options = v.options.map((opt: any) => ({
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
    const finalPrice = rawPrice > 0 ? rawPrice : (rawOrig > 0 ? rawOrig : 0);
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
  };

  const handleAdd = (sug: OrderBumpSuggestion) => {
    const prod = convertSuggestionToProduct(sug);

    if (sug.product.hasVariations && onOpenVariationModal) {
      onOpenVariationModal({
        ...prod,
        isOrderBump: true,
        orderBumpId: sug.bumpId,
      } as any);
    } else {
      addToCart({
        product: prod,
        isOrderBump: true,
        orderBumpId: sug.bumpId,
      } as any);
    }
  };

  return (
    <section className="mt-6 space-y-3" aria-labelledby="order-bump-title">
      <h3 id="order-bump-title" className="text-base font-semibold text-foreground">
        {sectionTitle}
      </h3>

      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none no-scrollbar"
        role="list"
        aria-label={`Sugestões: ${sectionTitle}`}
      >
        {suggestions.map((sug) => {
          const cartItem = items.find((ci) => ci.product.id === sug.product.id);
          const inCartQuantity = cartItem ? cartItem.quantity : 0;
          const isAtStockLimit = inCartQuantity >= sug.product.totalStock;

          return (
            <article
              key={sug.bumpId}
              className="w-[122px] shrink-0 snap-start sm:w-[134px]"
              role="listitem"
            >
              <div className="relative h-[120px] overflow-hidden rounded-3xl bg-muted sm:h-[138px]">
                {sug.product.imageUrl ? (
                  <img
                    src={buildImageUrl(sug.product.imageUrl)}
                    alt={sug.product.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Sem foto
                  </div>
                )}

                {sug.product.hasVariations || inCartQuantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAdd(sug)}
                    className="absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-[38px] sm:w-[38px]"
                    title="Adicionar ao carrinho"
                    aria-label="Adicionar ao carrinho"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => updateQuantity(sug.product.id, inCartQuantity - 1)}
                      aria-label={`Diminuir ${sug.product.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span aria-hidden="true" className="text-xl leading-none">−</span>
                    </button>
                    <span className="min-w-5 text-center text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
                      {inCartQuantity}
                    </span>
                    <button
                      type="button"
                      disabled={isAtStockLimit}
                      onClick={() => updateQuantity(sug.product.id, inCartQuantity + 1)}
                      aria-label={`Aumentar ${sug.product.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {formatPrice(sug.product.price)}
                  </span>
                  {sug.product.hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(sug.product.originalPrice)}
                    </span>
                  )}
                </div>
                <h4 className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-foreground">
                  {sug.product.title}
                </h4>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
