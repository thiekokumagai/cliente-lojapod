import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, ShoppingCart, BellRing } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";
import { isProductAtStockLimit } from "@/utils/cart-stock";

interface MenuExpressProductCardProps {
  product: Product;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function MenuExpressProductCard({ product, isBestSeller }: MenuExpressProductCardProps) {
  const isMobile = useIsMobile();
  const { items, addToCart, updateQuantity } = useCart();
  const { data: storeSettings } = useStoreSettings();
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
    return (product.stock ?? 0) <= 0;
  }, [hasVariationGroup, availableOptions.length, product.stock]);

  const isSimpleProduct = !product.isCombo && !hasVariationGroup;
  const cartQty = useMemo(
    () =>
      items
        .filter((i) => i.product.id === product.id)
        .reduce((sum, i) => sum + i.quantity, 0),
    [items, product.id]
  );

  // Só simples e combos têm limite calculável sem escolher variação no card
  const atStockLimit = useMemo(
    () => (isSimpleProduct || !!product.isCombo) && isProductAtStockLimit(items, product),
    [items, product, isSimpleProduct]
  );

  const handleDecrease = () => {
    const line = items.find((i) => i.product.id === product.id);
    if (!line) return;
    updateQuantity(product.id, line.quantity - 1, line.selectedVariation);
  };

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const handleCardClick = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      window.history.pushState({}, '', `/produto/${product.id}`);
      setShowDetailsModal(true);
    }
  };

  const cardInner = (
    <div className="group relative flex items-stretch justify-between w-full h-full bg-card rounded-2xl border border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden">
        {/* Lado Esquerdo: Nome, Variações/Peso, Preço e Descrição */}
        <div className="flex-1 flex flex-col justify-between min-w-0 p-3 sm:p-3.5 pr-2 sm:pr-3">
          <div>
            {product.category && (
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block mb-0.5 truncate">
                {product.category}
              </span>
            )}
            <h3 className="font-semibold text-sm md:text-base leading-snug line-clamp-2 text-foreground">
              {product.name}
            </h3>

            {/* Badges de Peso/Unidade ou Serve X pessoas se houver nas variações */}
            {storeSettings?.showVariationsOnCard !== false && allGroups.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {allGroups[0].options.slice(0, 2).map((opt) => (
                  <span
                    key={opt.label}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground"
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
            )}

            {/* Descrição curta formatada em HTML */}
            {product.description && (
              <div
                className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed [&>p]:inline [&>p]:after:content-['\a'] [&>p]:after:whitespace-pre"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-base md:text-lg font-bold ${isUnavailable ? "opacity-75" : ""}`}
              style={{ color: isUnavailable ? "#94a3b8" : "var(--price-color, var(--primary-custom, #16a34a))" }}
            >
              {formatPrice(product.price)}
            </span>
            {product.isPromo && (
              <span className="text-xs font-semibold text-primary">
                no PIX
              </span>
            )}
            {product.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discountPercent > 0 && !isUnavailable && (
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Lado Direito: Imagem sangrada ocupando toda a altura e lateral do card */}
        <div className="relative shrink-0 w-36 sm:w-48 md:w-52 self-stretch min-h-[170px] sm:min-h-[170px] bg-muted overflow-hidden">
          {/* Badge Esgotado sobre a imagem */}
          {isUnavailable ? (
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
                Esgotado
              </span>
            </div>
          ) : isBestSeller ? (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold py-0.5 px-1 text-center shadow-xs z-10 uppercase tracking-tight">
              🔥 Mais vendido
            </div>
          ) : null}

          {productImage ? (
            <img
              src={productImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem imagem
            </div>
          )}

          {/* Botão de Adição Rápida (+) ou Avise-me */}
          {isUnavailable ? (
            storeSettings?.enableStockAlertNotification !== false ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNotificationModal(true);
                }}
                className="absolute bottom-2.5 right-2.5 h-9 w-9 sm:h-9.5 sm:w-9.5 rounded-full text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
                style={{ backgroundColor: "#ea580c" }}
                title="Avise-me quando chegar"
                aria-label="Avise-me quando chegar"
              >
                <BellRing className="h-4.5 w-4.5" />
              </button>
            ) : null
          ) : (isSimpleProduct || product.isCombo) && cartQty > 0 ? (
            <div
              onClick={stop}
              className="absolute bottom-2.5 right-2.5 z-10 flex h-10 items-center rounded-full bg-primary text-primary-foreground shadow-md"
            >
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  handleDecrease();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                aria-label="Remover uma unidade"
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums">{cartQty}</span>
              <button
                type="button"
                disabled={atStockLimit}
                onClick={(e) => {
                  stop(e);
                  if (atStockLimit) return;
                  handleBuy(e);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                  atStockLimit ? "opacity-40 cursor-not-allowed" : "active:scale-90"
                }`}
                title={atStockLimit ? "Quantidade máxima em estoque atingida" : undefined}
                aria-label={atStockLimit ? "Quantidade máxima atingida" : "Adicionar mais uma unidade"}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={atStockLimit}
              className={`absolute bottom-2.5 right-2.5 h-10 w-10 rounded-full shadow-md flex items-center justify-center transition-transform z-10 ${
                atStockLimit
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                  : "bg-primary text-primary-foreground hover:scale-110 active:scale-95"
              }`}
              title={atStockLimit ? "Quantidade máxima em estoque atingida" : "Adicionar ao carrinho"}
              aria-label={atStockLimit ? "Quantidade máxima atingida" : "Adicionar ao carrinho"}
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              {cartQty > 0 && (
                <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary shadow-sm border border-primary/30">
                  {cartQty}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
  );

  return (
    <>
      {isMobile ? (
        <div onClick={handleCardClick} className="w-full h-full">
          {cardInner}
        </div>
      ) : (
        <Link to={`/produto/${product.id}`} className="block w-full h-full">
          {cardInner}
        </Link>
      )}

      {showVariationModal && (
        <ProductVariationModal
          product={product}
          selectedOption={selectedVariation}
          onSelect={setSelectedVariation}
          onClose={() => setShowVariationModal(false)}
          onConfirm={handleConfirmVariation}
        />
      )}
      {/* Modal de Variação de Componente do Combo (Reutilizado) */}
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
      {/* Modal de Avise-me quando chegar */}
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
}
