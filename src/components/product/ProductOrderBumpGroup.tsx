import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { OrderBumpSuggestion } from "@/services/order-bumps";
import { buildImageUrl } from "@/utils/image-url";
import {
  canIncrease,
  decrease,
  groupOrderBumpsByTitle,
  increase,
  type BumpSelection,
} from "@/utils/order-bump-selection";

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

interface ProductOrderBumpGroupProps {
  offers: OrderBumpSuggestion[];
  selection: BumpSelection;
  onChange: (selection: BumpSelection) => void;
}

/**
 * Grupos opcionais "Peça também" dentro da tela do produto (ex.: "Frios & Queijos",
 * "Leve junto uma Bebida"): foto, nome, descrição curta, preço da oferta e botão + com quantidade.
 * O + só guarda a escolha; quem coloca no carrinho é o botão "Adicionar" da tela do produto.
 */
const ProductOrderBumpGroup = ({ offers, selection, onChange }: ProductOrderBumpGroupProps) => {
  const { items } = useCart();
  const baseId = useId();

  if (offers.length === 0) return null;

  const groups = groupOrderBumpsByTitle(offers);

  // O que já está no carrinho desse produto (em qualquer linha) conta no estoque
  const inCart = (productId: string) =>
    items.filter((i) => i.product.id === productId).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mt-6 space-y-6" data-testid="product-order-bump-group">
      {groups.map((group, groupIndex) => {
        const headingId = `${baseId}-title-${groupIndex}`;
        const count = group.offers.reduce((sum, offer) => sum + (selection[offer.bumpId] ?? 0), 0);

        return (
          <section
            key={group.title}
            aria-labelledby={headingId}
            data-testid="product-order-bump-section"
          >
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
              <div className="min-w-0">
                <h3 id={headingId} className="text-base font-bold text-foreground">
                  {group.title}
                </h3>
              </div>
              {count > 0 && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground" aria-live="polite">
                  {count} {count === 1 ? "selecionado" : "selecionados"}
                </span>
              )}
            </div>

            <ul className="divide-y divide-border/50">
              {group.offers.map((offer) => {
                const quantity = selection[offer.bumpId] ?? 0;
                const reserved = inCart(offer.product.id);
                const canAdd = canIncrease(selection, offer, reserved);
                const price = Number(offer.product.price);
                const original = Number(offer.product.originalPrice);

                return (
                  <li key={offer.bumpId} className="flex items-center gap-3 px-1 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground">{offer.product.title}</p>
                      {offer.product.description ? (
                        <p className="text-sm text-muted-foreground">{offer.product.description}</p>
                      ) : null}
                      <p className="text-sm text-foreground">
                        {price > 0 ? `+ ${formatPrice(price)}` : "Sem acréscimo"}
                        {offer.product.hasDiscount && original > price ? (
                          <span className="ml-2 text-xs text-muted-foreground line-through">{formatPrice(original)}</span>
                        ) : null}
                      </p>
                    </div>

                    {offer.product.imageUrl ? (
                      <img
                        src={buildImageUrl(offer.product.imageUrl)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : null}

                    <div className="flex shrink-0 items-center gap-1">
                      {quantity > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => onChange(decrease(selection, offer.bumpId))}
                            aria-label={`Diminuir ${offer.product.title}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-muted"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          <span className="min-w-5 text-center text-base font-semibold tabular-nums" aria-live="polite">
                            {quantity}
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={!canAdd}
                        onClick={() => onChange(increase(selection, offer, reserved))}
                        aria-label={`Adicionar ${offer.product.title}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default ProductOrderBumpGroup;
