import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Clock, AlertCircle, MapPin, Phone, Instagram, X, Truck, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBusinessStatus } from "@/hooks/useBusinessStatus";
import StoreHoursTopBar from "./StoreHoursTopBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function MenuExpressHeader() {
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const { totalItems, setIsCartOpen, searchTerm, setSearchTerm } = useCart();
  const { data: settings, isLoading } = useStoreSettings();
  const { isOpen, nextOpenDateStr, businessHours, closingTimeStr } = useBusinessStatus(settings?.businessHours);

  const bannerUrl = settings?.bannerUrls && settings.bannerUrls.length > 0 ? settings.bannerUrls[0] : null;

  const isNoFee = settings?.deliveryType === "NO_FEE" || Boolean(settings?.freeShippingEnabled);
  const isFixedFee = settings?.deliveryType === "FIXED_FEE";
  const fixedFeeValue = settings?.deliveryFixedFee;
  const showStorePickup = Boolean(settings?.storePickupEnabled);

  return (
    <header className="w-full bg-background border-b border-border-subtle">
      <StoreHoursTopBar />
      {/* Banner de Capa (se houver) */}
      {bannerUrl && (
        <div className="w-full md:h-64 overflow-hidden relative bg-muted">
          <img src={bannerUrl} alt="Capa da Loja" className="w-full h-full object-cover" />
          <div className="absolute inset-0" />
        </div>
      )}

      {/* Conteúdo Principal do Cabeçalho */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-start md:items-center justify-between gap-3 md:gap-4">
          
          {/* Logo & Dados da Loja */}
          <div className="flex items-start sm:items-center gap-3 md:gap-4 flex-1 min-w-0">
            <Link to="/" className="shrink-0 group hover:opacity-95 transition-opacity" title="Ir para a página inicial">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName || "Logo"}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover border border-border shadow-sm shrink-0 group-hover:shadow-md transition-shadow cursor-pointer"
                />
              ) : (
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-muted flex items-center justify-center font-bold text-xl text-muted-foreground shrink-0 cursor-pointer">
                  {settings?.storeName?.charAt(0) || "L"}
                </div>
              )}
            </Link>

            <div className="space-y-1 flex-1 min-w-0">
              <Link to="/" className="block group w-fit max-w-full" title="Ir para a página inicial">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
                  {settings?.storeName || "Minha Loja"}
                </h1>
              </Link>
              
              {/* Badges de Status e Serviços */}
              <div className="flex flex-wrap items-center gap-2">
                {!isLoading && (
                  isOpen ? (
                    <button
                      onClick={() => setHoursModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors shrink-0"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Aberto {closingTimeStr ? `até ${closingTimeStr}` : ''}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setHoursModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors shrink-0"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Fechado {nextOpenDateStr ? `(Reabre ${nextOpenDateStr.toLowerCase()})` : ''}</span>
                    </button>
                  )
                )}

                {/* Destaque de Frete Grátis */}
                {isNoFee && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shrink-0">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      {settings?.freeShippingMinValue
                        ? `Frete grátis acima de R$ ${Number(settings.freeShippingMinValue).toFixed(2).replace('.', ',')}`
                        : 'Frete grátis'}
                    </span>
                  </span>
                )}

                {/* Destaque de Taxa Fixa */}
                {!isNoFee && isFixedFee && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 shrink-0">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Taxa fixa{fixedFeeValue ? `: R$ ${Number(fixedFeeValue).toFixed(2).replace('.', ',')}` : ''}</span>
                  </span>
                )}

                {/* Retirada na Loja */}
                {showStorePickup && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 shrink-0">
                    <Store className="h-3.5 w-3.5 text-blue-600" />
                    <span>Retirada</span>
                  </span>
                )}

                {!settings?.hideAddress ? (
                  (settings?.street || settings?.city) && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {settings?.street
                        ? `${settings.street}${settings.number ? `, ${settings.number}` : ''}${settings.complement ? ` - ${settings.complement}` : ''}${settings.neighborhood ? ` - ${settings.neighborhood}` : ''}${settings.city ? `, ${settings.city}` : ''}${settings.state ? ` - ${settings.state}` : ''}`
                        : `${settings?.city || ''}${settings?.state ? ` - ${settings.state}` : ''}`}
                    </span>
                  )
                ) : (
                  settings?.city && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {settings.city}, {settings.state}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Ações de Carrinho */}
          <div className="flex items-center shrink-0 pt-0.5 md:pt-0">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-background">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Modal de Horários */}
      <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horários de Atendimento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {businessHours && businessHours.length > 0 ? (
              WEEKDAYS.map((dayName, idx) => {
                const rule = businessHours.find((r: any) => r.days.includes(idx));
                const isToday = new Date().getDay() === idx;
                
                return (
                  <div key={idx} className={`flex justify-between py-2 border-b border-border-subtle last:border-0 ${isToday ? 'font-bold text-primary' : 'text-fg-secondary'}`}>
                    <span>{dayName}</span>
                    <span className="text-right">
                      {rule && rule.intervals.length > 0 
                        ? rule.intervals.map((i: any) => `${i.open} - ${i.close}`).join(', ')
                        : 'Fechado'
                      }
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">Horários não configurados.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
