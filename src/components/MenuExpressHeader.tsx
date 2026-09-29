import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Clock, AlertCircle, MapPin, Phone, Instagram, X } from "lucide-react";
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

  return (
    <header className="w-full bg-background border-b border-border-subtle">
      <StoreHoursTopBar />
      {/* Banner de Capa (se houver) */}
      {bannerUrl && (
        <div className="w-full h-36 md:h-52 overflow-hidden relative bg-muted">
          <img src={bannerUrl} alt="Capa da Loja" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Conteúdo Principal do Cabeçalho */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Dados da Loja */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.storeName || "Logo"}
                className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover border border-border shadow-sm shrink-0"
              />
            ) : (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-muted flex items-center justify-center font-bold text-xl text-muted-foreground shrink-0">
                {settings?.storeName?.charAt(0) || "L"}
              </div>
            )}

            <div className="space-y-1 flex-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {settings?.storeName || "Minha Loja"}
              </h1>
              
              {/* Badges de Status */}
              <div className="flex flex-wrap items-center gap-2">
                {!isLoading && (
                  isOpen ? (
                    <button
                      onClick={() => setHoursModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Aberto {closingTimeStr ? `até ${closingTimeStr}` : ''}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setHoursModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Fechado {nextOpenDateStr ? `(Reabre ${nextOpenDateStr.toLowerCase()})` : ''}</span>
                    </button>
                  )
                )}

                {!settings?.hideAddress ? (
                  (settings?.street || settings?.city) && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {settings?.street
                        ? `${settings.street}${settings.number ? `, ${settings.number}` : ''}${settings.neighborhood ? ` - ${settings.neighborhood}` : ''}${settings.city ? `, ${settings.city}` : ''}${settings.state ? ` - ${settings.state}` : ''}`
                        : `${settings?.city || ''}${settings?.state ? ` - ${settings.state}` : ''}`}
                    </span>
                  )
                ) : (
                  settings?.city && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {settings.city}, {settings.state}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Ações de Carrinho */}
          <div className="flex items-center justify-end w-full md:w-auto">
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
