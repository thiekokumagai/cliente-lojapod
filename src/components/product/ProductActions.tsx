import { Minus, Plus } from "lucide-react";

interface ProductActionsProps {
  quantity: number;
  priceLabel: string;
  canAddToCart: boolean;
  isUnavailable: boolean;
  isDesktop?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onAddToCart: () => void;
  onBackToStore: () => void;
}

const ProductActions = ({
  quantity,
  priceLabel,
  canAddToCart,
  isUnavailable,
  isDesktop = false,
  onDecrease,
  onIncrease,
  onAddToCart,
  onBackToStore,
}: ProductActionsProps) => {
  const buttonLabel = isUnavailable
    ? "Indisponível"
    : canAddToCart
      ? "Adicionar ao Pedido"
      : "Selecione";

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-4">
        <div
          className={`flex items-center gap-3 rounded-full bg-[#f2f0ef] ${
            isDesktop ? "px-5 py-2.5 text-[#666666]" : "px-4 py-2.5"
          }`}
        >
          <button
            type="button"
            onClick={onDecrease}
            className={isDesktop ? "" : "text-[#7a7a7a]"}
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            className={`text-center text-lg ${
              isDesktop ? "min-w-4" : "min-w-5 text-[#5c5c5c]"
            }`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            className={isDesktop ? "" : "text-[#7a7a7a]"}
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className={`text-sm ${isDesktop ? "text-[#979797]" : "text-[#9b9b9b]"}`}>un</span>
        </div>

        <div className={isDesktop ? "text-[28px] font-semibold text-[#555555]" : "text-[20px] font-semibold text-[#5a5a5a]"}>
          {priceLabel}
        </div>
      </div>

      <div className={isDesktop ? "mt-5 space-y-2.5" : "mt-0"}>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!canAddToCart || isUnavailable}
          className={`w-full px-6 text-base font-bold ${
            isDesktop
              ? canAddToCart && !isUnavailable
                ? "rounded-lg bg-primary py-3.5 text-primary-foreground"
                : "rounded-xl bg-[#bfbfbf] py-3.5 text-white"
              : canAddToCart && !isUnavailable
                ? "mt-6 rounded-xl bg-primary py-3 text-center font-medium text-primary-foreground"
                : "mt-6 rounded-xl bg-[#c7c7c7] py-3 text-center font-medium text-white"
          }`}
        >
          {buttonLabel}
        </button>

        {isDesktop && (
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full rounded-lg border border-primary px-6 py-3 text-base font-medium text-primary"
          >
            Voltar pra loja
          </button>
        )}

        {!isDesktop && (
          <button
            type="button"
            onClick={onBackToStore}
            className="mx-auto mt-4 block w-full rounded-xl border border-primary px-6 py-3 text-center text-base font-medium text-primary"
          >
            Voltar pra loja
          </button>
        )}
      </div>
    </>
  );
};

export default ProductActions;
