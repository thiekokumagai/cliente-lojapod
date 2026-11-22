import { api } from "./api";

export interface OrderBumpProductOption {
  option: {
    id: string;
    value: string;
    variation?: {
      id: string;
      title: string;
    };
  };
}

export interface OrderBumpProductItem {
  id: string;
  stock: number;
  options?: OrderBumpProductOption[];
}

export interface OrderBumpSuggestion {
  bumpId: string;
  sectionTitle: string;
  triggerType?: "ALL" | "CATEGORY" | "PRODUCT";
  triggerProductId?: string | null;
  triggerProductIds?: string[];
  triggerCategoryId?: string | null;
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice: number;
    hasDiscount: boolean;
    discountPercent?: number | null;
    imageUrl?: string | null;
    /** Descrição curta do produto (ex.: "Lata 310ml"), quando a loja cadastrou. */
    description?: string | null;
    totalStock: number;
    hasVariations: boolean;
    items?: OrderBumpProductItem[];
  };
}

/** Onde o cliente está vendo as ofertas: na sacola ou dentro da tela do produto. */
export type OrderBumpLocation = "CART" | "PRODUCT";

export const orderBumpsService = {
  async getSuggestions(
    productIds: string[],
    location: OrderBumpLocation = "CART",
  ): Promise<OrderBumpSuggestion[]> {
    if (!productIds || productIds.length === 0) return [];
    return api.post<OrderBumpSuggestion[]>("/store/order-bumps/suggestions", {
      productIds,
      location,
    });
  },
};
