import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import type { Product, SelectedProduct, ComboComponentSelection } from "@/data/products";
import { trackEvent } from "@/components/FacebookPixel";
import { syncCartAnalytics } from "@/services/analytics";
import { getReservedStockInCart, getProductAvailableStock } from "@/utils/cart-stock";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: string;
  comboSelections?: ComboComponentSelection[];
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
  selectedVariationFilters: string[];
  setSelectedNicotineStrength: (strength: string | string[] | null) => void;
  toggleVariationFilter: (option: string, groupOptions?: string[]) => void;
  clearVariationFilters: (groupOptions?: string[]) => void;
  sortOption: string;
  setSortOption: (sort: string) => void;
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

  return { product: item, selectedVariation: undefined, comboSelections: undefined };
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedVariationFilters, setSelectedVariationFilters] = useState<string[]>([]);

  const setSelectedCategory = useCallback((category: string | null, categoryId?: string | null) => {
    setSelectedCategoryState(category);
    setSelectedCategoryId(categoryId ?? null);
    setSelectedVariationFilters([]);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");

  const selectedNicotineStrength = useMemo(() => {
    return selectedVariationFilters.length > 0 ? selectedVariationFilters[0] : null;
  }, [selectedVariationFilters]);

  const setSelectedNicotineStrength = useCallback((strength: string | string[] | null) => {
    if (strength === null) {
      setSelectedVariationFilters([]);
    } else if (Array.isArray(strength)) {
      setSelectedVariationFilters(strength);
    } else {
      setSelectedVariationFilters([strength]);
    }
  }, []);

  const toggleVariationFilter = useCallback((option: string, groupOptions?: string[]) => {
    setSelectedVariationFilters((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      } else {
        const filtered = groupOptions ? prev.filter((o) => !groupOptions.includes(o)) : prev;
        return [...filtered, option];
      }
    });
  }, []);

  const clearVariationFilters = useCallback((groupOptions?: string[]) => {
    if (!groupOptions || groupOptions.length === 0) {
      setSelectedVariationFilters([]);
    } else {
      setSelectedVariationFilters((prev) => prev.filter((o) => !groupOptions.includes(o)));
    }
  }, []);

  const [sortOption, setSortOption] = useState<string>("newest");
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
      comboSelections: normalizedItem.comboSelections,
    });

    setShowAddedModal(false);
  }, []);

  const addToCart = useCallback((item: Product | SelectedProduct) => {
    const normalizedItem = normalizeItem(item);

    setItems((prev) => {
      const isFirstProduct = prev.length === 0;

      // Para combos com variações de componentes diferentes, cada combinação é tratada como item único no carrinho
      const getComboKey = (ci: CartItem | typeof normalizedItem) => {
        if (!ci.comboSelections || ci.comboSelections.length === 0) return "";
        return ci.comboSelections
          .map((s) => `${s.productId}:${s.productItemId || s.variation || ""}`)
          .sort()
          .join("|");
      };

      const normalizedComboKey = getComboKey(normalizedItem);

      // Validação de estoque considerando a demanda acumulada (itens avulsos + componentes de combos)
      if (normalizedItem.product.isCombo) {
        const comboComponents = normalizedItem.product.comboItems || [];
        for (const ci of comboComponents) {
          const chosen = normalizedItem.comboSelections?.find((cs) => cs.productId === ci.productId);
          const compVar = ci.variation || chosen?.variation;
          const currentReserved = getReservedStockInCart(prev, ci.productId, compVar);
          const needed = (ci.quantity || 1);
          const compStock = ci.componentProduct
            ? getProductAvailableStock(ci.componentProduct, compVar)
            : null;

          if (compStock !== null && currentReserved + needed > compStock) {
            // Estoque insuficiente para este componente do combo
            return prev;
          }
        }
      } else {
        const currentReserved = getReservedStockInCart(
          prev,
          normalizedItem.product.id,
          normalizedItem.selectedVariation
        );
        const availableStock = getProductAvailableStock(
          normalizedItem.product,
          normalizedItem.selectedVariation
        );

        if (availableStock !== null && currentReserved + 1 > availableStock) {
          // Estoque acumulado insuficiente (já consumido avulso ou em combos)
          return prev;
        }
      }

      const existing = prev.find((cartItem) => {
        if (cartItem.product.id !== normalizedItem.product.id) return false;
        if (cartItem.selectedVariation !== normalizedItem.selectedVariation) return false;
        if (normalizedComboKey || getComboKey(cartItem)) {
          return getComboKey(cartItem) === normalizedComboKey;
        }
        return true;
      });

      const nextItems = existing
        ? prev.map((cartItem) => {
            const matches =
              cartItem.product.id === normalizedItem.product.id &&
              cartItem.selectedVariation === normalizedItem.selectedVariation &&
              (normalizedComboKey ? getComboKey(cartItem) === normalizedComboKey : true);

            return matches ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem;
          })
        : [
            ...prev,
            {
              product: normalizedItem.product,
              quantity: 1,
              selectedVariation: normalizedItem.selectedVariation,
              comboSelections: normalizedItem.comboSelections,
            },
          ];

      setLastAdded({
        product: normalizedItem.product,
        quantity: 1,
        selectedVariation: normalizedItem.selectedVariation,
        comboSelections: normalizedItem.comboSelections,
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

    setItems((prev) => {
      const targetIndex = prev.findIndex(
        (item) => item.product.id === productId && item.selectedVariation === selectedVariation
      );
      if (targetIndex === -1) return prev;

      const item = prev[targetIndex];
      let finalQuantity = quantity;

      if (item.product.isCombo) {
        const comboComponents = item.product.comboItems || [];
        for (const ci of comboComponents) {
          const chosen = item.comboSelections?.find((cs) => cs.productId === ci.productId);
          const compVar = ci.variation || chosen?.variation;
          const reservedOther = getReservedStockInCart(prev, ci.productId, compVar, targetIndex);
          const compStock = ci.componentProduct
            ? getProductAvailableStock(ci.componentProduct, compVar)
            : null;

          if (compStock !== null) {
            const maxAllowedForComp = Math.floor(
              Math.max(0, compStock - reservedOther) / (ci.quantity || 1)
            );
            if (finalQuantity > maxAllowedForComp) {
              finalQuantity = maxAllowedForComp;
            }
          }
        }
      } else {
        const reservedOther = getReservedStockInCart(
          prev,
          item.product.id,
          item.selectedVariation,
          targetIndex
        );
        const availableStock = getProductAvailableStock(
          item.product,
          item.selectedVariation
        );

        if (availableStock !== null) {
          const maxAllowed = Math.max(0, availableStock - reservedOther);
          if (finalQuantity > maxAllowed) {
            finalQuantity = maxAllowed;
          }
        }
      }

      if (finalQuantity <= 0) {
        return prev.filter((_, idx) => idx !== targetIndex);
      }

      return prev.map((it, idx) => (idx === targetIndex ? { ...it, quantity: finalQuantity } : it));
    });
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
        selectedVariationFilters,
        setSelectedNicotineStrength,
        toggleVariationFilter,
        clearVariationFilters,
        sortOption,
        setSortOption,
        orders,
        addOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
