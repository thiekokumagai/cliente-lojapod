import { Product } from "@/data/products";

export interface CategoryInfo {
  id?: string;
  nome: string;
}

export function sortProducts(
  products: Product[],
  sortOption: string,
  categories?: CategoryInfo[]
): Product[] {
  // Mapa com o índice de cada categoria na ordem do menu/cadastro
  const categoryOrderMap = new Map<string, number>();
  if (categories && categories.length > 0) {
    categories.forEach((cat, index) => {
      if (cat.id) categoryOrderMap.set(cat.id.toLowerCase(), index);
      if (cat.nome) categoryOrderMap.set(cat.nome.trim().toLowerCase(), index);
    });
  }

  return [...products].sort((a, b) => {
    if (sortOption === "a-z") {
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    }
    if (sortOption === "z-a") {
      return b.name.localeCompare(a.name, "pt-BR", { sensitivity: "base" });
    }
    if (sortOption === "lowest-price") {
      const diff = (a.price || 0) - (b.price || 0);
      if (diff !== 0) return diff;
    }
    if (sortOption === "highest-price") {
      const diff = (b.price || 0) - (a.price || 0);
      if (diff !== 0) return diff;
    }
    if (sortOption === "category") {
      const orderA =
        (a.categoryId && categoryOrderMap.get(a.categoryId.toLowerCase())) ??
        (a.category && categoryOrderMap.get(a.category.trim().toLowerCase())) ??
        999999;
      const orderB =
        (b.categoryId && categoryOrderMap.get(b.categoryId.toLowerCase())) ??
        (b.category && categoryOrderMap.get(b.category.trim().toLowerCase())) ??
        999999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Se estiverem na mesma categoria ou ambas não encontradas, ordena pelo nome da categoria
      const catCompare = (a.category || "").localeCompare(b.category || "", "pt-BR", { sensitivity: "base" });
      if (catCompare !== 0) return catCompare;
    }
    if (sortOption === "default") {
      // 1. Mais Vendidos (isBestSeller) no topo
      if (a.isBestSeller && !b.isBestSeller) return -1;
      if (!a.isBestSeller && b.isBestSeller) return 1;

      // 2. Quantidade total vendida (totalSold) decrescente
      const soldA = a.totalSold || 0;
      const soldB = b.totalSold || 0;
      if (soldB !== soldA) return soldB - soldA;

      // 3. Critério de desempate: mais recentes primeiro
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return 0;
    }

    if (sortOption === "newest") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
    }

    // Critério de desempate padrão para as demais ordenações (preço, categoria, etc.)
    if (a.isBestSeller && !b.isBestSeller) return -1;
    if (!a.isBestSeller && b.isBestSeller) return 1;

    const soldA = a.totalSold || 0;
    const soldB = b.totalSold || 0;
    if (soldB !== soldA) return soldB - soldA;

    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;

    return 0;
  });
}
