import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";

export default function FloatingCartBar() {
  const { totalItems, totalPrice, setIsCartOpen } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-40 max-w-md mx-auto">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-primary text-primary-foreground py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between font-medium transition-transform active:scale-[0.98] hover:bg-primary/90"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-white text-primary font-bold text-[10px] h-4 w-4 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <span className="text-sm font-semibold">Ver Pedido</span>
        </div>

        <span className="text-sm font-bold">
          R$ {totalPrice.toFixed(2).replace(".", ",")}
        </span>
      </button>
    </div>
  );
}
