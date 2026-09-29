import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useProducts";
import { Sparkles, Grid, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UrbanSidebar() {
  const { selectedCategory, setSelectedCategory, setSelectedNicotineStrength } = useCart();
  const { data: apiCategories = [] } = useCategories();

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

    if (categoryName) {
      const element = document.getElementById(`categoria-${categoryName}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-1 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Categorias
        </div>

        {/* Opção "Todas" */}
        <button
          type="button"
          onClick={() => handleSelectCategory(null)}
          className={cn(
            "w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
            !selectedCategory
              ? "text-white shadow-xs"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          )}
          style={!selectedCategory ? { backgroundColor: "var(--primary-custom, #09090b)" } : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Grid className="h-4 w-4 shrink-0" />
            <span className="truncate">Todas as Categorias</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
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
                "w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left group",
                isSelected
                  ? "text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
              style={isSelected ? { backgroundColor: "var(--primary-custom, #09090b)" } : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {hasImage ? (
                  <img
                    src={cat.imagem}
                    alt={cat.nome}
                    className="w-5 h-5 object-cover rounded-md shrink-0"
                  />
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                )}
                <span className="truncate">{cat.nome.trim()}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
