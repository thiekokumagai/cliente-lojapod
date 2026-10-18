import { useQuery } from "@tanstack/react-query";
import { getApiHeaders } from "@/services/api";
import type { Product, ProductVariationGroup } from "@/data/products";

interface NewApiProduct {
  id: string;
  title: string;
  categoryId: string;
  description?: string;
  descriptionFormated?: string;
  price?: number;
  promotionalPrice?: number;
  imageUrl?: string;
  isVisible?: boolean;
  category?: { title: string };
  variations?: {
    id: string;
    variation: {
      id: string;
      title: string;
      options: { id: string; value: string }[];
    };
  }[];
  items?: {
    stock: number;
    options: { option: { value: string } }[];
  }[];
  images?: { url: string }[];
  isBestSeller?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
}

function buildImageUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
}

function buildCategoryImageUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
}

function buildVariationGroupsFromNewApi(
  product: NewApiProduct,
): ProductVariationGroup[] {
  if (!product.variations || product.variations.length === 0) return [];

  const variationGroups: ProductVariationGroup[] = [];

  for (const vItem of product.variations) {
    const variation = vItem?.variation;
    if (!variation || !variation.options || variation.options.length === 0) continue;

    const itemsWithOptions =
      product.items?.filter((item) => item.options && item.options.length > 0) || [];

    const hasLinkedItems = itemsWithOptions.length > 0;

    let targetOptions = variation.options;
    if (hasLinkedItems) {
      const filtered = variation.options.filter((opt) =>
        itemsWithOptions.some((item) =>
          item.options.some(
            (o) => o.option?.value === opt.value || o.option?.id === opt.id
          )
        )
      );
      if (filtered.length > 0) {
        targetOptions = filtered;
      }
    }

    const options = targetOptions.map((opt) => {
      if (hasLinkedItems) {
        const matchingItems = itemsWithOptions.filter((item) =>
          item.options.some(
            (o) => o.option?.value === opt.value || o.option?.id === opt.id
          )
        );

        if (matchingItems.length > 0) {
          const totalStock = matchingItems.reduce(
            (sum, item) => sum + (item.stock || 0),
            0
          );
          const available = matchingItems.some((item) => (item.stock || 0) > 0);

          return {
            label: opt.value,
            available,
            stock: totalStock,
          };
        }
      }

      return {
        label: opt.value,
        available: true,
        stock: product.items?.reduce((sum, item) => sum + (item.stock || 0), 0) ?? 999,
      };
    });

    if (options.length > 0) {
      variationGroups.push({
        name: variation.title || "Variação",
        options,
      });
    }
  }

  return variationGroups;
}

export function transformNewApiProduct(
  raw: NewApiProduct,
): Product & { isVisible?: boolean } {
  const variationGroups = buildVariationGroupsFromNewApi(raw);
  const variationGroup = variationGroups[0];

  const totalStock = raw.items?.reduce((acc, item) => acc + (item?.stock || 0), 0) || 0;

  const promoPriceNum = raw.promotionalPrice
    ? Number(raw.promotionalPrice)
    : undefined;
  const priceNum = raw.price ? Number(raw.price) : 0;

  const images = raw.images?.map((img) => buildImageUrl(img.url)) || [];

  return {
    id: raw.id,
    name: raw.title,
    image: buildImageUrl(raw.imageUrl),
    images: images.length > 0 ? images : undefined,
    category: raw.category?.title || raw.categoryId,
    description: raw.description || raw.descriptionFormated || "",
    price: promoPriceNum || priceNum,
    oldPrice: promoPriceNum ? priceNum : undefined,
    isPromo: !!promoPriceNum,
    stock: totalStock,
    variationGroup,
    variationGroups,
    items: raw.items,
    isVisible: raw.isVisible,
    isBestSeller: raw.isBestSeller,
    isFeatured: raw.isFeatured,
    categoryId: raw.categoryId,
    createdAt: raw.createdAt,
  };
}

