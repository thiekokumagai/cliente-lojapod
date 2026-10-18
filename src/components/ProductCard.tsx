import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Minus, Plus, ShoppingCart, BellRing } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";
import seloMaisVendido from "@/assets/seloMaisVendido.png";


interface ProductCardProps {
  product: Product;
  index: number;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$${price.toFixed(2).replace(".", ",")}`;

const saveScrollPosition = () => {
  if (window.scrollY > 0) {
    sessionStorage.setItem("store_scroll_pos", window.scrollY.toString());
  }
};

const ProductCard = ({ product, isBestSeller }: ProductCardProps) => {
  const isMobile = useIsMobile();
  const { data: storeSettings } = useStoreSettings();
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const productImage = product.image || "";

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

  const discountPercentage = useMemo(() => {
    if (product.isPromo && product.oldPrice && product.price < product.oldPrice) {
      return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    }
    return 0;
  }, [product.isPromo, product.oldPrice, product.price]);

  const allGroups = useMemo(() => {
    return product.variationGroups && product.variationGroups.length > 0
      ? product.variationGroups
      : product.variationGroup
        ? [product.variationGroup]
        : [];
  }, [product.variationGroups, product.variationGroup]);

  const hasVariationGroup = allGroups.length > 0;

  const availableOptions = useMemo(() => {
    return allGroups.flatMap((g) => g.options).filter((o) => o.available);
  }, [allGroups]);

  const isUnavailable = useMemo(() => {
    if (hasVariationGroup) {
      return availableOptions.length === 0;
    }
    return product.stock !== undefined && product.stock <= 0;
  }, [hasVariationGroup, availableOptions.length, product.stock]);

  const cartItem = items.find(
    (item) => item.product.id === product.id && item.selectedVariation === undefined
  );
  const quantityInCart = cartItem?.quantity ?? 0;

  const variationItemsInCart = useMemo(
    () =>
      items.filter(
        (item) =>
          item.product.id === product.id && item.selectedVariation !== undefined
      ),
    [items, product.id]
  );

  const hasVariationInCart = variationItemsInCart.length > 0;
  const variationQuantityInCart = variationItemsInCart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleBuy = () => {
    if (product.isCombo) {
      startComboFlow(product);
      return;
    }

    if (hasVariationGroup) {
      setSelectedVariation(null);
      setShowVariationModal(true);
      return;
    }

    addToCart(product);
  };

  const handleConfirmVariation = () => {
    if (!selectedVariation) return;

    addToCart({ product, selectedVariation });
    setShowVariationModal(false);
  };

  const handleDecrease = () => {
    if (!cartItem) return;

    if (cartItem.quantity <= 1) {
      removeFromCart(product.id);
      return;
    }

    updateQuantity(product.id, cartItem.quantity - 1);
  };

  const handleIncrease = () => {
    if (hasVariationGroup) {
      setSelectedVariation(null);
      setShowVariationModal(true);
      return;
    }

    if (cartItem) {
      if (product.stock !== undefined && cartItem.quantity >= product.stock) return;
      updateQuantity(product.id, cartItem.quantity + 1);
      return;
    }

    addToCart(product);
  };

  const isAtLimit = cartItem && product.stock !== undefined ? cartItem.quantity >= product.stock : false;

  const cardContent = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-subtle">
        {product.isCombo && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            COMBO
          </span>
        )}
        {isBestSeller && !product.isCombo && (
          <img
            src={seloMaisVendido}
            alt="Selo Mais Vendido"
            className="absolute left-2 top-2 z-10 h-10 w-10 object-contain drop-shadow-md transition-transform group-hover:scale-105"
          />
        )}
        {discountPercentage > 0 && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-[#DE2839] px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            -{discountPercentage}%
          </span>
        )}
        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {product.category}
      </p>
      <h3 className="mt-1 font-display text-base font-semibold leading-tight text-foreground line-clamp-2">
        {product.name}
      </h3>
    </>
  );

  return (
    <>
      <div className="group relative flex flex-col justify-between w-full h-full overflow-hidden rounded-2xl bg-card p-4 transition-all hover:shadow-md border border-border">
        <div>
          {isMobile ? (
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', `/produto/${product.id}`);
                setShowDetailsModal(true);
              }}
              className="block cursor-pointer text-left w-full"
            >
              {cardContent}
            </button>
          ) : (
            <Link
              to={`/produto/${product.id}`}
              onClick={saveScrollPosition}
              className="block cursor-pointer text-left w-full"
            >
              {cardContent}
            </Link>
          )}

          {allGroups.length > 0 && (
            <div className="mt-3 space-y-2">
              {allGroups.map((group) => (
                <div key={group.name}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.options.map((option) => (
                      <span
                        key={option.label}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          option.available
                            ? "border-border text-foreground"
                            : "border-border text-muted-foreground line-through opacity-60"
                        }`}
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {hasVariationInCart && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Adicionado ao carrinho ({variationQuantityInCart} {variationQuantityInCart === 1 ? "item" : "itens"})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 min-h-[62px]">
          {product.oldPrice && (
            <span className="block text-xs text-muted-foreground line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p
              className="text-lg font-bold leading-tight"
              style={{ color: "var(--price-color, var(--primary-custom, #dc2626))" }}
            >
              {formatPrice(product.price)}
            </p>
            {product.isPromo && (
              <span className="text-xs font-semibold text-primary">
                no PIX
              </span>
            )}
          </div>
        </div>

        {product.isCombo ? (
          (product.stock ?? 0) <= 0 ? (
            storeSettings?.enableStockAlertNotification !== false ? (
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white shadow-sm transition-colors"
                style={{ backgroundColor: '#ea580c' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
              >
                <BellRing className="h-4 w-4" />
                Avise-me quando chegar
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold bg-muted text-muted-foreground cursor-not-allowed"
              >
                Esgotado
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleBuy}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold bg-primary text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              Comprar Combo
            </button>
          )
        ) : isUnavailable ? (
          storeSettings?.enableStockAlertNotification !== false ? (
            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white shadow-sm transition-colors" style={{ backgroundColor: '#ea580c' }} onMouseOver={e => (e.currentTarget.style.backgroundColor='#c2410c')} onMouseOut={e => (e.currentTarget.style.backgroundColor='#ea580c')}
            >
              <BellRing className="h-4 w-4" />
              Avise-me quando chegar
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold bg-muted text-muted-foreground cursor-not-allowed"
            >
              Esgotado
            </button>
          )
        ) : hasVariationGroup ? (
          <button
            type="button"
            onClick={handleBuy}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold bg-primary text-primary-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
            {hasVariationInCart ? "Adicionar mais" : "Comprar"}
          </button>
        ) : quantityInCart > 0 ? (
          <div className="mt-2 flex h-12 items-center justify-between rounded-xl bg-primary px-4 text-primary-foreground">
            <button
              type="button"
              onClick={handleDecrease}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="text-base font-semibold">{quantityInCart}</span>

            <button
              type="button"
              disabled={isAtLimit}
              onClick={handleIncrease}
              className={`flex h-7 w-7 items-center justify-center rounded-full ${isAtLimit ? "bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed" : "bg-primary-foreground/20"}`}
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBuy}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold bg-primary text-primary-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
            Comprar
          </button>
        )}
        </div>

      {showVariationModal && (
        <ProductVariationModal
          product={product}
          selectedOption={selectedVariation}
          onSelect={setSelectedVariation}
          onClose={() => setShowVariationModal(false)}
          onConfirm={handleConfirmVariation}
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
          onConfirmVariation={handleConfirmComboStep}
        />
      )}
      {showDetailsModal && (
        <ProductDetailsModal
          product={product}
          onClose={() => {
            window.history.pushState({}, '', '/');
            setShowDetailsModal(false);
          }}
        />
      )}
      {showNotificationModal && (
        <StockNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          productId={product.id}
          comboId={product.isCombo ? (product.comboId || product.id) : undefined}
          isCombo={product.isCombo}
          productTitle={product.name}
        />
      )}
    </>
  );
};

export default ProductCard;
