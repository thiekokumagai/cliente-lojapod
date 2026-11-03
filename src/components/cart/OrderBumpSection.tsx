import { useState, useEffect, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { orderBumpsService, OrderBumpSuggestion } from "@/services/order-bumps";
import type { Product, ProductVariationGroup } from "@/data/products";
import { buildImageUrl } from "@/utils/image-url";

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

    return {
      id: raw.id,
      name: raw.title,
      image: raw.imageUrl ? buildImageUrl(raw.imageUrl) : "",
      images: raw.imageUrl ? [buildImageUrl(raw.imageUrl)] : [],
      category: "",
      description: "",
      price: raw.price,
      oldPrice: raw.hasDiscount ? raw.originalPrice : undefined,
      isPromo: raw.hasDiscount,
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
      onOpenVariationModal(prod);
    } else {
      addToCart(prod);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-slate-50/70 dark:bg-card/50 p-3.5 my-3">
      {/* Título Clean Sem Ícone */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          {sectionTitle}
        </span>
      </div>

      {/* Carrossel Horizontal de Cards Clean */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar snap-x">
        {suggestions.map((sug) => {
          const cartItem = items.find((ci) => ci.product.id === sug.product.id);
          const inCartQuantity = cartItem ? cartItem.quantity : 0;
          const isAtStockLimit = inCartQuantity >= sug.product.totalStock;

          return (
            <div
              key={sug.bumpId}
              className="min-w-[145px] max-w-[145px] sm:min-w-[160px] sm:max-w-[160px] bg-background rounded-xl p-2.5 border border-border/70 shadow-2xs flex flex-col justify-between shrink-0 snap-start"
            >
              <div>
                {/* Imagem do Produto */}
                {sug.product.imageUrl ? (
                  <img
                    src={buildImageUrl(sug.product.imageUrl)}
                    alt={sug.product.title}
                    className="w-full h-20 object-cover rounded-lg border border-border/50 mb-2"
                  />
                ) : (
                  <div className="w-full h-20 rounded-lg bg-muted border border-border/50 mb-2 flex items-center justify-center text-xs text-muted-foreground">
                    Sem foto
                  </div>
                )}

                {/* Título */}
                <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                  {sug.product.title}
                </h4>
              </div>

              {/* Preço e Botão */}
              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
                <div className="flex flex-col min-w-0">
                  {sug.product.hasDiscount && (
                    <span className="text-[10px] text-muted-foreground line-through leading-none truncate">
                      {formatPrice(sug.product.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-primary leading-tight truncate">
                    {formatPrice(sug.product.price)}
                  </span>
                </div>

                {sug.product.hasVariations ? (
                  <button
                    type="button"
                    onClick={() => handleAdd(sug)}
                    className="h-7 px-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Opções
                  </button>
                ) : inCartQuantity > 0 ? (
                  <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(sug.product.id, inCartQuantity - 1)}
                      className="h-6 w-6 flex items-center justify-center text-xs font-bold text-foreground hover:bg-background rounded-md transition-colors"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold px-1 text-foreground">
                      {inCartQuantity}
                    </span>
                    <button
                      type="button"
                      disabled={isAtStockLimit}
                      onClick={() => updateQuantity(sug.product.id, inCartQuantity + 1)}
                      className={`h-6 w-6 flex items-center justify-center text-xs font-bold rounded-md transition-colors ${
                        isAtStockLimit
                          ? "text-muted-foreground opacity-50 cursor-not-allowed"
                          : "text-foreground hover:bg-background"
                      }`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(sug)}
                    className="h-7 px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
