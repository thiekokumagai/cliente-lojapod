import { Search, X, ShoppingBag, Menu, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import StoreHoursTopBar from "./StoreHoursTopBar";

interface UrbanHeaderProps {
  onOpenCategoriesMenu?: () => void;
}

export default function UrbanHeader({ onOpenCategoriesMenu }: UrbanHeaderProps) {
  const { totalItems, setIsCartOpen, searchTerm, setSearchTerm } = useCart();
  const { data: settings } = useStoreSettings();

  const isNoFee = settings?.deliveryType === "NO_FEE" || Boolean(settings?.freeShippingEnabled);
  const isFixedFee = settings?.deliveryType === "FIXED_FEE";
  const fixedFeeValue = settings?.deliveryFixedFee;

  const logoUrl = settings?.whiteLogoUrl || settings?.logoUrl;
  const storeName = settings?.storeName || "Urban";

  return (
    <div className="sticky top-0 z-40 w-full">
      <StoreHoursTopBar />
      <header className="w-full bg-[#0a0a0a] text-white shadow-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo da Loja */}
          <div className="flex items-center shrink-0">
            <a href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-9 sm:h-12 w-auto object-contain max-w-[140px] sm:max-w-[180px]"
                />
              ) : (
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  {storeName}
                </span>
              )}
            </a>
          </div>

          {/* Campo de Busca Centralizado */}
          <div className="flex-1 max-w-2xl mx-2 sm:mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar no cardápio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-full bg-zinc-800/90 pl-10 pr-9 text-xs sm:text-sm text-white placeholder-zinc-400 border border-zinc-700/60 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Frete Grátis / Taxa Fixa Badge (Desktop) */}
            {isNoFee && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-zinc-200">
                <Truck className="h-3.5 w-3.5 text-zinc-300" />
                <span>Frete grátis</span>
              </div>
            )}
            {isFixedFee && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-zinc-200">
                <Truck className="h-3.5 w-3.5 text-zinc-300" />
                <span>Taxa fixa{fixedFeeValue ? `: R$ ${Number(fixedFeeValue).toFixed(2).replace('.', ',')}` : ''}</span>
              </div>
            )}

            {/* Botão Menu (Mobile) */}
            {onOpenCategoriesMenu && (
              <button
                type="button"
                onClick={onOpenCategoriesMenu}
                className="flex md:hidden items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
              >
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </button>
            )}

            {/* Botão Ver Carrinho (Desktop & Mobile) */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-white font-semibold text-xs sm:text-sm transition-all border border-white/10 shadow-xs hover:opacity-90"
              style={{ backgroundColor: "var(--primary-custom, #27272a)" }}
            >
              <ShoppingBag className="h-4 w-4 text-white" />
              <span className="hidden sm:inline">Ver Carrinho</span>
              <span
                className="font-bold text-[11px] px-2 py-0.5 rounded-full min-w-[20px] text-center bg-white"
                style={{ color: "var(--primary-custom, #000000)" }}
              >
                {totalItems}
              </span>
            </button>

          </div>

        </div>
      </div>
    </header>
    </div>
  );
}
