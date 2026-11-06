import { Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { cn } from "@/lib/utils";

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/** Progresso até o frete grátis. Não renderiza nada se a loja não tiver meta configurada. */
export default function FreeShippingProgress({ className }: { className?: string }) {
  const { totalPrice } = useCart();
  const { data: settings } = useStoreSettings();

  const minValue = Number(settings?.freeShippingMinValue);
  if (!settings?.freeShippingEnabled || isNaN(minValue) || minValue <= 0) return null;

  const achieved = totalPrice >= minValue;
  const remaining = Math.max(0, minValue - totalPrice);
  const progress = Math.min(100, (totalPrice / minValue) * 100);

  return (
    <div className={cn("text-foreground", className)}>
      <div className="flex items-center gap-2 text-xs">
        <Truck className={cn("h-4 w-4 shrink-0", achieved ? "text-emerald-600" : "text-primary")} />
        <span className="truncate">
          {achieved ? (
            <strong className="font-bold text-emerald-700">Você ganhou frete grátis!</strong>
          ) : (
            <>
              Faltam <strong className="font-bold text-primary">{formatPrice(remaining)}</strong> para{" "}
              <strong className="font-bold">frete grátis</strong>
            </>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", achieved ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
