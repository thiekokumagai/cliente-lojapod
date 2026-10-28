import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingCart, BellRing } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { StockNotificationModal } from "@/components/StockNotificationModal";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useComboVariationFlow } from "@/hooks/useComboVariationFlow";

interface MenuExpressProductCardProps {
  product: Product;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function MenuExpressProductCard({ product, isBestSeller }: MenuExpressProductCardProps) {
  const isMobile = useIsMobile();
  const { items, addToCart } = useCart();
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm md:text-base text-foreground leading-snug line-clamp-2">
                {product.name}
              </h3>
            </div>

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
              className="text-base md:text-lg font-bold"
              style={{ color: "var(--price-color, var(--primary-custom, #16a34a))" }}
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
          </div>
        </div>

        {/* Lado Direito: Imagem sangrada ocupando toda a altura e lateral do card */}
        <div className="relative shrink-0 w-28 sm:w-36 self-stretch min-h-[110px] bg-muted overflow-hidden">
          {isBestSeller && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold py-0.5 px-1 text-center shadow-xs z-10 uppercase tracking-tight">
              🔥 Mais vendido
            </div>
          )}

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
                className="absolute bottom-2 right-2 h-7 w-7 rounded-full text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
                style={{ backgroundColor: "#ea580c" }}
                title="Avise-me quando chegar"
              >
                <BellRing className="h-3.5 w-3.5" />
              </button>
            ) : null
          ) : (
            <button
              onClick={handleBuy}
              className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
              title="Adicionar ao carrinho"
            >
              <Plus className="h-4 w-4" />
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
