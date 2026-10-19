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

export interface ComboItemComponent {
  productId: string;
  productItemId?: string | null;
  productName: string;
  productPrice: number;
  productImage?: string | null;
  quantity: number;
  variation?: string | null;
  componentProduct?: Product; // Detalhes completos do produto do componente (para variações no modal)
}

export interface ComboComponentSelection {
  productId: string;
  productItemId?: string;
  variation?: string;
  productName?: string;
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
  isFeatured?: boolean;
  stock?: number;
  variationGroup?: ProductVariationGroup;
  variationGroups?: ProductVariationGroup[];
  items?: ProductItem[];
  isBestSeller?: boolean;
  categoryId?: string;
  createdAt?: string;

  // Campos de Combo
  isCombo?: boolean;
  comboId?: string;
  comboItems?: ComboItemComponent[];
  maxPerOrder?: number | null;
  discountPercentage?: number;
  totalSold?: number;
}

export interface SelectedProduct {
  product: Product;
  selectedVariation?: string;
  comboSelections?: ComboComponentSelection[];
}

