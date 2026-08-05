import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

const NicotineFilter = () => {
  const {
    selectedCategory,
    selectedNicotineStrength,
    setSelectedNicotineStrength,
  } = useCart();

  const { data: allProducts = [] } = useProducts();

  const options = useMemo(() => {
    const strengths = new Set<string>();

    allProducts
      .filter((product) => product.category === "NicSalt")
      .forEach((product) => {
        product.variationGroup?.options.forEach((option) => {
          if (option.available) {
            strengths.add(option.label);
          }
        });
      });

    return Array.from(strengths).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true })
    );
  }, [allProducts]);

  if (selectedCategory !== "NicSalt" || options.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Teor de nicotina:</span>
          <button
            type="button"
            onClick={() => setSelectedNicotineStrength(null)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              selectedNicotineStrength === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-secondary"
            )}
          >
            Todos
          </button>

          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedNicotineStrength(option)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                selectedNicotineStrength === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NicotineFilter;
