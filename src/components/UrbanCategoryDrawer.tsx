import { X, Sparkles, Grid, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { cn } from "@/lib/utils";

interface UrbanCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UrbanCategoryDrawer({ isOpen, onClose }: UrbanCategoryDrawerProps) {
  const { selectedCategory, setSelectedCategory, setSelectedNicotineStrength } = useCart();
  const { data: apiCategories = [] } = useCategories();
  const { data: settings } = useStoreSettings();

  if (!isOpen) return null;

  const handleSelectCategory = (categoryName: string | null, categoryId?: string) => {
    if (categoryName === selectedCategory) {
      setSelectedCategory(null);
    } else {
      if (categoryName && categoryId) {
        setSelectedCategory(categoryName, categoryId);
      } else {
        setSelectedCategory(null);
      }
    }
    setSelectedNicotineStrength(null);
    onClose();

    if (categoryName) {
      setTimeout(() => {
        const element = document.getElementById(`categoria-${categoryName}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const whatsappPhone = settings?.phone ? settings.phone.replace(/\D/g, "") : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Overlay Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Box */}
      <div className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Handle bar */}
        <div className="w-full flex justify-center py-2.5 bg-white">
          <div className="w-12 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Categorias
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2 py-2">
          
          <button
            type="button"
            onClick={() => handleSelectCategory(null)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left font-bold text-sm transition-colors",
              !selectedCategory ? "text-white" : "text-slate-800 hover:bg-slate-50"
            )}
            style={!selectedCategory ? { backgroundColor: "var(--primary-custom, #09090b)" } : undefined}
          >
            <div className="flex items-center gap-3">
              <Grid className="h-5 w-5" />
              <span>Todas as Categorias</span>
            </div>
          </button>

          {apiCategories.map((cat, idx) => {
            const isSelected = selectedCategory === cat.nome.trim();
            const hasImage = Boolean(cat.imagem);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.nome.trim(), cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left font-bold text-sm transition-colors",
                  isSelected ? "text-white" : "text-slate-800 hover:bg-slate-50"
                )}
                style={isSelected ? { backgroundColor: "var(--primary-custom, #09090b)" } : undefined}
              >
                <div className="flex items-center gap-3">
                  {hasImage ? (
                    <img
                      src={cat.imagem}
                      alt={cat.nome}
                      className="w-6 h-6 object-cover rounded-md shrink-0"
                    />
                  ) : (
                    <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate">{cat.nome.trim()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
