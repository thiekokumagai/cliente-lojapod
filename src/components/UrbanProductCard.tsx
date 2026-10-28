import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BellRing } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";

interface UrbanProductCardProps {
  product: Product;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function UrbanProductCard({ product, isBestSeller }: UrbanProductCardProps) {
  const isMobile = useIsMobile();
  const { addToCart } = useCart();
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
    return (product.stock ?? 0) <= 0;
  }, [hasVariationGroup, availableOptions.length, product.stock]);

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
    <div className="group relative flex flex-row items-stretch justify-between w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden">
      {/* Thumbnail que preenche a altura inteira do quadro sangrada na esquerda */}
      <div className="relative shrink-0 w-[115px] sm:w-[130px] self-stretch min-h-[120px] bg-slate-50 flex items-center justify-center overflow-hidden">
        {discountPercentage > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md shadow-xs">
            -{discountPercentage}%
          </span>
        )}

        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-slate-300 text-xs">Sem imagem</div>
        )}
      </div>

      {/* Info do Produto, Preços e Botões */}
      <div className="flex-1 flex flex-col justify-between min-w-0 self-stretch p-3 sm:p-3.5 pl-3 sm:pl-3.5">
        <div>
          {product.category && (
            <span className="hidden sm:block text-[11px] font-semibold text-primary uppercase tracking-wider mb-0.5 truncate">
              {product.category}
            </span>
          )}
          <h3 className="font-bold text-slate-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
            {product.name}
          </h3>

          {/* Badges de Variações em telas maiores */}
          {storeSettings?.showVariationsOnCard !== false && allGroups.length > 0 && (
            <div className="hidden sm:flex mt-1.5 flex-wrap gap-1">
              {allGroups[0].options.slice(0, 3).map((opt) => (
                <span
                  key={opt.label}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-600"
                >
                  {opt.label}
                </span>
              ))}
              {allGroups[0].options.length > 3 && (
                <span className="text-[10px] text-slate-400 self-center">
                  +{allGroups[0].options.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Linha Inferior: Preço na esquerda e Botão Desktop '+' no canto direito */}
        <div className="mt-2 flex items-end justify-between gap-2 w-full">
          {/* Preços */}
          <div>
            {product.oldPrice && (
              <span className="block text-xs text-slate-300 font-semibold line-through leading-none mb-1">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-base sm:text-lg font-black leading-none"
                style={{ color: "var(--price-color, var(--primary-custom, #0f172a))" }}
              >
                {formatPrice(product.price)}
              </span>
              {product.isPromo && (
                <span className="text-xs font-semibold text-primary sm:hidden">
                  no PIX
                </span>
              )}
            </div>
          </div>

          {/* Botão Desktop: Quadrado preto com '+' no canto inferior direito */}
          <div className="hidden sm:flex items-center justify-end shrink-0">
            {isUnavailable ? (
              storeSettings?.enableStockAlertNotification !== false ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowNotificationModal(true);
                  }}
                  className="flex items-center justify-center h-9 w-9 rounded-xl text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                  style={{ backgroundColor: "#ea580c" }}
                  title="Avise-me quando chegar"
                  aria-label="Avise-me quando chegar"
                >
                  <BellRing className="h-4.5 w-4.5" />
                </button>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg">
                  Esgotado
                </span>
              )
            ) : (
              <button
                type="button"
                onClick={handleBuy}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                style={{ backgroundColor: "var(--primary-custom, #000000)" }}
                aria-label="Adicionar ao carrinho"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Botão Maior Mobile (Embaixo do Preço) */}
        <div className="mt-2.5 sm:hidden w-full">
          {isUnavailable ? (
            storeSettings?.enableStockAlertNotification !== false ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNotificationModal(true);
                }}
                className="flex items-center justify-center w-full h-9 rounded-xl text-white font-bold text-xs shadow-xs gap-1.5 active:scale-[0.98] transition-all"
                style={{ backgroundColor: "#ea580c" }}
                title="Avise-me quando chegar"
              >
                <BellRing className="h-4 w-4" />
                <span>Avise-me quando chegar</span>
              </button>
            ) : (
              <div className="flex items-center justify-center w-full h-9 rounded-xl bg-muted text-muted-foreground font-semibold text-xs">
                Esgotado
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={handleBuy}
              className="flex items-center justify-center w-full h-9 rounded-xl text-white font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all shadow-xs gap-2"
              style={{ backgroundColor: "var(--primary-custom, #000000)" }}
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Adicionar</span>
            </button>
          )}
        </div>
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

      {/* Modal de Variações */}
      {showVariationModal && hasVariationGroup && (
        <ProductVariationModal
          product={product}
          selectedOption={selectedVariation}
          onSelect={setSelectedVariation}
          onConfirm={handleConfirmVariation}
          onClose={() => setShowVariationModal(false)}
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

      {/* Modal Interno de Detalhes */}
      {showDetailsModal && (
        <ProductDetailsModal
          product={product}
          onClose={() => {
            setShowDetailsModal(false);
            window.history.pushState({}, '', '/');
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