export function useProducts(categoryId?: string | null) {
  return useQuery({
    queryKey: categoryId
      ? ["api-products-category", categoryId]
      : ["api-products"],
    queryFn: async (): Promise<Product[]> => {
      let url = `${import.meta.env.VITE_ADMIN_API}/store/products?limit=9999`;
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }

      // Buscar produtos convencionais e combos ativos em paralelo
      const [productsRes, combosRes] = await Promise.all([
        fetch(url, { headers: getApiHeaders() }),
        fetch(`${import.meta.env.VITE_ADMIN_API}/store/combos`, { headers: getApiHeaders() }).catch(() => null),
      ]);

      if (!productsRes.ok) throw new Error("Failed to fetch products");
      const data = await productsRes.json();

      // Handle the new paginated wrapper or raw array
      const productList: NewApiProduct[] = Array.isArray(data)
        ? data
        : data.data || [];

      const products = productList.map(transformNewApiProduct);

      const filteredProducts = products.filter((p) => {
        if (p.isVisible === false) return false;

        const groups =
          p.variationGroups && p.variationGroups.length > 0
            ? p.variationGroups
            : p.variationGroup
              ? [p.variationGroup]
              : [];

        if (groups.length === 0) {
          return true;
        }
        return groups.some((g) => g.options.some((o) => o.available));
      });

      // Mapear combos retornados para o catálogo da loja
      let comboProducts: Product[] = [];
      if (combosRes && combosRes.ok) {
        try {
          const rawCombos = await combosRes.json();
          if (Array.isArray(rawCombos)) {
            comboProducts = rawCombos
              .filter((c: any) => {
                if (categoryId && c.categoryId !== categoryId) return false;
                return true;
              })
              .map((c: any) => {
                const img = buildImageUrl(c.imageUrl);
                return {
                  id: c.id,
                  comboId: c.id,
                  isCombo: true,
                  name: c.name,
                  image: img,
                  images: img ? [img] : [],
                  category: c.categoryTitle || "Combos",
                  categoryId: c.categoryId,
                  description: c.description || "",
                  price: Number(c.price),
                  oldPrice: c.originalPrice > c.price ? Number(c.originalPrice) : undefined,
                  isPromo: c.originalPrice > c.price,
                  isFeatured: true,
                  stock: c.stock ?? 0,
                  maxPerOrder: c.maxPerOrder,
                  discountPercentage: c.discountPercentage,
                  createdAt: c.createdAt,
                  comboItems: (c.items || []).map((ci: any) => ({
                    productId: ci.productId,
                    productItemId: ci.productItemId,
                    productName: ci.productName,
                    productPrice: ci.productPrice,
                    productImage: ci.productImage ? buildImageUrl(ci.productImage) : null,
                    quantity: ci.quantity,
                    variation: ci.variation,
                    componentProduct: ci.product ? transformNewApiProduct(ci.product) : undefined,
                  })),
                };
              });
          }
        } catch (e) {
          console.error("Erro ao processar combos na loja:", e);
        }
      }

      // Combos aparecem em destaque no topo da listagem
      return [...comboProducts, ...filteredProducts];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ["api-product", id],
    queryFn: async (): Promise<Product | null> => {
      if (!id) return null;

      // 1. Tentar buscar como produto convencional
      try {
        const response = await fetch(
          `${import.meta.env.VITE_ADMIN_API}/store/products/${id}`,
          {
            headers: getApiHeaders(),
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data) return transformNewApiProduct(data);
        }
      } catch (err) {
        // Fallback para combo
      }

      // 2. Se não encontrar em products, tentar buscar em combos
      try {
        const comboRes = await fetch(
          `${import.meta.env.VITE_ADMIN_API}/store/combos/${id}`,
          {
            headers: getApiHeaders(),
          },
        );
        if (comboRes.ok) {
          const c = await comboRes.json();
          if (c) {
            const img = buildImageUrl(c.imageUrl);
            return {
              id: c.id,
              comboId: c.id,
              isCombo: true,
              name: c.name,
              image: img,
              images: img ? [img] : [],
              category: c.categoryTitle || "Combos",
              categoryId: c.categoryId,
              description: c.description || "",
              price: Number(c.price),
              oldPrice: c.originalPrice > c.price ? Number(c.originalPrice) : undefined,
              isPromo: c.originalPrice > c.price,
              isFeatured: true,
              stock: c.stock ?? 99,
              maxPerOrder: c.maxPerOrder,
              discountPercentage: c.discountPercentage,
              createdAt: c.createdAt,
              comboItems: (c.items || []).map((ci: any) => ({
                productId: ci.productId,
                productItemId: ci.productItemId,
                productName: ci.productName,
                productPrice: ci.productPrice,
                productImage: ci.productImage ? buildImageUrl(ci.productImage) : null,
                quantity: ci.quantity,
                variation: ci.variation,
                componentProduct: ci.product ? transformNewApiProduct(ci.product) : undefined,
              })),
            };
          }
        }
      } catch (err) {
        console.error("Erro ao buscar combo por ID:", err);
      }

      throw new Error("Failed to fetch product or combo");
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["api-categories"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_ADMIN_API}/store/categories`,
        {
          headers: getApiHeaders(),
        },
      );
      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();

      return data.map((c: any) => ({
        id: c.id,
        nome: c.title,
        imagem: buildCategoryImageUrl(c.image),
        oldUrl: c.oldUrl,
        produtosAtivos: 0,
      }));
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
