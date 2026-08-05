import { X, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface CategoriesMenuProps {
  open: boolean;
  onClose: () => void;
}

const CategoriesMenu = ({ open, onClose }: CategoriesMenuProps) => {
  const navigate = useNavigate();
  const { selectedCategory, setSelectedCategory, setSelectedNicotineStrength } = useCart();
  const { data: apiCategories = [] } = useCategories();

  const categories = apiCategories.map((cat) => ({
    id: cat.id,
    name: cat.nome.trim(),
    image: cat.imagem || "",
  }));

  if (!open) return null;

  const scrollToProducts = () => {
    requestAnimationFrame(() => {
      const target = document.getElementById("produtos") || document.getElementById("promocoes");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const menuPanel = (
    <aside className="h-full w-[88%] max-w-sm overflow-y-auto bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-5">
        <h2 className="text-2xl font-semibold text-foreground">Categorias</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {categories.map((category) => {
          const isActive = selectedCategory === category.name;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategory(category.name, category.id);
                if (category.name !== "NicSalt") {
                  setSelectedNicotineStrength(null);
                }
                onClose();
                if (window.location.pathname !== "/") {
                  navigate("/#produtos");
                  setTimeout(scrollToProducts, 50);
                  return;
                }
                scrollToProducts();
              }}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors",
                isActive ? "bg-secondary" : "hover:bg-secondary/70",
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden border border-border">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span
                className={cn(
                  "text-lg font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );

  const backdrop = (
    <button
      type="button"
      aria-label="Fechar menu de categorias"
      className="flex-1 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-[75] flex justify-start md:hidden">
        {menuPanel}
        {backdrop}
      </div>

      <div className="fixed inset-0 z-[75] hidden md:flex md:justify-end">
        {backdrop}
        {menuPanel}
      </div>
    </>
  );
};

export default CategoriesMenu;
