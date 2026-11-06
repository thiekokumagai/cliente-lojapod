import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import FreeShippingProgress from "./FreeShippingProgress";

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/** Barra flutuante do carrinho (desktop). No mobile quem cumpre esse papel é a MobileBottomNav. */
export default function FloatingCartBar() {
  const { totalItems, totalPrice, setIsCartOpen } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-40 mx-auto hidden max-w-md md:block">
      <div className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-xl">
        <FreeShippingProgress className="border border-b-0 border-border rounded-t-2xl bg-background px-4 pt-2.5 pb-2" />

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex w-full items-center justify-between px-5 py-3.5 font-medium transition-colors hover:bg-primary/90 active:brightness-95"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary">
                {totalItems}
              </span>
            </div>
            <span className="text-sm font-semibold">
              Ver sacola · {totalItems} {totalItems === 1 ? "item" : "itens"}
            </span>
          </div>

          <span className="text-sm font-bold">{formatPrice(totalPrice)}</span>
        </button>
      </div>
    </div>
  );
}
