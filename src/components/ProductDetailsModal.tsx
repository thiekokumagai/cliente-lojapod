import type { Product } from "@/data/products";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Minus, Plus, X, Search, BellRing } from "lucide-react";
import ProductImageModal from "@/components/ProductImageModal";
import ProductShareMenu from "@/components/product/ProductShareMenu";
import ProductContact from "@/components/product/ProductContact";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import ProductVariationModal from "@/components/ProductVariationModal";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";
import seloMaisVendido from "@/assets/seloMaisVendido.png";
import {
  isOptionAvailableGivenSelections,
  getSelectedCombinationStock,
} from "@/utils/variation-stock";
import { getReservedStockInCart, getProductAvailableStock, areVariationsEqual } from "@/utils/cart-stock";
import { isBumpLine, normalizeCartObservation } from "@/utils/cart-lines";
import { useProductOrderBumps } from "@/hooks/useProductOrderBumps";
import ProductOrderBumpGroup from "@/components/product/ProductOrderBumpGroup";
import ProductCustomizationSection from "@/components/ProductCustomizationSection";
import {
  calculateCustomization,
  compositionsService,
  getEffectiveStageLimits,
  type CompositionSelections,
  type PublicCompositionStage,
} from "@/services/compositions";
import { supportsCustomization } from "@/utils/business-type";
import ServesIndicator from "@/components/product/ServesIndicator";
import {
  addChosenOffersToCart,
  chosenOffers,
  pruneSelection,
  selectionTotal,
  type BumpSelection,
} from "@/utils/order-bump-selection";

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

  const { items, addToCart, updateQuantity, removeFromCart, triggerAddedModal } = useCart();
  const { data: storeSettings } = useStoreSettings();
  const gallery = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    return product?.image ? [product.image] : [];
  }, [product]);

  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [displayQuantity, setDisplayQuantity] = useState(0);

  const {
    isStepActive: isComboFlowActive,
    currentProductForModal: comboStepProduct,
    activeCombo,
    currentStepIndex: comboStepIndex,
    totalSteps: comboTotalSteps,
    handleConfirmCurrentStep: handleConfirmComboStep,
    handleCancelComboFlow,
  } = useComboVariationFlow();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [itemObservation, setItemObservation] = useState("");
  const [customizationSelections, setCustomizationSelections] = useState<CompositionSelections>({});
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
  const [compositionStages, setCompositionStages] = useState<PublicCompositionStage[]>([]);
  const [isLoadingCompositions, setIsLoadingCompositions] = useState(false);

  const handleClose = () => {
    setItemObservation("");
    setCustomizationSelections({});
    setHighlightedGroupId(null);
    setIsClosing(true);
    setTimeout(onClose, 300); // Wait for animation
  };

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

  const reservedInCombosAndCart = useMemo(() => {
    const variationToCheck = allGroups.length > 0 ? combinedVariation : undefined;
    return getReservedStockInCart(items, product.id, variationToCheck);
  }, [items, product.id, combinedVariation, allGroups.length]);

  const effectiveRemainingStock = useMemo(() => {
    const rawStock = allGroups.length > 0 ? combinationStock : product.stock;
    if (rawStock === null || rawStock === undefined) return null;
    return Math.max(0, rawStock - reservedInCombosAndCart);
  }, [allGroups.length, combinationStock, product.stock, reservedInCombosAndCart]);

  const isCombinationUnavailable = useMemo(() => {
    if (allGroups.length > 0) {
      if (combinationStock === null) return false;
      return effectiveRemainingStock !== null && effectiveRemainingStock <= 0;
    }
    return effectiveRemainingStock !== null ? effectiveRemainingStock <= 0 : (product.stock !== undefined && product.stock <= 0);
  }, [combinationStock, allGroups.length, effectiveRemainingStock, product.stock]);

  const isUnavailable = useMemo(() => {
    if (allGroups.length > 0) {
      return allGroups.every((g) => g.options.every((o) => !o.available));
    }
    return product.stock !== undefined && product.stock <= 0;
  }, [allGroups, product.stock]);

  const [comboSelections, setComboSelections] = useState<Record<string, string>>(() => {
    if (!product.isCombo || !product.comboItems) return {};
    const existingComboInCart = items.find(
      (item) => item.product.id === product.id || item.product.comboId === product.id
    );
    if (!existingComboInCart || !existingComboInCart.comboSelections) return {};
    const initialSelections: Record<string, string> = {};
    product.comboItems.forEach((ci, idx) => {
      const compKey = `${ci.productId}-${idx}`;
      const found = existingComboInCart.comboSelections?.find((cs) => cs.productId === ci.productId);
      if (found?.variation) {
        initialSelections[compKey] = found.variation;
      }
    });
    return initialSelections;
  });

  const comboNeedsSelections = useMemo(() => {
    if (!product.isCombo || !product.comboItems) return [];
    return product.comboItems.map((ci, idx) => {
      const compKey = `${ci.productId}-${idx}`;
      const cp = ci.componentProduct;
      const groups = cp?.variationGroups && cp.variationGroups.length > 0
        ? cp.variationGroups
        : cp?.variationGroup
          ? [cp.variationGroup]
          : [];
      return {
        ci,
        idx,
        compKey,
        needsSelection: !ci.variation && groups.length > 0,
        groups,
      };
    });
  }, [product]);

  const allComboComponentsSelected = useMemo(() => {
    if (!product.isCombo) return true;
    return comboNeedsSelections.every((item) => {
      if (!item.needsSelection) return true;
      return !!comboSelections[item.compKey];
    });
  }, [product.isCombo, comboNeedsSelections, comboSelections]);

  const canAddToCart = product.isCombo
    ? allComboComponentsSelected && (product.stock === undefined || product.stock > 0)
    : allSelected && !isCombinationUnavailable;

  const isFoodStore = supportsCustomization(storeSettings?.businessType);
  const canCustomize =
    Boolean(product.isCustomizable) &&
    supportsCustomization(storeSettings?.businessType);
  const normalizedItemObservation = isFoodStore
    ? normalizeCartObservation(itemObservation)
    : null;

  useEffect(() => {
    setItemObservation("");
    setCustomizationSelections({});
    setHighlightedGroupId(null);
  }, [product.id]);

  useEffect(() => {
    if (!canCustomize || !product.id) {
      setCompositionStages([]);
      setIsLoadingCompositions(false);
      return;
    }
    let cancelled = false;
    setIsLoadingCompositions(true);
    compositionsService
      .getProductCompositions(product.id)
      .then((res) => {
        if (!cancelled) setCompositionStages(res?.stages ?? []);
      })
      .catch(() => {
        if (!cancelled) setCompositionStages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCompositions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canCustomize, product.id]);

  const handleCustomizationQuantityChange = (
    groupId: string,
    optionId: string,
    delta: number,
    stage: PublicCompositionStage,
  ) => {
    setHighlightedGroupId((prev) => (prev === groupId ? null : prev));
    setCustomizationSelections((prev) => {
      const groupSelections = { ...(prev[groupId] || {}) };
      const currentQty = groupSelections[optionId] || 0;
      const totalGroupQty = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
      const { maxQuantity } = getEffectiveStageLimits(stage);
      const targetOption = stage.options.find((o) => o.id === optionId);
      const optionMax = Math.max(1, Number(targetOption?.maxQuantityPerItem) || 1);

      if (delta > 0) {
        if (maxQuantity === 1) {
          return { ...prev, [groupId]: { [optionId]: 1 } };
        }
        if (totalGroupQty >= maxQuantity || currentQty >= optionMax) return prev;
        groupSelections[optionId] = currentQty + 1;
      } else if (delta < 0) {
        if (currentQty <= 0) return prev;
        const nextQty = currentQty - 1;
        if (nextQty <= 0) {
          delete groupSelections[optionId];
        } else {
          groupSelections[optionId] = nextQty;
        }
      }

      return { ...prev, [groupId]: groupSelections };
    });
  };

  const customizationSummary = useMemo(
    () =>
      canCustomize
        ? calculateCustomization(compositionStages, customizationSelections, product.price || 0)
        : null,
    [canCustomize, compositionStages, customizationSelections, product.price],
  );

  const quantityInCart = useMemo(() => {
    if (canCustomize) return 0;

    if (product.isCombo) {
      if (!allComboComponentsSelected) return 0;
      const comboCartItem = items.find((item) => {
        if (item.product.id !== product.id && item.product.comboId !== product.id) return false;
        if (normalizeCartObservation(item.observation) !== normalizedItemObservation) return false;
        return comboNeedsSelections.every((cns) => {
          if (!cns.needsSelection) return true;
          const chosenVar = comboSelections[cns.compKey];
          const itemSel = item.comboSelections?.find((cs) => cs.productId === cns.ci.productId);
          return areVariationsEqual(itemSel?.variation, chosenVar);
        });
      });
      return comboCartItem?.quantity ?? 0;
    }

    const variationToCheck = allGroups.length > 0 ? combinedVariation : undefined;
    if (allGroups.length > 0 && !combinedVariation) return 0;

    const cartItem = items.find(
      (item) =>
        item.product.id === product.id &&
        item.selectedVariation === variationToCheck &&
        !isBumpLine(item) &&
        !item.customizationLineId &&
        normalizeCartObservation(item.observation) === normalizedItemObservation,
    );

    return cartItem?.quantity ?? 0;
  }, [
    canCustomize,
    items,
    product.id,
    product.isCombo,
    combinedVariation,
    allGroups.length,
    allComboComponentsSelected,
    comboNeedsSelections,
    comboSelections,
    normalizedItemObservation,
  ]);

  useEffect(() => {
    if (canCustomize) {
      setDisplayQuantity((current) => (current > 0 ? current : 1));
      return;
    }

    if (product.isCombo) {
      if (!allComboComponentsSelected) {
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
      return;
    }

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
  }, [canCustomize, product.isCombo, allComboComponentsSelected, quantityInCart, combinedVariation, allSelected, isLocked, allGroups.length]);

  useEffect(() => {
    const timer = autoCloseTimeoutRef.current;
    return () => {
      if (timer) {
        clearTimeout(timer);
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

  const handleSelectComboOption = (componentKey: string, variationLabel: string) => {
    if (quantityInCart > 0) return;

    setComboSelections((prev) => {
      const next = { ...prev };
      if (next[componentKey] === variationLabel) {
        delete next[componentKey];
      } else {
        next[componentKey] = variationLabel;
      }
      return next;
    });
  };

  // Ofertas "Peça também" marcadas para a tela do produto (grupo opcional, ex.: "Leve junto uma Bebida").
  // O + só guarda a escolha; o "Adicionar" coloca o produto e as ofertas no carrinho.
  const showBumps = (canCustomize || quantityInCart === 0) && !isUnavailable && !isCombinationUnavailable;
  const bumpOffers = useProductOrderBumps(product.id, showBumps, storeSettings?.businessType);
  const [bumpSelection, setBumpSelection] = useState<BumpSelection>({});
  const activeBumpSelection = useMemo(() => pruneSelection(bumpSelection, bumpOffers), [bumpSelection, bumpOffers]);
  const bumpsTotal = useMemo(() => selectionTotal(activeBumpSelection, bumpOffers), [activeBumpSelection, bumpOffers]);

  const addBumpsToCart = () => {
    addChosenOffersToCart(chosenOffers(activeBumpSelection, bumpOffers), addToCart, updateQuantity, storeSettings?.businessType);
    setBumpSelection({});
  };

  const startAutoClose = (variation?: string) => {
    triggerAddedModal({ product, selectedVariation: variation });
    handleClose();
  };

  const handleBuy = () => {
    if (canCustomize) {
      if (isUnavailable || isCombinationUnavailable || isLoadingCompositions) return;
      if (customizationSummary && !customizationSummary.isAllValid) {
        const pendingId = customizationSummary.firstPendingGroupId;
        setHighlightedGroupId(pendingId);
        if (pendingId) {
          const target =
            modalScrollRef.current?.querySelector(`[data-customization-group-id="${pendingId}"]`) ??
            document.querySelector(`[data-customization-group-id="${pendingId}"]`);
          target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }
        return;
      }

      const finalUnitPrice = customizationSummary?.finalUnitPrice ?? product.price;
      const snapshot = {
        basePrice: product.price,
        stages: customizationSummary?.stages ?? [],
        totalAdditions: customizationSummary?.totalAdditions ?? 0,
        finalUnitPrice,
      };
      const lineId = `custom-${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const customItem = {
        product: {
          ...product,
          price: finalUnitPrice,
        },
        isCustomized: true,
        customizationSnapshot: snapshot,
        customizationLineId: lineId,
        observation: isFoodStore && itemObservation.trim() ? itemObservation.trim().slice(0, 300) : undefined,
      };

      addToCart(customItem);
      if (displayQuantity > 1) {
        updateQuantity(
          customItem.product.id,
          displayQuantity,
          undefined,
          undefined,
          customItem.customizationLineId,
          customItem.observation,
        );
      }
      addBumpsToCart();
      triggerAddedModal(customItem);
      handleClose();
      return;
    }

    if (product.isCombo) {
      if (!canAddToCart || isUnavailable) return;
      const formattedSelections = comboNeedsSelections
        .filter((item) => item.needsSelection)
        .map((item) => ({
          productId: item.ci.productId,
          productName: item.ci.productName,
          variation: comboSelections[item.compKey],
        }));

      const comboObs = isFoodStore && itemObservation.trim() ? itemObservation.trim().slice(0, 300) : undefined;
      addToCart({
        product,
        comboSelections: formattedSelections,
        observation: comboObs,
      });
      if (displayQuantity > 1) {
        updateQuantity(product.id, displayQuantity, undefined, undefined, undefined, comboObs);
      }
      addBumpsToCart();
      startAutoClose();
      return;
    }

    if (!canAddToCart) return;
    setIsLocked(true);
    const variation = allGroups.length > 0 ? combinedVariation : undefined;
    const normalizedObs = isFoodStore && itemObservation.trim() ? itemObservation.trim().slice(0, 300) : undefined;

    addToCart({ product, selectedVariation: variation, observation: normalizedObs });
    if (displayQuantity > 1) {
      updateQuantity(product.id, displayQuantity, variation, undefined, undefined, normalizedObs);
    }

    addBumpsToCart();
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
      removeFromCart(product.id, variation, undefined, undefined, normalizedItemObservation);
      setIsLocked(false);
      setDisplayQuantity(1);
      return;
    }

    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, variation, undefined, undefined, normalizedItemObservation);
  };

  const isAtLimit = useMemo(() => {
    if (product.isCombo) {
      const comboComponents = product.comboItems || [];
      return comboComponents.some((ci) => {
        const chosen = comboNeedsSelections.find((cns) => cns.ci.productId === ci.productId);
        const compVar = ci.variation || (chosen ? comboSelections[chosen.compKey] : undefined);
        const compStock = ci.componentProduct
          ? getProductAvailableStock(ci.componentProduct, compVar)
          : null;
        if (compStock === null) return false;
        const currentReserved = getReservedStockInCart(items, ci.productId, compVar);
        const neededForNext = ci.quantity || 1;
        return currentReserved + neededForNext > compStock;
      });
    }

    if (effectiveRemainingStock !== null && effectiveRemainingStock !== undefined && displayQuantity >= effectiveRemainingStock) return true;
    return false;
  }, [product.isCombo, product.comboItems, comboNeedsSelections, comboSelections, items, effectiveRemainingStock, displayQuantity]);

  const handleIncrease = () => {
    if (isAtLimit) return;

    const variation = allGroups.length > 0 ? combinedVariation : undefined;
    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);

    if (quantityInCart > 0) {
      updateQuantity(product.id, nextQuantity, variation, undefined, undefined, normalizedItemObservation);
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

  const unitPrice =
    canCustomize && customizationSummary
      ? customizationSummary.finalUnitPrice
      : product.price + selectedOptionsAdditions;
  const totalButtonPrice =
    !canCustomize && quantityInCart > 0
      ? 0
      : unitPrice * displayQuantity + (showBumps ? bumpsTotal : 0);
  const showPendingBanner = Boolean(
    canCustomize &&
      customizationSummary?.pendingStageMessage &&
      !isUnavailable &&
      !isCombinationUnavailable,
  );
  const isPrimaryButtonDisabled = canCustomize
    ? isUnavailable || isCombinationUnavailable || isLoadingCompositions
    : (!canAddToCart && quantityInCart === 0) || isUnavailable || isCombinationUnavailable;

  return createPortal(
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

        <div
          ref={modalScrollRef}
          className={`flex-1 overflow-y-auto overscroll-contain ${showPendingBanner ? "pb-36" : "pb-28"}`}
        >
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

              {(isUnavailable || isCombinationUnavailable) ? (
                <span className="absolute left-16 top-5 z-10 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                  Esgotado
                </span>
              ) : discountPercentage > 0 ? (
                <span className="absolute left-16 top-5 z-10 rounded-full bg-[#DE2839] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                  -{discountPercentage}%
                </span>
              ) : null}

              {Boolean(product.isBestSeller) && !(isUnavailable || isCombinationUnavailable) && (
                <img
                  src={seloMaisVendido}
                  alt="Selo Mais Vendido"
                  className="absolute right-16 top-4 z-10 h-10 w-10 object-contain drop-shadow-md"
                />
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
                {product.isCombo ? "Combo Promocional" : product.category}
              </span>
            )}
            <h3 className="text-xl font-bold text-foreground">{product.name}</h3>

            {/* Lista de itens inclusos se for combo com seleção de variação */}
            {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Produtos inclusos neste combo:
                </span>
                <div className="space-y-2">
                  {product.comboItems.map((ci, idx) => {
                    const compKey = `${ci.productId}-${idx}`;
                    const cp = ci.componentProduct;
                    const cpGroups = cp?.variationGroups && cp.variationGroups.length > 0
                      ? cp.variationGroups
                      : cp?.variationGroup
                        ? [cp.variationGroup]
                        : [];
                    const needsSelection = !ci.variation && cpGroups.length > 0;
                    const chosenVariation = comboSelections[compKey];

                    return (
                      <div key={idx} className="flex flex-col text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            {ci.quantity}x {ci.productName}
                            {ci.variation ? ` (${ci.variation})` : chosenVariation ? ` (${chosenVariation})` : ""}
                          </span>
                          <span className="text-slate-400 font-medium">
                            R$ {ci.productPrice.toFixed(2).replace(".", ",")} un.
                          </span>
                        </div>

                        {needsSelection && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2.5">
                            {cpGroups.map((group) => (
                              <div key={group.name} className="space-y-1.5">
                                <div className="bg-slate-50 px-2 py-1.5 rounded-md">
                                  <p className="text-xs font-bold text-slate-900">{ci.productName} - {group.name}</p>
                                  <p className="text-[11px] text-muted-foreground">Escolha 1 opção</p>
                                </div>

                                <div className="space-y-0 divide-y divide-border/40">
                                  {group.options.map((option) => {
                                    const isSelected = chosenVariation === option.label;
                                    const isAvailable = cp
                                      ? isOptionAvailableGivenSelections(
                                          cp,
                                          group.name,
                                          option.label,
                                          { [group.name]: option.label }
                                        )
                                      : option.available;

                                    return (
                                      <button
                                        key={option.label}
                                        type="button"
                                        onClick={() => isAvailable && quantityInCart === 0 && handleSelectComboOption(compKey, option.label)}
                                        disabled={!isAvailable || quantityInCart > 0}
                                        className={`flex w-full items-center justify-between py-2.5 text-left transition-colors ${
                                          isAvailable && quantityInCart === 0 ? "hover:bg-muted/40 cursor-pointer" : "cursor-not-allowed opacity-50"
                                        } ${quantityInCart > 0 && !isSelected ? "opacity-50" : ""}`}
                                      >
                                        <div>
                                          <p className={`text-sm font-medium px-2 ${!isAvailable ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                            {option.label}
                                          </p>
                                        </div>
                                        <div className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary">
                                          {isSelected ? (
                                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {product.description && (
              <div
                className="mt-3 text-sm text-muted-foreground rich-text-content"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
            <ServesIndicator
              servesCount={product.servesCount}
              show={isFoodStore}
              size="md"
              className="mt-2.5"
            />
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
                    unitPrice
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

            {canCustomize && (
              <ProductCustomizationSection
                stages={compositionStages}
                isLoading={isLoadingCompositions}
                selections={customizationSelections}
                onChangeQuantity={handleCustomizationQuantityChange}
                highlightedGroupId={highlightedGroupId}
              />
            )}

            {isFoodStore && (
              <div className="mt-5 rounded-2xl border border-border-subtle bg-surface-muted/40 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="modal-item-observation" className="text-sm font-semibold text-foreground">
                    Alguma observação?
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {itemObservation.length}/300
                  </span>
                </div>
                <textarea
                  id="modal-item-observation"
                  value={itemObservation}
                  onChange={(e) => setItemObservation(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={2}
                  placeholder="Ex: sem cebola, molho à parte..."
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            {showBumps && (
              <ProductOrderBumpGroup offers={bumpOffers} selection={activeBumpSelection} onChange={setBumpSelection} />
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
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-border bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {showPendingBanner && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{customizationSummary?.pendingStageMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {(isUnavailable || isCombinationUnavailable) && storeSettings?.enableStockAlertNotification !== false ? (
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-colors"
                style={{ backgroundColor: "#ea580c" }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#c2410c")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ea580c")}
              >
                <BellRing className="h-5 w-5" />
                Avise-me quando chegar
              </button>
            ) : (
              <>
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
                  onClick={canCustomize ? handleBuy : quantityInCart > 0 ? undefined : handleBuy}
                  disabled={isPrimaryButtonDisabled}
                  className={`flex h-12 flex-[2] items-center justify-between rounded-xl px-4 text-sm font-bold transition-opacity ${
                    !isPrimaryButtonDisabled
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <span>
                    {isUnavailable || isCombinationUnavailable
                      ? "Esgotado"
                      : canCustomize
                        ? "Adicionar"
                        : quantityInCart > 0
                          ? "Adicionado"
                          : "Adicionar"}
                  </span>
                  <span>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      totalButtonPrice
                    )}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showNotificationModal && (
        <StockNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          productId={product.id}
          comboId={product.isCombo ? (product.comboId || product.id) : undefined}
          isCombo={product.isCombo}
          productTitle={product.name}
          variationName={Object.values(selections).join(" / ") || null}
        />
      )}
      {isComboFlowActive && comboStepProduct && (
        <ProductVariationModal
          product={comboStepProduct}
          selectedOption={null}
          onSelect={() => {}}
          onClose={handleCancelComboFlow}
          onConfirm={() => {}}
          isComboStep={true}
          customTitle={comboStepProduct.name}
          customSubtitle={`Item ${comboStepIndex + 1} de ${comboTotalSteps} do ${activeCombo?.name || "Combo"}`}
          customConfirmLabel={comboStepIndex + 1 === comboTotalSteps ? "Concluir e Adicionar Combo" : "Avançar Próximo Item"}
          onConfirmVariation={(chosenVar) => {
            handleConfirmComboStep(chosenVar);
            if (comboStepIndex + 1 >= comboTotalSteps) {
              handleClose();
            }
          }}
        />
      )}
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
    </div>,
    document.body
  );
};
export default ProductDetailsModal;
