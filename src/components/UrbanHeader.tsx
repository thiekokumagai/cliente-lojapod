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
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          {/* Linha Superior: Logo à esquerda, Frete (desktop) + Botões Menu e Carrinho à direita */}
          <div className="flex items-center justify-between gap-3">
            {/* Logo da Loja */}
            <div className="flex items-center shrink-0">
              <a href="/" className="flex items-center gap-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="h-14 sm:h-16 w-auto object-contain max-w-[200px] sm:max-w-[260px]"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                    {storeName}
                  </span>
                )}
              </a>
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

              {/* Botão Menu */}
              {onOpenCategoriesMenu && (
                <button
                  type="button"
                  onClick={onOpenCategoriesMenu}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/40 text-sm font-semibold text-white transition-colors"
                >
                  <Menu className="h-4 w-4" />
                  <span>Menu</span>
                </button>
              )}

              {/* Botão Carrinho / Sacola com contador */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/40 text-sm font-semibold text-white transition-colors"
              >
                <ShoppingBag className="h-4 w-4 text-zinc-300" />
                <span className="font-semibold text-sm">{totalItems}</span>
              </button>
            </div>
          </div>

          {/* Linha Inferior: Campo de Busca com cantos arredondados escuro */}
          <div className="mt-3 w-full">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar no cardápio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#1e1e1e] pl-11 pr-10 text-sm text-white placeholder-zinc-400 border border-zinc-700/50 focus:border-zinc-500 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
