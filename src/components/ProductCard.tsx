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

  return (
    <>
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-4 transition-all hover:shadow-md border border-border">
        <div>
          <Link
            to={`/produto/${product.id}`}
            onClick={saveScrollPosition}
            className="block cursor-pointer"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-subtle">
              {isBestSeller && (
                <img
                  src={seloMaisVendido}
                  alt="Selo Mais Vendido"
                  className="absolute left-2 top-2 z-10 h-10 w-10 object-contain drop-shadow-md transition-transform group-hover:scale-105"
                />
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
          </Link>

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

        {hasVariationGroup ? (
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
