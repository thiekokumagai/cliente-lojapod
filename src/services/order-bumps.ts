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
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice: number;
    hasDiscount: boolean;
    discountPercent?: number | null;
    imageUrl?: string | null;
    totalStock: number;
    hasVariations: boolean;
    items?: OrderBumpProductItem[];
  };
}

export const orderBumpsService = {
  async getSuggestions(productIds: string[]): Promise<OrderBumpSuggestion[]> {
    if (!productIds || productIds.length === 0) return [];
    return api.post<OrderBumpSuggestion[]>("/store/order-bumps/suggestions", {
      productIds,
    });
  },
};
