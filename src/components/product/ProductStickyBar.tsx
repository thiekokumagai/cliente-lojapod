interface ProductStickyBarProps {
  canAddToCart: boolean;
  isUnavailable: boolean;
  onAddToCart: () => void;
}

const ProductStickyBar = ({
  canAddToCart,
  isUnavailable,
  onAddToCart,
}: ProductStickyBarProps) => {
  const buttonLabel = isUnavailable
    ? "Indisponível"
    : canAddToCart
      ? "Adicionar ao Pedido"
      : "Selecione";

  return (
    <div className="fixed inset-x-0 bottom-[92px] z-50 border-t border-border bg-background px-5 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:bottom-0 md:pb-[calc(env(safe-area-inset-bottom)+16px)] md:pt-4">
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!canAddToCart || isUnavailable}
        className="mx-auto block w-full max-w-[240px] rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground disabled:bg-[#c7c7c7] disabled:text-white"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default ProductStickyBar;
