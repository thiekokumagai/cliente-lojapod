import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

const NicotineFilter = () => {
  const {
    selectedCategory,
    selectedCategoryId,
    selectedVariationFilters,
    toggleVariationFilter,
    clearVariationFilters,
  } = useCart();

  const { data: allProducts = [] } = useProducts(selectedCategoryId);

  const variationGroupSections = useMemo(() => {
    if (!selectedCategory) return [];

    const targetProducts = allProducts.filter(
      (product) =>
        product.category === selectedCategory ||
        (selectedCategoryId && product.categoryId === selectedCategoryId)
    );

    const groupMap = new Map<string, Set<string>>();

    targetProducts.forEach((product) => {
      const groups =
        product.variationGroups && product.variationGroups.length > 0
          ? product.variationGroups
          : product.variationGroup
            ? [product.variationGroup]
            : [];

      groups.forEach((group) => {
        const groupName = group.name || "Variação";
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, new Set<string>());
        }
        const optionSet = groupMap.get(groupName)!;

        group.options?.forEach((option) => {
          if (option.available) {
            optionSet.add(option.label);
          }
        });
      });
    });

    const result: { name: string; options: string[] }[] = [];

    groupMap.forEach((optionSet, groupName) => {
      const sortedOptions = Array.from(optionSet).sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true })
      );
      if (sortedOptions.length > 0) {
        result.push({ name: groupName, options: sortedOptions });
      }
    });

    return result;
  }, [allProducts, selectedCategory, selectedCategoryId]);

  if (variationGroupSections.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-4">
        {variationGroupSections.map((section) => {
          const hasSectionSelection = section.options.some((opt) =>
            selectedVariationFilters.includes(opt)
          );

          return (
            <div key={section.name} className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {section.name}:
              </span>
              <button
                type="button"
                onClick={() => clearVariationFilters(section.options)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  !hasSectionSelection
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                )}
              >
                Todos
              </button>

              {section.options.map((option) => {
                const isSelected = selectedVariationFilters.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleVariationFilter(option, section.options)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NicotineFilter;
