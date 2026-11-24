import { useState, useEffect, useMemo, useId } from "react";
import { useCart } from "@/contexts/CartContext";
import { orderBumpsService, OrderBumpSuggestion } from "@/services/order-bumps";
import type { Product } from "@/data/products";
import { buildImageUrl } from "@/utils/image-url";
import { convertSuggestionToProduct } from "@/utils/order-bump-product";
import { groupOrderBumpsByTitle } from "@/utils/order-bump-selection";
import { requiresProductDetails } from "@/utils/business-type";
import type { BusinessType } from "@/hooks/useStoreSettings";
import { Plus } from "lucide-react";

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

interface OrderBumpSectionProps {
  onOpenVariationModal?: (product: Product) => void;
  /** Abre a tela do produto (montagem). Recebe o produto com o preço normal, sem o desconto da oferta. */
  onOpenProductDetails?: (product: Product) => void;
  businessType?: BusinessType;
}

export function OrderBumpSection({ onOpenVariationModal, onOpenProductDetails, businessType }: OrderBumpSectionProps) {
  const { items, addToCart, updateQuantity } = useCart();
  const [suggestions, setSuggestions] = useState<OrderBumpSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const baseId = useId();

  // Lista de IDs dos produtos atualmente no carrinho
  const cartProductIdsKey = useMemo(() => {
    return items
      .map((it) => it.product.id)
      .filter(Boolean)
      .join(",");
  }, [items]);

  useEffect(() => {
    const cartProductIds = cartProductIdsKey ? cartProductIdsKey.split(",") : [];
    if (cartProductIds.length === 0) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    orderBumpsService
      .getSuggestions(cartProductIds, "CART")
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
  }, [cartProductIdsKey]);

  // Se não houver sugestões, não renderiza nada para não poluir
  if (suggestions.length === 0) {
    return null;
  }

  const groups = groupOrderBumpsByTitle(suggestions);

  const handleAdd = (sug: OrderBumpSuggestion) => {
    const prod = convertSuggestionToProduct(sug);

    // Produto com montagem não entra direto: o cliente escolhe as opções na tela do produto.
    // Vai como item normal (preço normal), porque a montagem não passa pelo preço da oferta.
    if (requiresProductDetails(prod, businessType)) {
      onOpenProductDetails?.({
        ...prod,
        price: Number(sug.product.originalPrice) > 0 ? Number(sug.product.originalPrice) : prod.price,
        oldPrice: undefined,
        isPromo: false,
      });
      return;
    }

    const orderBumpTrigger = {
      triggerType: sug.triggerType,
      triggerProductId: sug.triggerProductId,
      triggerProductIds: sug.triggerProductIds,
      triggerCategoryId: sug.triggerCategoryId,
      triggerCategoryIds: sug.triggerCategoryIds,
    };

    if (sug.product.hasVariations && onOpenVariationModal) {
      onOpenVariationModal({
        ...prod,
        isOrderBump: true,
        orderBumpId: sug.bumpId,
        orderBumpTrigger,
      } as Product);
    } else {
      addToCart({
        product: prod,
        isOrderBump: true,
        orderBumpId: sug.bumpId,
        orderBumpTrigger,
      });
    }
  };

  return (
    <div className="mt-6 space-y-5">
      {groups.map((group, groupIndex) => {
        const headingId = `${baseId}-title-${groupIndex}`;

        return (
          <section
            key={group.title}
            className="space-y-3"
            aria-labelledby={headingId}
            data-testid="cart-order-bump-group"
          >
            <h3 id={headingId} className="text-base font-semibold text-foreground">
              {group.title}
            </h3>

            <div
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none no-scrollbar"
              role="list"
              aria-label={`Sugestões: ${group.title}`}
            >
              {group.offers.map((sug) => {
                const cartItem = items.find((ci) => ci.product.id === sug.product.id && ci.orderBumpId === sug.bumpId);
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
                            onClick={() => updateQuantity(sug.product.id, inCartQuantity - 1, undefined, sug.bumpId)}
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
                            onClick={() => updateQuantity(sug.product.id, inCartQuantity + 1, undefined, sug.bumpId)}
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
      })}
    </div>
  );
}
