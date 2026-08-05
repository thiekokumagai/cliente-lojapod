import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductImageModal from "@/components/ProductImageModal";
import ProductContact from "@/components/product/ProductContact";
import ProductDesktopGallery from "@/components/product/ProductDesktopGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductMobileGallery from "@/components/product/ProductMobileGallery";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useStoreMobilePadding } from "@/hooks/use-store-mobile-padding";
import { Loader2, AlertCircle } from "lucide-react";
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

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity, removeFromCart, triggerAddedModal, totalItems, setSelectedCategory } = useCart();
  const mobileBottom = useStoreMobilePadding("product");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [nicotineStrength, setNicotineStrength] = useState<string | null>(null);
  const [hasJustUpdated, setHasJustUpdated] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: product, isLoading } = useProduct(id);
  const gallery = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    return product?.image ? [product.image] : [];
  }, [product]);

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

  const selectedVariation = nicotineStrength ?? undefined;
  const cartItem = items.find(
    (item) => item.product.id === product?.id && item.selectedVariation === selectedVariation,
  );

  useEffect(() => {
    if (cartItem) {
      setQuantity(cartItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [cartItem?.quantity, selectedVariation, product?.id]);

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
        <SiteHeader />
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

  const isNicSalt = product.category === "NicSalt";
  const nicotineOptions = product.variationGroup?.options ?? [];
  const availableNicotineOptions = nicotineOptions.filter((option) => option.available);
  const canAddToCart = product.variationGroup ? nicotineStrength !== null : product.stock !== 0;
  const isUnavailable = product.variationGroup ? availableNicotineOptions.length === 0 : product.stock === 0;
  const hasNicotineOptions = nicotineOptions.length > 0;
  const productDescription = cleanDescription;

  const isInCart = !!cartItem;

  const totalPrice = product.price * quantity;
  const totalOldPrice = product.oldPrice ? product.oldPrice * quantity : 0;
  const discount = product.isPromo && product.oldPrice 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : undefined;

  const handleNavigateToList = () => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    redirectTimeoutRef.current = setTimeout(() => {
      navigate("/");
    }, 1200);
  };

  const handleAddOrUpdateCart = () => {
    if (!canAddToCart || isUnavailable) return;

    if (cartItem) {
      updateQuantity(product.id, quantity, selectedVariation);
      triggerAddedModal({ product, selectedVariation });
      setHasJustUpdated(true);
      handleNavigateToList();
      return;
    }

    addToCart({ product, selectedVariation });
    updateQuantity(product.id, quantity, selectedVariation);
    triggerAddedModal({ product, selectedVariation });
    setHasJustUpdated(true);
    handleNavigateToList();
  };

  const handleRemoveFromCart = () => {
    if (!cartItem) return;

    removeFromCart(product.id, selectedVariation);
    setHasJustUpdated(false);
    setQuantity(1);
  };

  const handleBackToStore = () => navigate("/");
  const handleGoBack = () => navigate(-1);

  const handleDecreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const handleIncreaseQuantity = () => setQuantity((current) => {
    if (product.variationGroup) {
      if (!selectedVariation) return current + 1;
      const opt = product.variationGroup.options.find((o) => o.label === selectedVariation);
      if (opt?.stock !== undefined && current >= opt.stock) return current;
    } else if (product.stock !== undefined && current >= product.stock) {
      return current;
    }
    return current + 1;
  });

  const isAtLimit = (() => {
    if (product?.variationGroup) {
      if (!selectedVariation) return false;
      const opt = product.variationGroup.options.find((o) => o.label === selectedVariation);
      return opt?.stock !== undefined && quantity >= opt.stock;
    }
    return product?.stock !== undefined && quantity >= product.stock;
  })();

  const primaryButtonLabel = isUnavailable
    ? "Esgotado"
    : !canAddToCart
      ? "Selecione"
      : isInCart
        ? "Atualizar"
        : "Adicionar ao Pedido";

  return (
    <div className={`min-h-screen bg-background md:pb-0 ${mobileBottom}`}>
      <div className="hidden lg:block">
        <SiteHeader />
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
          />

          <div className="-mt-6 rounded-t-[28px] bg-background px-5 pb-8 pt-7">
            <h1 className="font-display text-[24px] font-medium leading-tight text-fg-secondary">
              {product.name}
            </h1>

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
              isNicSalt={isNicSalt}
              productDescription={productDescription}
              nicotineOptions={nicotineOptions}
              hasNicotineOptions={hasNicotineOptions}
              nicotineStrength={nicotineStrength}
              onSelectNicotine={setNicotineStrength}
            />

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
            />

            <div className="max-w-[420px] pt-16">
              <h1 className="font-display text-[27px] font-semibold leading-[1.15] text-fg-secondary">
                {product.name}
              </h1>

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
                isNicSalt={isNicSalt}
                productDescription={productDescription}
                nicotineOptions={nicotineOptions}
                hasNicotineOptions={hasNicotineOptions}
                nicotineStrength={nicotineStrength}
                isDesktop
                onSelectNicotine={setNicotineStrength}
              />

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleAddOrUpdateCart}
                  disabled={!canAddToCart || isUnavailable}
                  className={`w-full rounded-lg px-6 py-3.5 text-base font-bold transition-colors ${
                    !canAddToCart || isUnavailable
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {primaryButtonLabel}
                </button>

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
        <button
          type="button"
          onClick={handleAddOrUpdateCart}
          disabled={!canAddToCart || isUnavailable}
          className={`w-full rounded-xl px-6 py-3.5 text-base font-bold transition-colors ${
            !canAddToCart || isUnavailable
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {primaryButtonLabel}
        </button>
      </div>

      <SiteFooter />
      {isImageModalOpen && (
        <ProductImageModal
          images={gallery}
          selectedIndex={selectedImage}
          onSelect={setSelectedImage}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductPage;
