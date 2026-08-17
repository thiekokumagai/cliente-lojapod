import type { Product } from "@/data/products";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import {
  isOptionAvailableGivenSelections,
  getSelectedCombinationStock,
} from "@/utils/variation-stock";

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

  const allGroups = useMemo(() => {
    return product.variationGroups && product.variationGroups.length > 0
      ? product.variationGroups
      : product.variationGroup
        ? [product.variationGroup]
        : [];
  }, [product.variationGroups, product.variationGroup]);

  const allOptions = useMemo(() => {
    return allGroups.flatMap((g) => g.options);
  }, [allGroups]);

  const availableOptions = useMemo(() => {
    return allOptions.filter((option) => option.available);
  }, [allOptions]);

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    if (!selectedOption) return {};
    const parts = selectedOption.split(" / ").map((p) => p.trim());
    const initial: Record<string, string> = {};
    parts.forEach((part) => {
      const group = allGroups.find((g) =>
        g.options.some((o) => o.label === part)
      );
      if (group) {
        initial[group.name] = part;
      }
    });
    return initial;
  });

  const combinedVariation = useMemo(() => {
    return allGroups
      .map((g) => selections[g.name])
      .filter(Boolean)
      .join(" / ");
  }, [allGroups, selections]);

  const allSelected = useMemo(() => {
    if (allGroups.length === 0) return false;
    return allGroups.every((g) => !!selections[g.name]);
  }, [allGroups, selections]);

  const combinationStock = useMemo(() => {
    return getSelectedCombinationStock(
      product,
      selections,
      allGroups.map((g) => g.name)
    );
  }, [product, selections, allGroups]);

  const isCombinationUnavailable = useMemo(() => {
    return combinationStock !== null && combinationStock <= 0;
  }, [combinationStock]);

  const canAddToCart = allSelected && !isCombinationUnavailable;

  const quantityInCart = useMemo(() => {
    if (!combinedVariation) return 0;

    const cartItem = items.find(
      (item) =>
        item.product.id === product.id &&
        item.selectedVariation === combinedVariation
    );

    return cartItem?.quantity ?? 0;
  }, [items, product.id, combinedVariation]);

  useEffect(() => {
    if (!combinedVariation || !allSelected) {
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
  }, [quantityInCart, combinedVariation, allSelected, isLocked]);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const handleOptionSelect = (groupName: string, optionLabel: string) => {
    if (displayQuantity > 0) return;

    setSelections((prev) => {
      const next = { ...prev };
      if (next[groupName] === optionLabel) {
        delete next[groupName];
      } else {
        next[groupName] = optionLabel;
      }

      const nextCombined = allGroups
        .map((g) => next[g.name])
        .filter(Boolean)
        .join(" / ");

      onSelect(nextCombined);
      return next;
    });
  };

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
    if (!combinedVariation || !canAddToCart) return;
    setDisplayQuantity(1);
    setIsLocked(true);
    addToCart({ product, selectedVariation: combinedVariation });
    startAutoClose(combinedVariation);
  };

  const handleDecrease = () => {
    if (!combinedVariation || displayQuantity === 0) return;

    const nextQuantity = displayQuantity - 1;
    setDisplayQuantity(nextQuantity);

    if (nextQuantity <= 0) {
      setIsLocked(false);
      removeFromCart(product.id, combinedVariation);
      return;
    }

    updateQuantity(product.id, nextQuantity, combinedVariation);
  };

  const handleIncrease = () => {
    if (!combinedVariation || displayQuantity === 0) return;
    if (combinationStock !== null && displayQuantity >= combinationStock) return;

    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, combinedVariation);
  };

  const isAtLimit = useMemo(() => {
    if (combinationStock !== null && displayQuantity >= combinationStock) return true;
    return false;
  }, [combinationStock, displayQuantity]);

  if (allGroups.length === 0) return null;

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

        <div className="mt-5 space-y-4">
          {allGroups.map((group) => (
            <div key={group.name}>
              <p className="text-sm font-medium text-foreground">{group.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {group.options.map((option) => {
                  const isSelected = selections[group.name] === option.label;
                  const isAvailable =
                    option.available &&
                    isOptionAvailableGivenSelections(
                      product,
                      group.name,
                      option.label,
                      selections
                    );

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => isAvailable && displayQuantity === 0 && handleOptionSelect(group.name, option.label)}
                      disabled={!isAvailable || displayQuantity > 0}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        isAvailable
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
          ))}
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
            disabled={!canAddToCart}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${
              canAddToCart
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            {isCombinationUnavailable
              ? "Esgotado"
              : !allSelected
                ? "Selecione as variações"
                : "Comprar"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductVariationModal;
