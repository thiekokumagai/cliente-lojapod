import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import MenuExpressHeader from "@/components/MenuExpressHeader";
import UrbanHeader from "@/components/UrbanHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductImageModal from "@/components/ProductImageModal";
import ProductContact from "@/components/product/ProductContact";
import ProductDesktopGallery from "@/components/product/ProductDesktopGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductMobileGallery from "@/components/product/ProductMobileGallery";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProduct } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCart } from "@/contexts/CartContext";
import { useStoreMobilePadding } from "@/hooks/use-store-mobile-padding";
import { Loader2, AlertCircle, BellRing } from "lucide-react";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import ProductVariationModal from "@/components/ProductVariationModal";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSelectedCombinationStock } from "@/utils/variation-stock";
import { getReservedStockInCart } from "@/utils/cart-stock";
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
import { formatServesLabel, supportsCustomization } from "@/utils/business-type";
import {
  addChosenOffersToCart,
  chosenOffers,
  pruneSelection,
  selectionTotal,
  type BumpSelection,
} from "@/utils/order-bump-selection";

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { items, addToCart, updateQuantity, removeFromCart, triggerAddedModal, totalItems, setSelectedCategory } = useCart();
  const mobileBottom = useStoreMobilePadding("product");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [hasJustUpdated, setHasJustUpdated] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [customizationSelections, setCustomizationSelections] = useState<CompositionSelections>({});
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    startComboFlow,
    isStepActive: isComboFlowActive,
    currentProductForModal: comboStepProduct,
    activeCombo,
    currentStepIndex: comboStepIndex,
    totalSteps: comboTotalSteps,
    handleConfirmCurrentStep: handleConfirmComboStep,
    handleCancelComboFlow,
  } = useComboVariationFlow();

  const { data: product, isLoading } = useProduct(id);
  const { data: settings } = useStoreSettings();

  const isMenuExpress = settings?.templateId === "menu-express";
  const isUrban = settings?.templateId === "urban" || settings?.templateId === "podify";

  const gallery = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    return product?.image ? [product.image] : [];
  }, [product]);

  useEffect(() => {
    if (isMobile) {
      navigate(`/?modal=${id}`, { replace: true });
    }
  }, [isMobile, id, navigate]);

  const description = product?.description || product?.descriptionFormated || "";
  const cleanDescription = description.trim();

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [id]);

  const variationGroups = useMemo(() => {
    return product?.variationGroups && product.variationGroups.length > 0
      ? product.variationGroups
      : product?.variationGroup
        ? [product.variationGroup]
        : [];
  }, [product]);

  const selectedVariation = useMemo(() => {
    if (variationGroups.length === 0) return undefined;
    const parts = variationGroups.map((g) => selections[g.name]).filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : undefined;
  }, [variationGroups, selections]);

  const allSelected = useMemo(() => {
    if (variationGroups.length === 0) return true;
    return variationGroups.every((g) => !!selections[g.name]);
  }, [variationGroups, selections]);

  const combinationStock = useMemo(() => {
    if (!product) return null;
    return getSelectedCombinationStock(
      product,
      selections,
      variationGroups.map((g) => g.name)
    );
  }, [product, selections, variationGroups]);

  const isCombinationUnavailable = useMemo(() => {
    return combinationStock !== null && combinationStock <= 0;
  }, [combinationStock]);

  const isFoodStore = supportsCustomization(settings?.businessType);
  const servesLabel = isFoodStore ? formatServesLabel(product?.servesCount) : null;
  const [itemObservation, setItemObservation] = useState("");
  const normalizedItemObservation = isFoodStore
    ? normalizeCartObservation(itemObservation)
    : null;

  const cartItem = items.find(
    (item) =>
      item.product.id === product?.id &&
      item.selectedVariation === selectedVariation &&
      !isBumpLine(item) &&
      !item.customizationLineId &&
      normalizeCartObservation(item.observation) === normalizedItemObservation,
  );

  useEffect(() => {
    if (cartItem) {
      setQuantity(cartItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [cartItem?.quantity, selectedVariation, product?.id]);

  const handleSelectOption = (groupName: string, optionLabel: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[groupName] === optionLabel) {
        delete next[groupName];
      } else {
        next[groupName] = optionLabel;
      }
      return next;
    });
  };

  const [comboSelections, setComboSelections] = useState<Record<string, string>>({});

  const handleSelectComboOption = (componentKey: string, variationLabel: string) => {
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

  const comboNeedsSelections = useMemo(() => {
    if (!product?.isCombo || !product.comboItems) return [];
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
    if (!product?.isCombo) return true;
    return comboNeedsSelections.every((item) => {
      if (!item.needsSelection) return true;
      return !!comboSelections[item.compKey];
    });
  }, [product, comboNeedsSelections, comboSelections]);

  const reservedInCombosAndCart = useMemo(() => {
    if (!product) return 0;
    const variationToCheck = variationGroups.length > 0 ? selectedVariation : undefined;
    return getReservedStockInCart(items, product.id, variationToCheck);
  }, [items, product, variationGroups.length, selectedVariation]);

  const rawStock = combinationStock !== null ? combinationStock : product?.stock;
  const effectiveStock = rawStock !== undefined && rawStock !== null
    ? Math.max(0, rawStock - reservedInCombosAndCart)
    : undefined;

  const canAddToCart = product?.isCombo
    ? allComboComponentsSelected && (product.stock === undefined || product.stock > 0)
    : variationGroups.length > 0
      ? allSelected && !isCombinationUnavailable
      : product?.stock !== 0;

  const isUnavailable = product?.isCombo
    ? product.stock === 0
    : variationGroups.length > 0
      ? variationGroups.every((g) => g.options.every((o) => !o.available))
      : product?.stock === 0;

  const isInCart = !!cartItem;
  const canCustomize =
    Boolean(product?.isCustomizable) &&
    supportsCustomization(settings?.businessType);
  const [compositionStages, setCompositionStages] = useState<PublicCompositionStage[]>([]);
  const [isLoadingCompositions, setIsLoadingCompositions] = useState(false);

  useEffect(() => {
    setItemObservation("");
  }, [product?.id]);

  useEffect(() => {
    if (!canCustomize || !product?.id) {
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
  }, [canCustomize, product?.id]);

  useEffect(() => {
    setCustomizationSelections({});
    setHighlightedGroupId(null);
  }, [product?.id]);

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
        ? calculateCustomization(compositionStages, customizationSelections, product?.price || 0)
        : null,
    [canCustomize, compositionStages, customizationSelections, product?.price],
  );

  // Ofertas "Peça também" marcadas para a tela do produto (grupo opcional, ex.: "Leve junto uma Bebida").
  // O + só guarda a escolha; o "Adicionar ao Pedido" coloca o produto e as ofertas no carrinho.
  const showBumps = !isInCart && !isUnavailable && !isCombinationUnavailable;
  const bumpOffers = useProductOrderBumps(product?.id, showBumps);
  const [bumpSelection, setBumpSelection] = useState<BumpSelection>({});
  const activeBumpSelection = useMemo(() => pruneSelection(bumpSelection, bumpOffers), [bumpSelection, bumpOffers]);
  const bumpsTotal = useMemo(() => selectionTotal(activeBumpSelection, bumpOffers), [activeBumpSelection, bumpOffers]);
  const addBumpsToCart = () => {
    addChosenOffersToCart(chosenOffers(activeBumpSelection, bumpOffers), addToCart, updateQuantity);
    setBumpSelection({});
  };

  const priceVal =
    canCustomize && customizationSummary
      ? customizationSummary.finalUnitPrice
      : product?.price || 0;
  const totalPrice = priceVal * quantity + (isInCart ? 0 : bumpsTotal);
  const totalOldPrice = product?.oldPrice ? product.oldPrice * quantity : 0;
  const discount = product?.isPromo && product.oldPrice 
    ? Math.round(((product.oldPrice - priceVal) / product.oldPrice) * 100)
    : undefined;

  const isAtLimit = effectiveStock !== undefined && quantity >= effectiveStock;

  const primaryButtonLabel = isUnavailable || isCombinationUnavailable
    ? "Esgotado"
    : canCustomize
      ? `Adicionar • ${formatPrice(totalPrice)}`
      : !canAddToCart
        ? "Selecione as variações"
        : isInCart
          ? "Atualizar"
          : bumpsTotal > 0
            ? `Adicionar ao Pedido · ${formatPrice(totalPrice)}`
            : "Adicionar ao Pedido";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product || product.isVisible === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden md:block">
          {isUrban ? (
            <UrbanHeader />
          ) : isMenuExpress ? (
            <MenuExpressHeader />
          ) : (
            <SiteHeader />
          )}
        </div>
        <main className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center lg:px-8">
          <h1 className="text-2xl font-bold text-foreground">Produto não encontrado</h1>
          <Link to="/" className="mt-6 rounded-xl border border-primary px-6 py-3 text-sm font-medium text-primary">
            Voltar para a loja
          </Link>
        </main>
        <SiteFooter />

        {product && product.isVisible === false && (
          <Dialog open={true} onOpenChange={(open) => { if (!open) navigate("/") }}>
            <DialogContent overlayClassName="z-[100]" className="sm:max-w-md text-center flex flex-col items-center p-6 z-[100]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-center text-xl font-bold">Produto Esgotado</DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-center text-base text-muted-foreground mt-2">
                O produto que você tentou acessar está esgotado no momento.
              </DialogDescription>
              <DialogFooter className="sm:justify-center w-full mt-6">
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={() => {
                    if (product.categoryId) {
                      setSelectedCategory(product.category, product.categoryId);
                    }
                    navigate("/");
                  }} 
                  className="w-full sm:w-auto px-8"
                >
                  Ver produtos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
  const handleNavigateToList = () => {
    navigate("/");
  };

  const handleAddOrUpdateCart = () => {
    if (!product) return;

    if (canCustomize) {
      if (isUnavailable || isCombinationUnavailable || isLoadingCompositions) return;
      if (customizationSummary && !customizationSummary.isAllValid) {
        const pendingId = customizationSummary.firstPendingGroupId;
        setHighlightedGroupId(pendingId);
        if (pendingId) {
          const candidates = document.querySelectorAll(
            `[data-customization-group-id="${pendingId}"]`,
          );
          const visibleTarget =
            Array.from(candidates).find(
              (el) => (el as HTMLElement).offsetParent !== null,
            ) ?? candidates[0];
          visibleTarget?.scrollIntoView?.({ behavior: "smooth", block: "center" });
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
      if (quantity > 1) {
        updateQuantity(
          customItem.product.id,
          quantity,
          undefined,
          undefined,
          customItem.customizationLineId,
          customItem.observation,
        );
      }
      addBumpsToCart();
      triggerAddedModal(customItem);
      setCustomizationSelections({});
      setItemObservation("");
      setHighlightedGroupId(null);
      setHasJustUpdated(true);
      handleNavigateToList();
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
      if (quantity > 1) {
        updateQuantity(product.id, quantity, undefined, undefined, undefined, comboObs);
      }
      setItemObservation("");
      addBumpsToCart();
      triggerAddedModal({ product });
      setHasJustUpdated(true);
      handleNavigateToList();
      return;
    }

    if (!canAddToCart || isUnavailable || isCombinationUnavailable) return;

    if (cartItem) {
      updateQuantity(
        product.id,
        quantity,
        selectedVariation,
        undefined,
        undefined,
        normalizedItemObservation,
      );
      setItemObservation("");
      triggerAddedModal({ product, selectedVariation });
      setHasJustUpdated(true);
      handleNavigateToList();
      return;
    }

    const normalizedObs = isFoodStore && itemObservation.trim() ? itemObservation.trim().slice(0, 300) : undefined;
    addToCart({ product, selectedVariation, observation: normalizedObs });
    updateQuantity(product.id, quantity, selectedVariation, undefined, undefined, normalizedObs);
    setItemObservation("");
    addBumpsToCart();
    triggerAddedModal({ product, selectedVariation });
    setHasJustUpdated(true);
    handleNavigateToList();
  };

  const handleRemoveFromCart = () => {
    if (!cartItem || !product) return;

    removeFromCart(product.id, selectedVariation, undefined, undefined, cartItem.observation ?? null);
    setHasJustUpdated(false);
    setQuantity(1);
  };

  const handleBackToStore = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleDecreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const handleIncreaseQuantity = () => setQuantity((current) => {
    if (effectiveStock !== undefined && current >= effectiveStock) return current;
    return current + 1;
  });

  return (
    <div className={`min-h-screen bg-background md:pb-0 ${mobileBottom}`}>
      <div className="hidden md:block">
        {isUrban ? (
          <UrbanHeader />
        ) : isMenuExpress ? (
          <MenuExpressHeader />
        ) : (
          <SiteHeader />
        )}
      </div>

      <main className="mx-auto max-w-[1220px] lg:px-8 lg:py-8">
        <section className="lg:hidden">
          <ProductMobileGallery
            productName={product.name}
            images={gallery}
            selectedImage={selectedImage}
            onBack={handleGoBack}
            onOpenModal={() => setIsImageModalOpen(true)}
            isBestSeller={Boolean(product.isBestSeller)}
            isPromo={product.isPromo}
            discount={discount}
            isUnavailable={isUnavailable || isCombinationUnavailable}
          />

          <div className="-mt-6 rounded-t-[28px] bg-background px-5 pb-8 pt-7">
            {product.category && (
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary">
                {product.category}
              </span>
            )}
            <h1 className="font-display text-[24px] font-medium leading-tight text-fg-secondary">
              {product.name}
            </h1>
            {servesLabel && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  {servesLabel}
                </span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-surface-muted px-4 py-2.5">
                <button
                  type="button"
                  onClick={handleDecreaseQuantity}
                  className="text-fg-tertiary transition-colors hover:text-fg-secondary"
                  aria-label="Diminuir quantidade"
                >
                  <span className="text-base">−</span>
                </button>
                <span className="min-w-5 text-center text-lg text-fg-secondary">{quantity}</span>
                <button
                  type="button"
                  disabled={isAtLimit}
                  onClick={handleIncreaseQuantity}
                  className={`transition-colors ${isAtLimit ? "text-fg-subtle cursor-not-allowed opacity-50" : "text-fg-tertiary hover:text-fg-secondary"}`}
                  aria-label="Aumentar quantidade"
                >
                  <span className="text-base">+</span>
                </button>
                <span className="text-sm text-fg-subtle">un</span>
              </div>

              <div className="flex flex-col items-end">
                {product.isPromo && product.oldPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(totalOldPrice)}
                  </span>
                )}
                <div className="flex items-baseline gap-1.5">
                  <div className="text-[20px] font-semibold tabular-nums text-fg-secondary">
                    {formatPrice(totalPrice)}
                  </div>
                  {product.isPromo && (
                    <span className="text-xs font-semibold text-primary">
                      no PIX
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ProductInfo
              product={product}
              productDescription={cleanDescription}
              variationGroups={variationGroups}
              selections={selections}
              onSelectOption={handleSelectOption}
              comboSelections={comboSelections}
              onSelectComboOption={handleSelectComboOption}
            />

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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Alguma observação?
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {itemObservation.length}/300
                  </span>
                </div>
                <textarea
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

            {isInCart && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleRemoveFromCart}
                  className="w-full rounded-xl bg-destructive px-6 py-3.5 text-base font-bold text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  Remover do carrinho
                </button>
              </div>
            )}

            {!isInCart && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleBackToStore}
                  className="w-full rounded-xl border border-primary px-6 py-3 text-center text-base font-medium text-primary"
                >
                  Voltar pra loja
                </button>
              </div>
            )}

            <ProductContact productName={product.name} />
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="grid gap-8 lg:grid-cols-[540px_minmax(0,420px)] xl:justify-left">
            <ProductDesktopGallery
              productName={product.name}
              images={gallery}
              selectedImage={selectedImage}
              isNicSalt={false}
              onSelectImage={setSelectedImage}
              onOpenModal={() => setIsImageModalOpen(true)}
              isBestSeller={Boolean(product.isBestSeller)}
              isPromo={product.isPromo}
              discount={discount}
              isUnavailable={isUnavailable || isCombinationUnavailable}
            />

            <div className="max-w-[420px] pt-16">
              {product.category && (
                <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary">
                  {product.category}
                </span>
              )}
              <h1 className="font-display text-[27px] font-semibold leading-[1.15] text-fg-secondary">
                {product.name}
              </h1>
              {servesLabel && (
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {servesLabel}
                  </span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-surface-muted px-5 py-2.5 text-fg-secondary">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    className="text-fg-tertiary transition-colors hover:text-fg-secondary"
                    aria-label="Diminuir quantidade"
                  >
                    <span className="text-base">−</span>
                  </button>
                  <span className="min-w-4 text-center text-lg tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    disabled={isAtLimit}
                    onClick={handleIncreaseQuantity}
                    className={`transition-colors ${isAtLimit ? "text-fg-subtle cursor-not-allowed opacity-50" : "text-fg-tertiary hover:text-fg-secondary"}`}
                    aria-label="Aumentar quantidade"
                  >
                    <span className="text-base">+</span>
                  </button>
                  <span className="text-sm text-fg-subtle">un</span>
                </div>

                <div className="flex flex-col items-end">
                  {product.isPromo && product.oldPrice && (
                    <span className="text-base text-muted-foreground line-through">
                      {formatPrice(totalOldPrice)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <div className="text-[28px] font-semibold tabular-nums text-fg-secondary">
                      {formatPrice(totalPrice)}
                    </div>
                    {product.isPromo && (
                      <span className="text-sm font-semibold text-primary">
                        no PIX
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ProductInfo
                product={product}
                productDescription={cleanDescription}
                variationGroups={variationGroups}
                selections={selections}
                isDesktop
                onSelectOption={handleSelectOption}
                comboSelections={comboSelections}
                onSelectComboOption={handleSelectComboOption}
              />

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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Alguma observação?
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {itemObservation.length}/300
                  </span>
                </div>
                <textarea
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

              <div className="mt-6 space-y-3">
                {canCustomize && customizationSummary?.pendingStageMessage && !isUnavailable && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{customizationSummary.pendingStageMessage}</span>
                  </div>
                )}
                {(isUnavailable || isCombinationUnavailable) && settings?.enableStockAlertNotification !== false ? (
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors" style={{ backgroundColor: '#ea580c' }} onMouseOver={e => (e.currentTarget.style.backgroundColor='#c2410c')} onMouseOut={e => (e.currentTarget.style.backgroundColor='#ea580c')}
                  >
                    <BellRing className="h-5 w-5" />
                    Avise-me quando chegar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddOrUpdateCart}
                    disabled={!canAddToCart || isUnavailable || isCombinationUnavailable}
                    className={`w-full rounded-lg px-6 py-3.5 text-base font-bold transition-colors ${
                      !canAddToCart || isUnavailable || isCombinationUnavailable
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {primaryButtonLabel}
                  </button>
                )}

                {isInCart ? (
                  <button
                    type="button"
                    onClick={handleRemoveFromCart}
                    className="w-full rounded-lg bg-destructive px-6 py-3.5 text-base font-bold text-destructive-foreground transition-colors hover:bg-destructive/90"
                  >
                    Remover do carrinho
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBackToStore}
                    className="w-full rounded-lg border border-primary px-6 py-3 text-base font-medium text-primary"
                  >
                    Voltar pra loja
                  </button>
                )}
              </div>

              <ProductContact isDesktop productName={product.name} />
            </div>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-x-0 z-[79] border-t border-border-subtle bg-background px-5 py-3 shadow-sticky-up md:hidden ${
          totalItems > 0 ? "bottom-[calc(env(safe-area-inset-bottom)+64px)]" : "bottom-0"
        }`}
      >
        {canCustomize && customizationSummary?.pendingStageMessage && !isUnavailable && (
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customizationSummary.pendingStageMessage}</span>
          </div>
        )}
        {(isUnavailable || isCombinationUnavailable) && settings?.enableStockAlertNotification !== false ? (
          <button
            type="button"
            onClick={() => setShowNotificationModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors" style={{ backgroundColor: '#ea580c' }} onMouseOver={e => (e.currentTarget.style.backgroundColor='#c2410c')} onMouseOut={e => (e.currentTarget.style.backgroundColor='#ea580c')}
          >
            <BellRing className="h-5 w-5" />
            Avise-me quando chegar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddOrUpdateCart}
            disabled={!canAddToCart || isUnavailable || isCombinationUnavailable}
            className={`w-full rounded-xl px-6 py-3.5 text-base font-bold transition-colors ${
              !canAddToCart || isUnavailable || isCombinationUnavailable
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {primaryButtonLabel}
          </button>
        )}
      </div>

      <SiteFooter />
      {showNotificationModal && product && (
        <StockNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          productId={product.id}
          comboId={product.isCombo ? (product.comboId || product.id) : undefined}
          isCombo={product.isCombo}
          productTitle={product.name}
          variationName={Object.values(selections).join(" / ") || undefined}
        />
      )}
      {isImageModalOpen && (
        <ProductImageModal
          images={gallery}
          selectedIndex={selectedImage}
          onSelect={setSelectedImage}
          onClose={() => setIsImageModalOpen(false)}
          title={product?.name}
          description={product?.description}
        />
      )}

      {isComboFlowActive && comboStepProduct && activeCombo && (
        <ProductVariationModal
          isOpen={isComboFlowActive}
          onClose={handleCancelComboFlow}
          product={comboStepProduct}
          isComboStep={true}
          customTitle={`Escolha a variação (${comboStepIndex + 1} de ${comboTotalSteps})`}
          customSubtitle={`Item do combo: ${activeCombo.name}`}
          customConfirmLabel={comboStepIndex + 1 === comboTotalSteps ? "Concluir e Adicionar Combo" : "Próximo Item"}
          onConfirmVariation={(variation, productItem) => handleConfirmComboStep(variation, productItem)}
        />
      )}
    </div>
  );
};

export default ProductPage;
