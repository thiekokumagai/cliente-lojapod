import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, LayoutGrid, X } from "lucide-react";

import logoFallback from "@/assets/logo.webp";
import { useCart } from "@/contexts/CartContext";
import CategoriesMenu from "@/components/CategoriesMenu";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBusinessStatus } from "@/hooks/useBusinessStatus";
import { AlertCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const SiteHeader = () => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const { totalItems, setIsCartOpen, searchTerm, setSearchTerm } = useCart();
  const { data: settings, isLoading } = useStoreSettings();
  const { isOpen, nextOpenDateStr, businessHours, closingTimeStr } = useBusinessStatus(settings?.businessHours);

  const location = useLocation();
  const navigate = useNavigate();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    if (searchTerm.trim() !== "" && location.pathname !== "/") {
      window.scrollTo(0, 0);
      navigate("/");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] border-b border-border-subtle bg-background/95 backdrop-blur-md md:hidden">
        {!isLoading && (
          isOpen ? (
            <div className="bg-green-600 text-white text-[10px] sm:text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 w-full">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate">Loja aberta! {closingTimeStr ? `Atendendo até às ${closingTimeStr}.` : 'Faça seu pedido agora.'}</span>
              <button onClick={() => setHoursModalOpen(true)} className="underline ml-1 shrink-0 hover:text-green-100 transition-colors">Ver horários</button>
            </div>
          ) : (
            <div className="bg-red-500 text-white text-[10px] sm:text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 w-full">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">Loja fechada. {nextOpenDateStr ? `Reabre ${nextOpenDateStr.toLowerCase()}.` : 'Processamento no próximo horário útil.'}</span>
              <button onClick={() => setHoursModalOpen(true)} className="underline ml-1 shrink-0 hover:text-red-100 transition-colors">Ver horários</button>
            </div>
          )
        )}
        <div className="px-4 pb-3 pt-3">
          <div className="mx-auto max-w-7xl space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              className="rounded-full p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg-secondary"
              aria-label="Categorias"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>

            <Link to="/" className="absolute left-1/2 -translate-x-1/2">
              <img src={settings?.logoUrl || logoFallback} alt={settings?.storeName || "Pod & Mais"} className="h-10 w-10 object-contain" />
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative rounded-full p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg-secondary"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-muted/80 px-4 py-2 transition-colors focus-within:border-border focus-within:ring-2 focus-within:ring-ring/25">
            <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Faça sua busca"
              className="w-full bg-transparent text-base text-fg-secondary placeholder:text-fg-subtle focus:outline-none md:text-sm"
            />
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="shrink-0 rounded-full text-fg-subtle transition-colors hover:bg-background hover:text-fg-secondary"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={handleSearchSubmit} className="text-primary hover:text-primary/80" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 hidden border-b border-border-subtle bg-background/95 backdrop-blur-md md:block flex flex-col">
        {!isLoading && (
          isOpen ? (
            <div className="bg-green-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span>A loja está aberta. {closingTimeStr ? `Atendendo até às ${closingTimeStr}!` : 'Recebendo pedidos normalmente!'}</span>
              <button onClick={() => setHoursModalOpen(true)} className="underline ml-2 hover:text-green-100 transition-colors">Ver horários</button>
            </div>
          ) : (
            <div className="bg-red-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>A loja está fechada. {nextOpenDateStr ? `Reabriremos ${nextOpenDateStr.toLowerCase()}.` : 'Os pedidos serão processados no próximo horário útil.'}</span>
              <button onClick={() => setHoursModalOpen(true)} className="underline ml-2 hover:text-red-100 transition-colors">Ver horários</button>
            </div>
          )
        )}
        <div className="mx-auto flex h-20 max-w-7xl w-full items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={settings?.logoUrl || logoFallback} alt={settings?.storeName || "Pod & Mais"} className="h-20 w-20 object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-muted/80 px-4 py-2 transition-colors focus-within:border-border focus-within:ring-2 focus-within:ring-ring/25">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Faça sua busca"
                className="w-40 bg-transparent text-sm text-fg-secondary placeholder:text-fg-subtle focus:outline-none lg:w-52"
              />
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-full text-fg-subtle transition-colors hover:bg-background hover:text-fg-secondary"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={handleSearchSubmit} className="text-primary hover:text-primary/80" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              className="rounded-full p-2 text-fg-subtle transition-colors hover:bg-muted hover:text-fg-secondary"
              aria-label="Categorias"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative rounded-full p-2 text-fg-subtle transition-colors hover:bg-muted hover:text-fg-secondary"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <CategoriesMenu open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

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
    </>
  );
};

export default SiteHeader;
