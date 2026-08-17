export interface ProductVariationOption {
  label: string;
  available: boolean;
  stock?: number;
}

export interface ProductVariationGroup {
  name: string;
  options: ProductVariationOption[];
}

export interface ProductItemOption {
  option: { id?: string; value: string };
}

export interface ProductItem {
  stock: number;
  options: ProductItemOption[];
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
  variationGroups?: ProductVariationGroup[];
  items?: ProductItem[];
  isBestSeller?: boolean;
  categoryId?: string;
  createdAt?: string;
}

export interface SelectedProduct {
  product: Product;
  selectedVariation?: string;
}
