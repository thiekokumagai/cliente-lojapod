export interface ProductVariationOption {
  label: string;
  available: boolean;
  stock?: number;
}

export interface ProductVariationGroup {
  name: string;
  options: ProductVariationOption[];
}

export interface Product {
  id: string;
  name: string;
  image: string;
  images?: string[];
  category: string;
  description: string;
  price: number;
  oldPrice?: number;
  isPromo?: boolean;
  stock?: number;
  variationGroup?: ProductVariationGroup;
  isBestSeller?: boolean;
  categoryId?: string;
  createdAt?: string;
}

export interface SelectedProduct {
  product: Product;
  selectedVariation?: string;
}
