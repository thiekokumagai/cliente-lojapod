import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingCart } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuExpressProductCardProps {
  product: Product;
  isBestSeller?: boolean;
}

const formatPrice = (price: number) =>
  `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function MenuExpressProductCard({ product, isBestSeller }: MenuExpressProductCardProps) {
  const isMobile = useIsMobile();
  const { items, addToCart } = useCart();
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const productImage = product.image || "";

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
    <div className="group relative flex justify-between gap-3 w-full bg-card p-3.5 rounded-2xl border border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer">
        {/* Lado Esquerdo: Nome, Variações/Peso, Preço e Descrição */}
        <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm md:text-base text-foreground leading-snug truncate">
                {product.name}
              </h3>
            </div>

            {/* Badges de Peso/Unidade ou Serve X pessoas se houver nas variações */}
            {allGroups.length > 0 && (
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

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="text-base md:text-lg font-bold"
              style={{ color: "var(--price-color, var(--primary-custom, #16a34a))" }}
            >
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Lado Direito: Imagem quadrada com Botão Rosa/Primário de Adição de Carrinho */}
        <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-muted">
          {isBestSeller && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold py-0.5 px-1 text-center shadow-xs z-10 uppercase tracking-tight">
              🔥 Mais vendido
            </div>
          )}

          {productImage ? (
            <img
              src={productImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem imagem
            </div>
          )}

          {/* Botão de Adição Rápida (+) com efeito de sobreposição */}
          <button
            onClick={handleBuy}
            className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
            title="Adicionar ao carrinho"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
  );

  return (
    <>
      {isMobile ? (
        <div onClick={handleCardClick} className="w-full">
          {cardInner}
        </div>
      ) : (
        <Link to={`/produto/${product.id}`} className="block w-full">
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
      {showDetailsModal && (
        <ProductDetailsModal
          product={product}
          onClose={() => {
            window.history.pushState({}, '', '/');
            setShowDetailsModal(false);
          }}
        />
      )}
    </>
  );
}
