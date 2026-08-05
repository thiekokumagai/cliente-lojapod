import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Product, SelectedProduct } from "@/data/products";
import { trackEvent } from "@/components/FacebookPixel";
import { syncCartAnalytics } from "@/services/analytics";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: string;
}

export interface SavedOrder {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: "pix" | "debito" | "credito" | "dinheiro";
  deliveryFee: number;
  subtotal: number;
  total: number;
  items: CartItem[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Product | SelectedProduct) => void;
  removeFromCart: (productId: string, selectedVariation?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedVariation?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAdded: CartItem | null;
  showAddedModal: boolean;
  setShowAddedModal: (show: boolean) => void;
  triggerAddedModal: (item: Product | SelectedProduct) => void;
  selectedCategory: string | null;
  selectedCategoryId: string | null;
  setSelectedCategory: (category: string | null, categoryId?: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedNicotineStrength: string | null;
  setSelectedNicotineStrength: (strength: string | null) => void;
  orders: SavedOrder[];
  addOrder: (order: SavedOrder) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const ORDERS_STORAGE_KEY = "podemais-orders";

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

const normalizeItem = (item: Product | SelectedProduct) => {
  if ("product" in item) {
    return item;
  }

  return { product: item };
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const setSelectedCategory = useCallback((category: string | null, categoryId?: string | null) => {
    setSelectedCategoryState(category);
    setSelectedCategoryId(categoryId ?? null);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNicotineStrength, setSelectedNicotineStrength] = useState<string | null>(null);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const addedModalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!storedOrders) {
      setOrders([]);
      return;
    }

    try {
      const parsedOrders = JSON.parse(storedOrders) as SavedOrder[];
      setOrders(parsedOrders);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (addedModalTimeoutRef.current) {
        clearTimeout(addedModalTimeoutRef.current);
      }
    };
  }, []);

  const triggerAddedModal = useCallback((item: Product | SelectedProduct) => {
    const normalizedItem = normalizeItem(item);

    setLastAdded({
      product: normalizedItem.product,
      quantity: 1,
      selectedVariation: normalizedItem.selectedVariation,
    });

    setShowAddedModal(false);
  }, []);

  const addToCart = useCallback((item: Product | SelectedProduct) => {
    const normalizedItem = normalizeItem(item);

    setItems((prev) => {
      const isFirstProduct = prev.length === 0;
      const existing = prev.find(
        (cartItem) =>
          cartItem.product.id === normalizedItem.product.id &&
          cartItem.selectedVariation === normalizedItem.selectedVariation
      );

      if (existing) {
        if (normalizedItem.selectedVariation && normalizedItem.product.variationGroup) {
          const opt = normalizedItem.product.variationGroup.options.find(o => o.label === normalizedItem.selectedVariation);
          if (opt?.stock !== undefined && existing.quantity >= opt.stock) return prev;
        } else if (normalizedItem.product.stock !== undefined && existing.quantity >= normalizedItem.product.stock) {
          return prev;
        }
      } else {
        if (normalizedItem.selectedVariation && normalizedItem.product.variationGroup) {
          const opt = normalizedItem.product.variationGroup.options.find(o => o.label === normalizedItem.selectedVariation);
          if (opt?.stock !== undefined && opt.stock < 1) return prev;
        } else if (normalizedItem.product.stock !== undefined && normalizedItem.product.stock < 1) {
          return prev;
        }
      }

      const nextItems = existing
        ? prev.map((cartItem) =>
            cartItem.product.id === normalizedItem.product.id &&
            cartItem.selectedVariation === normalizedItem.selectedVariation
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          )
        : [
            ...prev,
            {
              product: normalizedItem.product,
              quantity: 1,
              selectedVariation: normalizedItem.selectedVariation,
            },
          ];

      setLastAdded({
        product: normalizedItem.product,
        quantity: 1,
        selectedVariation: normalizedItem.selectedVariation,
      });

      trackEvent('AddToCart', {
        content_ids: [normalizedItem.product.id],
        content_name: normalizedItem.product.name,
        currency: 'BRL',
        value: normalizedItem.product.price
      });

      setShowAddedModal(false);

      if (isFirstProduct && typeof window !== "undefined" && window.innerWidth >= 768) {
        setIsCartOpen(true);
      }

      return nextItems;
    });
  }, []);

  const removeFromCart = useCallback((productId: string, selectedVariation?: string) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && item.selectedVariation === selectedVariation)
      )
    );
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, selectedVariation?: string) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && item.selectedVariation === selectedVariation)
        )
      );
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.selectedVariation === selectedVariation) {
          let finalQuantity = quantity;
          if (selectedVariation && item.product.variationGroup) {
            const opt = item.product.variationGroup.options.find(o => o.label === selectedVariation);
            if (opt?.stock !== undefined && finalQuantity > opt.stock) {
              finalQuantity = opt.stock;
            }
          } else if (item.product.stock !== undefined && finalQuantity > item.product.stock) {
            finalQuantity = item.product.stock;
          }
          return { ...item, quantity: finalQuantity };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    if (addedModalTimeoutRef.current) {
      clearTimeout(addedModalTimeoutRef.current);
      addedModalTimeoutRef.current = null;
    }
    setShowAddedModal(false);
    setItems([]);
  }, []);

  const addOrder = useCallback((order: SavedOrder) => {
    setOrders((prev) => {
      const nextOrders = [order, ...prev];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
      return nextOrders;
    });
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    syncCartAnalytics(items, totalPrice);
  }, [items, totalPrice]);


  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        lastAdded,
        showAddedModal,
        setShowAddedModal,
        triggerAddedModal,
        selectedCategory,
        selectedCategoryId,
        setSelectedCategory,
        searchTerm,
        setSearchTerm,
        selectedNicotineStrength,
        setSelectedNicotineStrength,
        orders,
        addOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
