import type { Product } from "@/data/products";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, X, Search } from "lucide-react";
import ProductImageModal from "@/components/ProductImageModal";
import ProductShareMenu from "@/components/product/ProductShareMenu";
import ProductContact from "@/components/product/ProductContact";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/contexts/CartContext";
import seloMaisVendido from "@/assets/seloMaisVendido.png";
import {
  isOptionAvailableGivenSelections,
  getSelectedCombinationStock,
} from "@/utils/variation-stock";

interface ProductDetailsModalProps {
  product: Product;
  selectedOption?: string | null;
  onSelect?: (option: string) => void;
  onClose: () => void;
  onConfirm?: () => void;
}


const ProductDetailsModal = ({
  product,
  selectedOption,
  onSelect,
  onClose,
}: ProductDetailsModalProps) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Wait for animation
  };
  const { items, addToCart, updateQuantity, removeFromCart, triggerAddedModal } = useCart();
  const gallery = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    return product?.image ? [product.image] : [];
  }, [product]);

  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [displayQuantity, setDisplayQuantity] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const discountPercentage = useMemo(() => {
    if (product.isPromo && product.oldPrice && product.price < product.oldPrice) {
      return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    }
    return 0;
  }, [product.isPromo, product.oldPrice, product.price]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
    if (allGroups.length === 0) return true;
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
    if (allGroups.length > 0) {
      return combinationStock !== null && combinationStock <= 0;
    }
    return product.stock !== undefined && product.stock <= 0;
  }, [combinationStock, allGroups.length, product.stock]);

  const canAddToCart = allSelected && !isCombinationUnavailable;

  const quantityInCart = useMemo(() => {
    const variationToCheck = allGroups.length > 0 ? combinedVariation : undefined;
    if (allGroups.length > 0 && !combinedVariation) return 0;

    const cartItem = items.find(
      (item) =>
        item.product.id === product.id &&
        item.selectedVariation === variationToCheck
    );

    return cartItem?.quantity ?? 0;
  }, [items, product.id, combinedVariation, allGroups.length]);

  useEffect(() => {
    const hasVariations = allGroups.length > 0;

    if (hasVariations && (!combinedVariation || !allSelected)) {
      setDisplayQuantity(1);
      setIsLocked(false);
      return;
    }

    if (quantityInCart > 0) {
      setDisplayQuantity(quantityInCart);
      return;
    }

    if (!isLocked) {
      setDisplayQuantity(1);
    }
  }, [quantityInCart, combinedVariation, allSelected, isLocked, allGroups.length]);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const handleOptionSelect = (groupName: string, optionLabel: string) => {
    if (quantityInCart > 0) return;

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

      onSelect?.(nextCombined);
      return next;
    });
  };
  const startAutoClose = (variation?: string) => {
    triggerAddedModal({ product, selectedVariation: variation });
    handleClose();
  };

  const handleBuy = () => {
    if (!canAddToCart) return;
    setIsLocked(true);
    const variation = allGroups.length > 0 ? combinedVariation : undefined;
    
    addToCart({ product, selectedVariation: variation });
    if (displayQuantity > 1) {
      updateQuantity(product.id, displayQuantity, variation);
    }
    
    startAutoClose(variation);
  };

  const handleDecrease = () => {
    const variation = allGroups.length > 0 ? combinedVariation : undefined;
    const nextQuantity = displayQuantity - 1;

    if (quantityInCart === 0) {
      if (nextQuantity >= 1) {
        setDisplayQuantity(nextQuantity);
      }
      return;
    }

    if (nextQuantity <= 0) {
      removeFromCart(product.id, variation);
      setIsLocked(false);
      setDisplayQuantity(1);
      return;
    }

    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, variation);
  };

  const isAtLimit = useMemo(() => {
    const maxStock = allGroups.length > 0 ? combinationStock : product.stock;
    if (maxStock !== null && maxStock !== undefined && displayQuantity >= maxStock) return true;
    return false;
  }, [combinationStock, displayQuantity, allGroups.length, product.stock]);

  const handleIncrease = () => {
    if (isAtLimit) return;

    const variation = allGroups.length > 0 ? combinedVariation : undefined;
    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);

    if (quantityInCart > 0) {
      updateQuantity(product.id, nextQuantity, variation);
    }
  };

  const selectedOptionsAdditions = useMemo(() => {
    let extra = 0;
    allGroups.forEach((g) => {
      const selectedLabel = selections[g.name];
      if (selectedLabel) {
        const opt = g.options.find((o) => o.label === selectedLabel);
        if (opt?.additionalPrice) extra += opt.additionalPrice;
      }
    });
    return extra;
  }, [allGroups, selections]);


  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 p-0 md:items-center md:justify-center md:p-4 transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative flex h-[96vh] h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl md:max-w-md md:rounded-2xl transition-transform duration-300 ${
          isClosing ? "translate-y-full" : "translate-y-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md transition-all hover:bg-white/90 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-28">
          {gallery.length > 0 && (
            <div className="relative aspect-square w-full shrink-0 bg-[#f5f5f5]">
              <div className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(i);
                      setIsImageModalOpen(true);
                    }}
                    className="h-full w-full shrink-0 snap-center focus:outline-none"
                  >
                    <img
                      src={img}
                      alt={`${product.name} - Imagem ${i + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
              
              {Boolean(product.isBestSeller) && (
                <img
                  src={seloMaisVendido}
                  alt="Selo Mais Vendido"
                  className="absolute right-16 top-4 z-10 h-10 w-10 object-contain drop-shadow-md"
                />
              )}
              
              {discountPercentage > 0 && (
                <span className="absolute left-16 top-5 z-10 rounded-full bg-[#DE2839] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                  -{discountPercentage}%
                </span>
              )}
              {gallery.length > 1 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                  Deslize para ver {gallery.length} fotos
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedImageIndex(0);
                  setIsImageModalOpen(true);
                }}
                aria-label="Ampliar imagem"
                className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-bl-[28px] bg-black/20 text-white backdrop-blur-sm"
              >
                <Search className="h-5 w-5" />
              </button>

              <ProductShareMenu
                productName={product.name}
                triggerClassName="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#e10600] border border-gray-200 shadow-lg transition-transform active:scale-95"
              />
            </div>
          )}

          <div className={`p-5 ${gallery.length === 0 ? "pt-16" : ""}`}>
            {product.category && (
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary">
                {product.category}
              </span>
            )}
            <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
          {product.description && (
            <div 
              className="mt-2 text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: product.description }} 
            />
          )}
          <div className="mt-4">
            {product.oldPrice && (
              <span className="block text-sm text-muted-foreground line-through">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  product.oldPrice
                )}
              </span>
            )}
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  product.price
                )}
              </p>
              {product.isPromo && (
                <span className="text-sm font-medium text-[#DE2839]">
                  no PIX
                </span>
              )}
            </div>
          </div>

          {allGroups.length > 0 && (
            <div className="mt-6 space-y-6">
              {allGroups.map((group) => (
                <div key={group.name}>
                  <div className="mb-3 bg-muted/30 p-3 rounded-lg">
                    <p className="text-base font-bold text-foreground">{group.name}</p>
                    <p className="text-sm text-muted-foreground">Escolha 1 opção</p>
                  </div>
                  <div className="space-y-0 divide-y divide-border/50">
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
                          onClick={() => isAvailable && quantityInCart === 0 && handleOptionSelect(group.name, option.label)}
                          disabled={!isAvailable || quantityInCart > 0}
                          className={`flex w-full items-center justify-between py-4 text-left transition-colors ${
                            isAvailable
                              ? "hover:bg-muted/50"
                              : "cursor-not-allowed opacity-50"
                          } ${quantityInCart > 0 && !isSelected ? "opacity-50" : ""}`}
                        >
                          <div>
                            <p className={`text-base font-medium px-4 ${!isAvailable ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {option.label}
                            </p>
                            {option.additionalPrice ? (
                              <p className="text-sm text-muted-foreground">
                                + {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(option.additionalPrice)}
                              </p>
                            ) : null}
                          </div>
                          <div className="ml-4 mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary">
                            {isSelected ? (
                              <div className="h-3 w-3 rounded-full bg-primary" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {allGroups.length > 0 && availableOptions.length === 0 && (
            <p className="mt-4 text-sm text-destructive">
              Nenhuma variação disponível no momento.
            </p>
          )}

          <div className="mt-6 border-t border-border-subtle pt-6">
            <button
              type="button"
              onClick={handleClose}
              className="mb-6 w-full rounded-xl border border-primary px-6 py-3 text-center text-base font-medium text-primary"
            >
              Voltar pra loja
            </button>
            <ProductContact productName={product.name} />
          </div>

          <div className="mt-8 -mx-5 border-t border-border/50 bg-background pb-8 block md:hidden">
            <SiteFooter />
          </div>
          </div>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-border bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex h-12 flex-1 items-center justify-between rounded-xl border border-border px-4">
            <button
              type="button"
              onClick={handleDecrease}
              className={`flex h-8 w-8 items-center justify-center ${displayQuantity <= 1 && quantityInCart === 0 ? "text-muted-foreground opacity-50 cursor-not-allowed" : "text-primary"}`}
              disabled={displayQuantity <= 1 && quantityInCart === 0}
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-5 w-5" />
            </button>

            <span className="text-base font-semibold">{displayQuantity}</span>

            <button
              type="button"
              disabled={isAtLimit}
              onClick={handleIncrease}
              className={`flex h-8 w-8 items-center justify-center ${isAtLimit ? "text-muted-foreground opacity-50 cursor-not-allowed" : "text-primary"}`}
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={quantityInCart > 0 ? undefined : handleBuy}
            disabled={(!canAddToCart && quantityInCart === 0)}
            className={`flex h-12 flex-[2] items-center justify-between rounded-xl px-4 text-sm font-bold transition-opacity ${
              canAddToCart || quantityInCart > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <span>{quantityInCart > 0 ? "Adicionado" : "Adicionar"}</span>
            <span>
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                quantityInCart > 0 ? 0 : (product.price + selectedOptionsAdditions) * displayQuantity
              )}
            </span>
          </button>
        </div>
      </div>
      {isImageModalOpen && (
        <ProductImageModal
          images={gallery}
          selectedIndex={selectedImageIndex}
          onSelect={setSelectedImageIndex}
          onClose={() => setIsImageModalOpen(false)}
          title={product.name}
          description={product.description}
        />
      )}
    </div>
  );
};
export default ProductDetailsModal;
