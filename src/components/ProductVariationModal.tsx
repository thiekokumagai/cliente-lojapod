import type { Product } from "@/data/products";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface ProductVariationModalProps {
  product: Product;
  selectedOption: string | null;
  onSelect: (option: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ProductVariationModal = ({
  product,
  selectedOption,
  onSelect,
  onClose,
}: ProductVariationModalProps) => {
  const { items, addToCart, updateQuantity, removeFromCart, triggerAddedModal } = useCart();
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayQuantity, setDisplayQuantity] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const availableOptions = product.variationGroup?.options.filter((option) => option.available) ?? [];

  const quantityInCart = useMemo(() => {
    if (!selectedOption) return 0;

    const cartItem = items.find(
      (item) =>
        item.product.id === product.id &&
        item.selectedVariation === selectedOption
    );

    return cartItem?.quantity ?? 0;
  }, [items, product.id, selectedOption]);

  useEffect(() => {
    if (!selectedOption) {
      setDisplayQuantity(0);
      setIsLocked(false);
      return;
    }

    if (quantityInCart > 0) {
      setDisplayQuantity(quantityInCart);
      return;
    }

    if (!isLocked) {
      setDisplayQuantity(0);
    }
  }, [quantityInCart, selectedOption, isLocked]);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const startAutoClose = (variation: string) => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }

    autoCloseTimeoutRef.current = setTimeout(() => {
      triggerAddedModal({ product, selectedVariation: variation });
      onClose();
    }, 2000);
  };

  const handleBuy = () => {
    if (!selectedOption) return;
    setDisplayQuantity(1);
    setIsLocked(true);
    addToCart({ product, selectedVariation: selectedOption });
    startAutoClose(selectedOption);
  };

  const handleDecrease = () => {
    if (!selectedOption || displayQuantity === 0) return;

    const nextQuantity = displayQuantity - 1;
    setDisplayQuantity(nextQuantity);

    if (nextQuantity <= 0) {
      setIsLocked(false);
      removeFromCart(product.id, selectedOption);
      return;
    }

    updateQuantity(product.id, nextQuantity, selectedOption);
  };

  const handleIncrease = () => {
    if (!selectedOption || displayQuantity === 0) return;

    const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
    if (currentOption?.stock !== undefined && displayQuantity >= currentOption.stock) return;

    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, selectedOption);
  };

  const isAtLimit = useMemo(() => {
    if (!selectedOption) return false;
    const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
    return currentOption?.stock !== undefined && displayQuantity >= currentOption.stock;
  }, [product.variationGroup, selectedOption, displayQuantity]);

  if (!product.variationGroup) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Fechar seleção de variação"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Escolha a variação
        </p>
        <h3 className="mt-1 pr-8 text-lg font-bold text-foreground">{product.name}</h3>

        <div className="mt-5">
          <p className="text-sm font-medium text-foreground">{product.variationGroup.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {product.variationGroup.options.map((option) => {
              const isSelected = selectedOption === option.label;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => option.available && displayQuantity === 0 && onSelect(option.label)}
                  disabled={!option.available || displayQuantity > 0}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    option.available
                      ? isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                      : "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60"
                  } ${displayQuantity > 0 && !isSelected ? "opacity-60" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {availableOptions.length === 0 && (
          <p className="mt-4 text-sm text-destructive">
            Nenhuma variação disponível no momento.
          </p>
        )}

        {displayQuantity > 0 ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
              <button
                type="button"
                onClick={handleDecrease}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="text-base font-semibold">{displayQuantity}</span>

              <button
                type="button"
                disabled={isAtLimit}
                onClick={handleIncrease}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${isAtLimit ? "bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed" : "bg-primary-foreground/20"}`}
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Produto adicionado. Fechando...
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBuy}
            disabled={!selectedOption || availableOptions.length === 0}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${
              selectedOption && availableOptions.length > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Comprar
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductVariationModal;
