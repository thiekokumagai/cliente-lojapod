import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface UrbanProductCardProps {
  product: Product;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function UrbanProductCard({ product, isBestSeller }: UrbanProductCardProps) {
  const isMobile = useIsMobile();
  const { addToCart } = useCart();
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const productImage = product.image || "";

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

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="group relative flex flex-col sm:flex-row items-stretch justify-between gap-3 sm:gap-4 w-full h-full bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer">
        <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Thumbnail com Badge de Desconto */}
          <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
            {discountPercentage > 0 && (
              <span className="absolute top-1 left-1 z-10 bg-red-500 text-white font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md shadow-xs">
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

          {/* Info do Produto */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              {product.category && (
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block mb-0.5 truncate">
                  {product.category}
                </span>
              )}
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                {product.name}
              </h3>

              {product.description && (
                <div
                  className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed [&>p]:inline [&>p]:after:content-['\a'] [&>p]:after:whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
            </div>

            {/* Preços */}
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              {product.oldPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.oldPrice)}
                </span>
              )}
              <span
                className="text-base sm:text-lg font-black"
                style={{ color: "var(--price-color, var(--primary-custom, #0f172a))" }}
              >
                {formatPrice(product.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Botão + Ícone Apenas */}
        <div className="flex items-end justify-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleBuy}
            className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-white font-bold hover:opacity-90 transition-all shadow-xs shrink-0"
            style={{ backgroundColor: "var(--primary-custom, #000000)" }}
            aria-label="Adicionar ao carrinho"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </button>
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
    </>
  );
}
