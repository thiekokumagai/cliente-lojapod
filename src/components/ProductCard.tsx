import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Minus, Plus, ShoppingCart } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import ProductVariationModal from "@/components/ProductVariationModal";
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
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [showVariationModal, setShowVariationModal] = useState(false);
  
  const productImage = product.image || "";

  const availableOptions = product.variationGroup?.options.filter((option) => option.available) ?? [];
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
    if (product.variationGroup) {
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
    if (product.variationGroup) {
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

  return (
    <>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-shadow hover:shadow-md">
        {product.isPromo && product.oldPrice && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
          </span>
        )}
        
        {isBestSeller && !product.isPromo && (
          <img
            src={seloMaisVendido}
            alt="Mais Vendido"
            className="absolute left-3 top-3 z-10 h-16 w-16 object-contain drop-shadow-sm"
          />
        )}

        <Link to={`/produto/${product.id}`} onClick={saveScrollPosition} className="block">
          <div className="relative overflow-hidden bg-secondary/30 p-4 pb-0">
            {productImage ? (
              <img
                src={productImage}
                alt={product.name}
                className="mx-auto aspect-square w-full rounded-sm object-cover"
                loading="lazy"
              />
            ) : (
              <div className="mx-auto aspect-square w-full animate-pulse rounded-sm bg-secondary" />
            )}
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-4 pt-2">
          <div className="flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {product.category}
            </span>
            <Link to={`/produto/${product.id}`} onClick={saveScrollPosition} className="block">
              <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                {product.name}
              </h3>
            </Link>

            {product.variationGroup && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.variationGroup.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.variationGroup.options.map((option) => (
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
              <p className="text-lg font-bold leading-tight text-primary">
                {formatPrice(product.price)}
              </p>
              {product.isPromo && (
                <span className="text-xs font-semibold text-primary">
                  no PIX
                </span>
              )}
            </div>
          </div>

          {product.variationGroup ? (
            <button
              type="button"
              onClick={handleBuy}
              disabled={availableOptions.length === 0}
              className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                availableOptions.length === 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {availableOptions.length === 0 ? "Indisponível" : hasVariationInCart ? "Adicionar mais" : "Comprar"}
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
              disabled={product.stock === 0}
              className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                product.stock === 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {product.stock === 0 ? "Esgotado" : "Comprar"}
            </button>
          )}
        </div>
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
    </>
  );
};

export default ProductCard;
