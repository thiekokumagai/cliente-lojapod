import { Truck, Store } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function UrbanFeaturedHeader() {
  const { data: settings } = useStoreSettings();

  const isNoFee = settings?.deliveryType === "NO_FEE" || Boolean(settings?.freeShippingEnabled);
  const isFixedFee = settings?.deliveryType === "FIXED_FEE";
  const fixedFeeValue = settings?.deliveryFixedFee;

  const showDeliveryBadge = isNoFee || isFixedFee;
  const showStorePickup = Boolean(settings?.storePickupEnabled);

  if (!showDeliveryBadge && !showStorePickup) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Badges de Serviços / Entrega */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {isNoFee && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shrink-0">
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Frete grátis</span>
          </div>
        )}

        {isFixedFee && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shrink-0">
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Taxa fixa{fixedFeeValue ? `: R$ ${Number(fixedFeeValue).toFixed(2).replace('.', ',')}` : ''}</span>
          </div>
        )}

        {showStorePickup && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 shrink-0">
            <Store className="h-3.5 w-3.5 text-blue-600" />
            <span>Retirada</span>
          </div>
        )}
      </div>
    </div>
  );
}
