import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  MapPin,
  Pencil,
  ChevronLeft,
  Check,
  User,
  Phone,
  Ticket,
  ChevronRight,
  Loader2,
  CreditCard,
  Wallet,
  Receipt,
  Store,
  Copy,
  MessageCircle,
  Clock,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useFreight } from "@/hooks/use-calculator-freight";
import { formatFreightDestinationAddress } from "@/utils/freight-address";
import { ordersService } from "@/services/orders";
import { useStoreSettings } from "@/hooks/useStoreSettings";


import AddressSearch, { type StructuredAddress } from "@/components/checkout/AddressSearch";
import SavedAddressesList from "@/components/checkout/SavedAddressesList";
import CartItemImage from "@/components/CartItemImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { trackEvent, trackCustomEvent } from "@/components/FacebookPixel";

const SESSION_ADDRESS_KEY = "podemais-checkout-address";
const SESSION_ADDRESSES_KEY = "podemais-checkout-addresses";
const SESSION_NAME_KEY = "podemais-checkout-name";
const SESSION_PHONE_KEY = "podemais-checkout-phone";
const PIX_KEY = "(67) 99213-0201";
const PIX_HOLDER = "Wesley Thieko de Aguiar Kumagai";

const unmaskPixKey = (key: string, keyType?: string | null) => {
  if (!key) return "";
  const typeUpper = (keyType || "").toUpperCase();
  if (typeUpper === "CELULAR" || typeUpper === "TELEFONE" || typeUpper === "CPF" || typeUpper === "CNPJ" || typeUpper === "PHONE") {
    return key.replace(/\D/g, "");
  }
  if (/^[\d()\s.-]+$/.test(key.trim())) {
    return key.replace(/\D/g, "");
  }
  return key;
};

const pixKeyTypeTranslations: Record<string, string> = {
  PHONE: "Celular",
  CELULAR: "Celular",
  TELEFONE: "Celular",
  EMAIL: "E-mail",
  E_MAIL: "E-mail",
  CPF: "CPF",
  CNPJ: "CNPJ",
  RANDOM: "Chave Aleatória",
  EVP: "Chave Aleatória",
  ALEATORIA: "Chave Aleatória",
};

const translatePixKeyType = (type?: string | null) => {
  if (!type) return "Celular";
  const upper = type.toUpperCase();
  return pixKeyTypeTranslations[upper] || type;
};


const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

type PaymentMethod = "PIX" | "Cartão de Débito" | "Cartão de Crédito" | "Dinheiro";
type CheckoutStep = "cart" | "delivery" | "payment" | "confirmation";
type CreditMode = "avista" | "parcelado";

type FinalizedOrder = {
  id: string;
  orderNumber: number;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderNote: string;
  paymentMethod: PaymentMethod;
  paymentLabel: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
  pixDiscount: number;
  creditMode: CreditMode;
  creditInstallments: number;
  creditInterest: number;
  savedCouponCode: string;
  needsChange: string;
  changeFor: string;
  estimatedTimeStr?: string | null;
  items: Array<{
    product: {
      id: string;
      name: string;
      image: string;
      price: number;
      variationGroup?: { name: string; options: { label: string; available: boolean }[] };
    };
    quantity: number;
    selectedVariation?: string;
  }>;
};

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: "cart", label: "Sacola" },
  { key: "delivery", label: "Entrega" },
  { key: "payment", label: "Pagamento" },
  { key: "confirmation", label: "Revisão" },
];

const StepIndicator = ({ currentStep }: { currentStep: CheckoutStep }) => {

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between px-5 py-3">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {index > 0 && (
              <div className={`mx-1 h-0.5 w-5 sm:w-10 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isDone || isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span className={`text-[10px] font-medium ${isActive || isDone ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CartSidebar = () => {
  const { data: storeSettings } = useStoreSettings();
  const { calculate } = useFreight();
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    totalPrice,
    totalItems,
    addOrder,
    clearCart,
  } = useCart();



  const hasPromoItems = useMemo(() => items.some((item) => item.product.isPromo), [items]);

  const pixDiscountPercent = useMemo(() => {
    const rule = storeSettings?.paymentRules?.find((r) => r.paymentMethod === 'pix' && r.type === 'discount');
    return rule ? rule.value : 0;
  }, [storeSettings]);

  const creditInstallmentsOptions = useMemo(() => {
    const rules = storeSettings?.paymentRules?.filter(r => r.paymentMethod === 'credit' && r.type === 'charge') || [];
    const options = [{ value: 1, interest: 0 }];
    
    if (rules.length === 0) return options;

    rules.sort((a, b) => (a.parcelaMin || 0) - (b.parcelaMin || 0));

    rules.forEach(rule => {
       const min = rule.parcelaMin || 2;
       const max = rule.parcelaMax || min;
       const interest = rule.passedToCustomer !== false ? rule.value : 0; 
       
       for (let i = min; i <= max; i++) {
           if (!options.find(o => o.value === i)) {
               options.push({ value: i, interest: interest });
           }
       }
    });

    return options.sort((a, b) => a.value - b.value);
  }, [storeSettings]);

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [structuredAddress, setStructuredAddress] = useState<StructuredAddress | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<StructuredAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<StructuredAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isShowingSavedAddresses, setIsShowingSavedAddresses] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [deliveryEstimatedTime, setDeliveryEstimatedTime] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string>("");
  const [orderNote, setOrderNote] = useState("");
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [creditMode, setCreditMode] = useState<CreditMode>("avista");
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [needsChange, setNeedsChange] = useState("não");
  const [changeFor, setChangeFor] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [savedCouponCode, setSavedCouponCode] = useState("");
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [couponData, setCouponData] = useState<{ discountAmount: number; type: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [hasCopiedPix, setHasCopiedPix] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalizedOrder, setFinalizedOrder] = useState<FinalizedOrder | null>(null);
  const previousTotalItems = useRef(totalItems);

  const effectiveItems = useMemo(() => {
    if (paymentMethod === "PIX" || paymentMethod === null) {
      return items;
    }
    return items.map(item => {
      if (item.product.isPromo && item.product.oldPrice) {
        return {
          ...item,
          product: {
            ...item.product,
            price: item.product.oldPrice,
            isPromo: false,
            oldPrice: undefined
          }
        };
      }
      return item;
    });
  }, [items, paymentMethod]);

  const effectiveTotalPrice = useMemo(() => {
    return effectiveItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [effectiveItems]);
  useEffect(() => {
    const storedAddress = localStorage.getItem(SESSION_ADDRESS_KEY);
    const storedAddresses = localStorage.getItem(SESSION_ADDRESSES_KEY);
    const storedName = localStorage.getItem(SESSION_NAME_KEY) ?? "";
    const storedPhone = localStorage.getItem(SESSION_PHONE_KEY) ?? "";
    if (storedAddresses) {
      try {
        const parsedAddresses = JSON.parse(storedAddresses) as StructuredAddress[];
        setSavedAddresses(parsedAddresses);
      } catch {
        setSavedAddresses([]);
      }
    }
    if (storedAddress) {
      try {
        const parsed = JSON.parse(storedAddress) as StructuredAddress;
        setStructuredAddress(parsed);

        const fullDest = formatFreightDestinationAddress(parsed);
        calculate(fullDest).then((result) => {
          if (!result) return;
          if (result.error) {
            setDeliveryFee(0);
            setDeliveryDistanceKm(result.distanceKm ?? null);
            setDeliveryEstimatedTime(null);
            setDeliveryError(result.error || "");
            return;
          }
          if ('freightPrice' in result && typeof result.freightPrice === "number") {
            setDeliveryFee(result.freightPrice);
            setDeliveryDistanceKm(result.distanceKm ?? null);
            setDeliveryEstimatedTime((result as any).estimatedTimeStr || null);
            setDeliveryError("");
          } else {
            setDeliveryFee(0);
            setDeliveryDistanceKm(result.distanceKm ?? null);
            setDeliveryEstimatedTime(null);
            setDeliveryError(result.error || "");
          }
        });
      } catch {
      }
    }

    if (storedName) setName(storedName);
    if (storedPhone) setPhone(storedPhone);
    if (storedName && storedPhone) setIsEditingContact(false);
  }, [calculate]);

  useEffect(() => {
    if (!isCartOpen && !isFinishModalOpen) {
      setStep("cart");
      setPaymentMethod(null);
      setCreditMode("avista");
      setCreditInstallments(1);
      setNeedsChange("não");
      setChangeFor("");
      setEditingAddress(null);
      setIsAddressModalOpen(false);
      setIsShowingSavedAddresses(false);
      setHasCopiedPix(false);
    }
  }, [isCartOpen, isFinishModalOpen]);

  useEffect(() => {
    if (previousTotalItems.current > 0 && totalItems === 0) {
      setStep("cart");
    }
    previousTotalItems.current = totalItems;
  }, [totalItems]);


  const paymentOptions = useMemo(() => {
    const options: {
      value: PaymentMethod;
      title: string;
      subtitle: string;
      icon: any;
      highlight?: string;
    }[] = [];
    
    // Fallback to true if settings aren't loaded yet to prevent empty screen on slow connections
    const pixEnabled = storeSettings ? storeSettings.pixEnabled : true;
    const debitEnabled = storeSettings ? storeSettings.payOnDeliveryCardDebit : true;
    const creditEnabled = storeSettings ? storeSettings.payOnDeliveryCardCredit : true;
    const cashEnabled = storeSettings ? storeSettings.payOnDeliveryCash : true;

    if (pixEnabled) {
      options.push({
        value: "PIX",
        title: "Pix",
        subtitle: pixDiscountPercent > 0 ? `Pagamento instantâneo com ${pixDiscountPercent}% de desconto` : "Pagamento instantâneo",
        icon: Wallet,
        highlight: pixDiscountPercent > 0 ? `${pixDiscountPercent}% OFF` : undefined,
      });
    }
    if (debitEnabled) {
      options.push({
        value: "Cartão de Débito",
        title: "Cartão de débito",
        subtitle: "Pague na entrega",
        icon: CreditCard,
      });
    }
    if (creditEnabled) {
      options.push({
        value: "Cartão de Crédito",
        title: "Cartão de crédito",
        subtitle: "Pague na entrega",
        icon: CreditCard,
      });
    }
    if (cashEnabled) {
      options.push({
        value: "Dinheiro",
        title: "Dinheiro",
        subtitle: "Leve troco se precisar",
        icon: Receipt,
      });
    }
    return options;
  }, [storeSettings, hasPromoItems, pixDiscountPercent]);

  useEffect(() => {
    if (paymentMethod && !paymentOptions?.find(opt => opt.value === paymentMethod)) {
      setPaymentMethod(null);
    }
  }, [paymentOptions, paymentMethod]);

  const couponDiscountAmount = couponData?.type !== 'FREE_SHIPPING' ? (couponData?.discountAmount || 0) : 0;
  const totalAfterCoupon = Math.max(0, effectiveTotalPrice - couponDiscountAmount);
  const effectiveDeliveryFee = couponData?.type === 'FREE_SHIPPING' ? 0 : deliveryFee;

  const nonPromoItemsTotal = useMemo(() => {
    return effectiveItems.reduce((acc, item) => acc + (!item.product.isPromo ? item.product.price * item.quantity : 0), 0);
  }, [effectiveItems]);

  const pixDiscountBase = Math.min(nonPromoItemsTotal, totalAfterCoupon);
  const pixDiscount = useMemo(() => pixDiscountBase * (pixDiscountPercent / 100), [pixDiscountBase, pixDiscountPercent]);
  const totalWithPixDiscount = useMemo(() => totalAfterCoupon - pixDiscount, [totalAfterCoupon, pixDiscount]);
  const effectiveCreditInstallments = paymentMethod === "Cartão de Crédito" && creditMode === "parcelado" ? creditInstallments : 1;
  const selectedInstallment =
    creditInstallmentsOptions.find((installment) => installment.value === effectiveCreditInstallments) ?? creditInstallmentsOptions[0];

  const creditInterestAmount = useMemo(() => {
    if (paymentMethod !== "Cartão de Crédito" || creditMode !== "parcelado") return 0;
    return (totalAfterCoupon + effectiveDeliveryFee) * (selectedInstallment.interest / 100);
  }, [paymentMethod, creditMode, selectedInstallment.interest, totalAfterCoupon, effectiveDeliveryFee]);

  const discountedProductsTotal = useMemo(() => {
    if (paymentMethod === "PIX") return totalWithPixDiscount;
    return totalAfterCoupon;
  }, [paymentMethod, totalWithPixDiscount, totalAfterCoupon]);

  const finalTotal = discountedProductsTotal + effectiveDeliveryFee + creditInterestAmount;
  const parsedChangeFor = parseCurrencyInput(changeFor);
  const isChangeEnough = parsedChangeFor >= finalTotal;
  const isNameValid = useMemo(() => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.filter((w) => w.length >= 2).length >= 2;
  }, [name]);
  const isContactValid = isNameValid && phone.replace(/\D/g, "").length >= 10;
  const isAddressValid = structuredAddress !== null;
  const hasValidDeliveryFee = deliveryFee >= 0 && !deliveryError;

  const savedAddressDisplay = useMemo(() => {
    if (!structuredAddress) return "";
    const parts = [structuredAddress.mainText, structuredAddress.number, structuredAddress.secondaryText];
    if (structuredAddress.complement) parts.push(`Complemento: ${structuredAddress.complement}`);
    if (structuredAddress.reference) parts.push(`Referência: ${structuredAddress.reference}`);
    return parts.filter(Boolean).join(", ");
  }, [structuredAddress]);

  const paymentLabel =
    paymentMethod === "PIX"
      ? "Pix"
      : paymentMethod === "Cartão de Débito"
        ? "Cartão de Débito"
        : paymentMethod === "Cartão de Crédito"
          ? creditMode === "parcelado"
            ? `Cartão de Crédito - ${effectiveCreditInstallments}x`
            : "Cartão de Crédito à vista"
          : paymentMethod === "Dinheiro"
            ? "Dinheiro"
            : "-";

  const persistAddresses = (addresses: StructuredAddress[]) => {
    setSavedAddresses(addresses);
    localStorage.setItem(SESSION_ADDRESSES_KEY, JSON.stringify(addresses));
  };

  const calculateDeliveryFee = useCallback(
    async (addr: StructuredAddress) => {
      setIsCalculatingFee(true);
      setDeliveryError("");

      try {
        const fullDest = formatFreightDestinationAddress(addr);
        const result = await calculate(fullDest);

        if (!result) return;
        if (result.error) {
          setDeliveryFee(0);
          setDeliveryDistanceKm(result.distanceKm ?? null);
          setDeliveryEstimatedTime(null);
          setDeliveryError(result.error);
          return;
        }
        if ('freightPrice' in result && result.freightPrice !== undefined) {
          setDeliveryFee(result.freightPrice || 0);
          setDeliveryDistanceKm(result.distanceKm ?? null);
          setDeliveryEstimatedTime((result as any).estimatedTimeStr || null);
          setDeliveryError("");
          return;
        }

        setDeliveryFee(0);
        setDeliveryDistanceKm(result.distanceKm ?? null);
        setDeliveryEstimatedTime(null);
        setDeliveryError("Não foi possível calcular a entrega.");

        if (result.error) {
          toast.info(result.error);
        }
      } catch {
        setDeliveryFee(0);
        setDeliveryDistanceKm(null);
        setDeliveryError("Não foi possível calcular a entrega.");
        toast.info("Não foi possível calcular a entrega.");
      } finally {
        setIsCalculatingFee(false);
      }
    },
    [calculate]
  );

  const hasSelectedPaymentMethod = paymentMethod !== null;
  const isPaymentValid =
    hasSelectedPaymentMethod &&
    (paymentMethod !== "Dinheiro" || needsChange === "não" || (changeFor.trim().length > 0 && isChangeEnough));
  const closeCart = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);

  const handleNameChange = (value: string) => {
    setName(value);
    localStorage.setItem(SESSION_NAME_KEY, value);
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhone(value);
    setPhone(formattedPhone);
    localStorage.setItem(SESSION_PHONE_KEY, formattedPhone);
  };

  const handleSaveAddress = useCallback((addr: StructuredAddress) => {
    const nextAddress = {
      ...addr,
      id: addr.id || crypto.randomUUID(),
    };

    const nextAddresses = [...savedAddresses.filter((item) => item.id !== nextAddress.id), nextAddress];
    persistAddresses(nextAddresses);
    setStructuredAddress(nextAddress);
    localStorage.setItem(SESSION_ADDRESS_KEY, JSON.stringify(nextAddress));
    setEditingAddress(null);
    setIsAddressModalOpen(false);
    setIsShowingSavedAddresses(false);
    calculateDeliveryFee(nextAddress);
  }, [calculateDeliveryFee, savedAddresses]);

  const handleSelectSavedAddress = useCallback((addr: StructuredAddress) => {
    setStructuredAddress(addr);
    localStorage.setItem(SESSION_ADDRESS_KEY, JSON.stringify(addr));
    setEditingAddress(null);
    setIsAddressModalOpen(false);
    setIsShowingSavedAddresses(false);
    calculateDeliveryFee(addr);
  }, [calculateDeliveryFee]);

  const handleEditSavedAddress = (addr: StructuredAddress) => {
    setEditingAddress(addr);
    setIsShowingSavedAddresses(false);
  };

  const handleDeleteSavedAddress = (addressId: string) => {
    const nextAddresses = savedAddresses.filter((address) => address.id !== addressId);
    persistAddresses(nextAddresses);

    if (structuredAddress?.id === addressId) {
      setStructuredAddress(null);
      localStorage.removeItem(SESSION_ADDRESS_KEY);
      setDeliveryFee(0);
      setDeliveryDistanceKm(null);
      setDeliveryEstimatedTime(null);
      setDeliveryError("");
    }
  };

  const handleSaveContact = () => {
    if (!name.trim()) {
      toast.info("Preencha seu nome e sobrenome para continuar.");
      return;
    }

    if (!isNameValid) {
      toast.info("Por favor, digite seu nome e sobrenome completo.");
      return;
    }

    if (phone.replace(/\D/g, "").length < 10) {
      toast.info("Preencha um telefone válido para continuar.");
      return;
    }

    localStorage.setItem(SESSION_NAME_KEY, name.trim());
    localStorage.setItem(SESSION_PHONE_KEY, phone);
    setIsEditingContact(false);
  };

  const handleSaveCoupon = async () => {
    const trimmedCoupon = couponCode.trim().toUpperCase();

    if (!trimmedCoupon) {
      toast.info("Digite um cupom para salvar.");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const { getApiHeaders } = await import("@/services/api");
      const response = await fetch(`${import.meta.env.VITE_ADMIN_API}/coupons/validate`, {
        method: "POST",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedCoupon, orderTotal: effectiveTotalPrice, nonPromoItemsTotal }),
      });

      if (!response.ok) {
        throw new Error("Cupom inválido ou expirado.");
      }

      const data = await response.json();
      setCouponData({ discountAmount: data.discountAmount, type: data.coupon.type });
      setSavedCouponCode(trimmedCoupon);
      setCouponCode(trimmedCoupon);
      setIsEditingCoupon(false);
      toast.success("Cupom aplicado com sucesso!");
    } catch (error) {
      toast.error("Erro ao validar o cupom.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setSavedCouponCode("");
    setCouponData(null);
    setIsEditingCoupon(false);
    toast.success("Cupom removido.");
  };

  const handleRemoveItem = (productId: string, selectedVariation?: string) => {
    removeFromCart(productId, selectedVariation);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const goToDelivery = () => {
    if (!effectiveItems.length) return;
    setStep("delivery");
    trackEvent('InitiateCheckout', {
      value: effectiveTotalPrice,
      currency: 'BRL',
      num_items: totalItems
    });
  };

  const goToPayment = () => {
    if (isEditingContact) {
      toast.info("Salve suas informações de contato para continuar.");
      return;
    }

    if (!isContactValid) {
      if (!isNameValid) {
        toast.info("Preencha seu nome e sobrenome completo para continuar.");
      } else {
        toast.info("Preencha um telefone válido para continuar.");
      }
      return;
    }

    if (!isAddressValid) {
      toast.info("Selecione um endereço de entrega para continuar.");
      return;
    }

    if (!hasValidDeliveryFee) {
      toast.info(deliveryError || "A entrega precisa ser calculada antes de continuar.");
      return;
    }

    setPaymentMethod(null);
    setCreditMode("avista");
    setCreditInstallments(1);
    setNeedsChange("não");
    setChangeFor("");
    setStep("payment");
  };

  const goToConfirmation = () => {
    if (!hasSelectedPaymentMethod) {
      toast.info("Selecione uma forma de pagamento para continuar.");
      return;
    }

    if (paymentMethod === "Dinheiro" && needsChange === "sim" && !changeFor.trim()) {
      toast.info("Informe o valor do troco para continuar.");
      return;
    }

    if (paymentMethod === "Dinheiro" && needsChange === "sim" && !isChangeEnough) {
      toast.info("O troco precisa ser para um valor maior ou igual ao total com entrega.");
      return;
    }

    if (!isPaymentValid) {
      toast.info("Informe o troco para continuar.");
      return;
    }

    setStep("confirmation");
    trackEvent('AddPaymentInfo', {
      value: finalTotal,
      currency: 'BRL',
      payment_type: paymentMethod
    });
  };

  const checkoutItems = finalizedOrder?.items ?? effectiveItems;
  const checkoutName = finalizedOrder?.customerName ?? name;
  const checkoutPhone = finalizedOrder?.customerPhone ?? phone;
  const checkoutAddress = finalizedOrder?.customerAddress ?? savedAddressDisplay;
  const checkoutOrderNote = finalizedOrder?.orderNote ?? orderNote;
  const checkoutSubtotal = finalizedOrder?.subtotal ?? effectiveTotalPrice;
  const checkoutDeliveryFee = finalizedOrder?.deliveryFee ?? deliveryFee;
  const checkoutTotal = finalizedOrder?.total ?? finalTotal;
  const checkoutPixDiscount = finalizedOrder?.pixDiscount ?? pixDiscount;
  const checkoutSavedCouponCode = finalizedOrder?.savedCouponCode ?? savedCouponCode;
  const checkoutPaymentMethod = finalizedOrder?.paymentMethod ?? paymentMethod;
  const checkoutPaymentLabel = finalizedOrder?.paymentLabel ?? paymentLabel;
  const checkoutCreditMode = finalizedOrder?.creditMode ?? creditMode;
  const checkoutCreditInstallments = finalizedOrder?.creditInstallments ?? effectiveCreditInstallments;
  const checkoutCreditInterest = finalizedOrder?.creditInterest ?? selectedInstallment.interest;
  const checkoutNeedsChange = finalizedOrder?.needsChange ?? needsChange;
  const checkoutChangeFor = finalizedOrder?.changeFor ?? changeFor;
  const checkoutEstimatedTime = finalizedOrder?.estimatedTimeStr ?? deliveryEstimatedTime;
  const checkoutNote = finalizedOrder?.orderNote ?? orderNote;

  const checkoutMessage = useMemo(() => {
    const itemsFormatted = checkoutItems.map(item => {
      let qtyStr = `${item.quantity} x ${item.product.name}: ${formatPrice(item.product.price * item.quantity)}`;
      if (item.selectedVariation) {
        qtyStr += `\n    ${item.quantity}x ${item.selectedVariation}`;
      }
      return qtyStr;
    }).join("\n\n");

    const isCredit = checkoutPaymentMethod === "Cartão de Crédito";
    const isDebit = checkoutPaymentMethod === "Cartão de Débito";
    const isPix = checkoutPaymentMethod === "PIX";
    const isCash = checkoutPaymentMethod === "Dinheiro";

    const paymentLabelFormat = isPix 
      ? `PIX`
      : isDebit
        ? `Cartão de Débito`
        : isCash
          ? `Dinheiro`
          : checkoutCreditMode === "parcelado"
            ? `Cartão de Crédito - ${checkoutCreditInstallments}x ${formatPrice(checkoutTotal / checkoutCreditInstallments)}`
            : `Cartão de Crédito - 1x ${formatPrice(checkoutTotal)}`;

    const pagamentoType = isPix 
      ? `Online`
      : isCash 
        ? `Presencial (Dinheiro)` 
        : `Presencial (Máquina de cartão)`;
        
    const finishOrderNumber = finalizedOrder ? finalizedOrder.orderNumber : Date.now().toString().slice(-4);

    const lines = [
      `Olá, meu nome é ${checkoutName || "-"}, esse é o meu pedido realizado através da Loja Pod`,
      `--------`,
      ``,
      itemsFormatted,
      ``,
      `--------`,
      `Quantidade de itens: ${checkoutItems.reduce((acc, item) => acc + item.quantity, 0)} `,
      `Total dos itens: ${formatPrice(checkoutSubtotal)}`,
      `--------`,
      `Valor da entrega: ${formatPrice(checkoutDeliveryFee)}`
    ];

    if (checkoutSavedCouponCode) {
       const cDiscount = couponData?.type === 'FREE_SHIPPING' ? 'Frete Grátis' : (couponData?.discountAmount ? formatPrice(couponData.discountAmount) : "");
       lines.push(`Cupom: ${checkoutSavedCouponCode} ${cDiscount}`);
    }

    if (isPix && checkoutPixDiscount > 0) {
      lines.push(`Desconto PIX: ${formatPrice(checkoutPixDiscount)}`);
    }

    if (isCredit && checkoutCreditMode === "parcelado" && checkoutCreditInterest > 0) {
      const baseForCredit = checkoutSubtotal - (couponData?.discountAmount || 0) + checkoutDeliveryFee;
      const interestAmt = checkoutTotal - baseForCredit;
      if (interestAmt > 0) {
        lines.push(`Acréscimo parcelamento: ${formatPrice(interestAmt)}`);
      }
    }

    lines.push(`Valor Total: ${formatPrice(checkoutTotal)}`);
    lines.push(`Forma de pagamento: ${paymentLabelFormat}`);
    
    if (isCash && checkoutNeedsChange === "sim") {
      const changeForVal = parseCurrencyInput(checkoutChangeFor);
      if (changeForVal > checkoutTotal) {
         lines.push(`Troco para: ${formatPrice(changeForVal)}`);
         lines.push(`Valor do troco: ${formatPrice(changeForVal - checkoutTotal)}`);
      }
    }

    if (isPix) {
      const rawPixKey = storeSettings?.pixKey || PIX_KEY;
      const cleanPixKey = unmaskPixKey(rawPixKey, storeSettings?.pixKeyType);
      const translatedType = translatePixKeyType(storeSettings?.pixKeyType);
      lines.push(`Chave PIX: ${cleanPixKey} (${translatedType})`);
      lines.push(`Titular da conta: ${storeSettings?.pixHolder || PIX_HOLDER}`);
    }

    lines.push(`Pagamento: ${pagamentoType}`);
    
    lines.push(`--------`);
    lines.push(`Para entregar em: ${checkoutAddress || "-"}`);
    
    if (checkoutNote && checkoutNote.trim() !== "") {
       lines.push(`Observação do Pedido: ${checkoutNote.trim()}`);
    }
    lines.push(`Contato: ${checkoutPhone || "-"}`);
    if (checkoutEstimatedTime) {
      lines.push(`Estimativa de entrega: ${checkoutEstimatedTime}`);
    }
    lines.push(`Número do pedido: ${finishOrderNumber}`);
    
    lines.push(`--------`);
    lines.push(`Pedido feito na ${storeSettings?.storeName || "Loja Pod"}`);

    return encodeURIComponent(lines.join("\n"));
  }, [
    checkoutAddress,
    checkoutCreditInstallments,
    checkoutCreditInterest,
    checkoutCreditMode,
    checkoutDeliveryFee,
    checkoutItems,
    checkoutName,
    checkoutOrderNote,
    checkoutPaymentMethod,
    checkoutPhone,
    checkoutPixDiscount,
    checkoutSavedCouponCode,
    checkoutSubtotal,
    checkoutTotal,
    checkoutNeedsChange,
    checkoutChangeFor,
    couponData,
    finalizedOrder,
    storeSettings
  ]);

  const finalizeOrder = async () => {
    if (!isContactValid || !isAddressValid || !isPaymentValid || effectiveItems.length === 0 || !paymentMethod || !hasValidDeliveryFee) {
      toast.info("Preencha todas as etapas obrigatórias para finalizar.");
      return;
    }

    if (paymentMethod === "Dinheiro" && needsChange === "sim" && !isChangeEnough) {
      toast.info("O troco precisa ser para um valor maior ou igual ao total com entrega.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = effectiveItems.map((item) => ({ ...item }));
      const payload = {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        itemsTotal: Number(effectiveTotalPrice.toFixed(2)),
        freight: Number(deliveryFee.toFixed(2)),
        paymentDiscount: paymentMethod === 'PIX' ? Number(pixDiscount.toFixed(2)) : 0,
        installmentSurcharge: paymentMethod === 'Cartão de Crédito' && creditMode === 'parcelado' ? Number(creditInterestAmount.toFixed(2)) : 0,
        couponTitle: savedCouponCode || undefined,
        couponDiscount: couponData?.type !== 'FREE_SHIPPING' ? Number(couponData?.discountAmount || 0) : 0,
        couponFreightDiscount: couponData?.type === 'FREE_SHIPPING' ? Number(deliveryFee.toFixed(2)) : 0,
        totalOrder: Number(finalTotal.toFixed(2)),
        totalReceived: Number(finalTotal.toFixed(2)),
        paymentType: paymentMethod === 'PIX' ? 'online' : 'entrega',
        paymentMethod: paymentMethod === 'PIX' ? 'pix' : paymentMethod === 'Cartão de Crédito' ? 'credit' : paymentMethod === 'Cartão de Débito' ? 'debit' : paymentMethod === 'Dinheiro' ? 'cash' : paymentMethod,
        installments: paymentMethod === 'Cartão de Crédito' && creditMode === 'parcelado' ? effectiveCreditInstallments : 1,
        street: structuredAddress?.mainText || savedAddressDisplay,
        number: structuredAddress?.number || "S/N",
        neighborhood: structuredAddress?.secondaryText?.split(',')[0] || "Local",
        city: structuredAddress?.city || storeSettings?.searchCity || "Campo Grande",
        state: structuredAddress?.state || "MS",
        cep: structuredAddress?.cep ? structuredAddress.cep : "00000-000",
        complement: structuredAddress?.complement || "",
        observation: orderNote.trim() || undefined,
        amountProvided: paymentMethod === 'Dinheiro' ? (needsChange === 'sim' ? parseCurrencyInput(changeFor) : finalTotal) : undefined,
        changeAmount: paymentMethod === 'Dinheiro' && needsChange === 'sim' ? Math.max(0, parseCurrencyInput(changeFor) - finalTotal) : undefined,
        items: orderItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          variation: item.selectedVariation
        }))
      };

      const result = await ordersService.createStoreOrder(payload as any);
      const orderId = result.id;
      const orderNumber = result.orderNumber;
      const createdAt = new Date().toISOString();

      addOrder({
        id: orderId,
        createdAt,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: savedAddressDisplay,
        paymentMethod,
        deliveryFee,
        subtotal: effectiveTotalPrice,
        total: finalTotal,
        items: orderItems,
      });

      setFinalizedOrder({
        id: orderId,
        orderNumber,
        createdAt,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: savedAddressDisplay,
        orderNote,
        paymentMethod,
        paymentLabel,
        deliveryFee,
        subtotal: effectiveTotalPrice,
        total: finalTotal,
        pixDiscount,
        creditMode,
        creditInstallments: effectiveCreditInstallments,
        creditInterest: selectedInstallment.interest,
        savedCouponCode,
        needsChange,
        changeFor,
        estimatedTimeStr: deliveryEstimatedTime,
        items: orderItems,
      });

      clearCart();
      setHasCopiedPix(paymentMethod !== "PIX");
      setIsCartOpen(false);
      setIsFinishModalOpen(true);

      // Verificação de Recompra (histórico local e janela de 7 dias)
      const LAST_PURCHASE_KEY = "podemais-last-purchase-timestamp";
      const ORDER_COUNT_KEY = "podemais-customer-order-count";
      const AD_CLICK_KEY = "podemais-ad-click-data";
      
      const lastPurchaseTimeStr = localStorage.getItem(LAST_PURCHASE_KEY);
      const prevOrderCountStr = localStorage.getItem(ORDER_COUNT_KEY);
      const adClickDataStr = localStorage.getItem(AD_CLICK_KEY);
      
      const now = Date.now();
      const prevOrderCount = prevOrderCountStr ? parseInt(prevOrderCountStr, 10) : 0;
      const newOrderCount = prevOrderCount + 1;
      
      let isRecompra7Dias = false;
      let daysSinceLastPurchase: number | undefined = undefined;

      if (lastPurchaseTimeStr) {
        const lastTime = parseInt(lastPurchaseTimeStr, 10);
        if (!isNaN(lastTime)) {
          const diffMs = now - lastTime;
          daysSinceLastPurchase = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (daysSinceLastPurchase <= 7) {
            isRecompra7Dias = true;
          }
        }
      }

      let adData: any = null;
      if (adClickDataStr) {
        try {
          const parsed = JSON.parse(adClickDataStr);
          if (parsed && (now - parsed.timestamp) <= 7 * 24 * 60 * 60 * 1000) {
            adData = parsed;
          }
        } catch (e) {}
      }

      // Atualiza o histórico para a próxima compra
      localStorage.setItem(LAST_PURCHASE_KEY, String(now));
      localStorage.setItem(ORDER_COUNT_KEY, String(newOrderCount));

      const orderData: Record<string, any> = {
        value: finalTotal,
        currency: 'BRL',
        num_items: totalItems,
        is_returning_customer: prevOrderCount > 0,
        recompra_7_dias: isRecompra7Dias,
        customer_order_count: newOrderCount,
      };
      if (daysSinceLastPurchase !== undefined) {
        orderData.days_since_last_purchase = daysSinceLastPurchase;
      }
      if (adData) {
        if (adData.fbclid) orderData.fbclid = adData.fbclid;
        if (adData.utmCampaign) orderData.utm_campaign = adData.utmCampaign;
        orderData.origem_anuncio_7dias = true;
      }

      const eventId = orderId ? String(orderId) : `order_${orderNumber}`;
      trackEvent('Purchase', orderData, { eventID: eventId });

      if (isRecompra7Dias) {
        trackCustomEvent('Recompra7Dias', {
          valor: finalTotal,
          dias_desde_ultima_compra: daysSinceLastPurchase,
          qtd_pedidos: newOrderCount,
          veio_de_anuncio: !!adData,
        });
      }
      
      trackCustomEvent('PedidoVendizap', {
        entrega: "Entrega",
        taxa_entrega: deliveryFee,
        desconto_pix: paymentMethod === 'PIX' ? pixDiscount : 0,
        formaPagamento: paymentMethod === 'PIX' ? 'PIX' : paymentMethod === 'Cartão de Crédito' ? 'Credit' : paymentMethod === 'Cartão de Débito' ? 'Debit' : 'Cash',
          itens: JSON.stringify(orderItems.map(item => ({
            id: item.product.id,
            nome: item.product.name,
            categoria: {
              id: item.product.categoryId || "",
              nome: item.product.category
            },
            quantidade: item.quantity,
            preco: item.product.price
          }))),
          qtdItens: totalItems,
          valor: finalTotal,
          recompra_7_dias: isRecompra7Dias,
          origem_anuncio: !!adData
        });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = async () => {
    const targetPixKey = storeSettings?.pixKey || PIX_KEY;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(targetPixKey);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = targetPixKey;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) throw new Error('Falha ao copiar');
      }
      setHasCopiedPix(true);
      toast.success("Chave PIX copiada!");
    } catch {
      toast.error("Não foi possível copiar a chave PIX.");
    }
  };

  const handleSendWhatsApp = () => {
    const numero = storeSettings?.phone?.replace(/\D/g, "");
    if (!numero) return;
    const urlApp = `whatsapp://send?phone=${numero}&text=${checkoutMessage}`;
    const urlWeb = `https://wa.me/${numero}?text=${checkoutMessage}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsFinishModalOpen(false);
    setIsCartOpen(false);
    if (isMobile) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(urlWeb, "_blank", "noopener,noreferrer");
        }
      }, 1500);
    } else {
      window.open(urlWeb, "_blank", "noopener,noreferrer");
    }
  };

  const canContinueDelivery = isContactValid && isAddressValid && !isEditingContact && hasValidDeliveryFee;
  const finishOrderNumber = finalizedOrder ? finalizedOrder.orderNumber : Date.now().toString().slice(-4);
  const finishDate = finalizedOrder ? new Date(finalizedOrder.createdAt) : new Date();

  return (
    <>
      {isCartOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={closeCart} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-[#f7f7f7] shadow-2xl">
            <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground">
              <div className="flex items-center gap-2">
                {step !== "cart" && (
                  <button
                    onClick={() => {
                      const stepOrder: CheckoutStep[] = ["cart", "delivery", "payment", "confirmation"];
                      const idx = stepOrder.indexOf(step);
                      if (idx > 0) setStep(stepOrder[idx - 1]);
                    }}
                    className="rounded-full p-1 text-primary-foreground/90"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <p className="text-xs font-medium text-primary-foreground/80">Entrega rápida</p>
                  <h2 className="text-lg font-bold">{step === "cart" ? "Sua Sacola" : "Finalizar pedido"}</h2>
                </div>
              </div>
              <button onClick={closeCart} className="rounded-full p-1 text-primary-foreground/90">
                <X className="h-5 w-5" />
              </button>
            </div>

            {step !== "cart" && effectiveItems.length > 0 && (
              <div className="border-b border-border bg-card">
                <StepIndicator currentStep={step} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {step === "cart" && (
                <div className="space-y-4 p-4">
                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Seu pedido</p>
                          <p className="text-xs text-muted-foreground">Revise os itens antes de continuar</p>
                        </div>
                      </div>
                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCart}
                          className="text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12" />
                        <p className="text-sm font-medium">Sua sacola está vazia</p>
                        <p className="text-center text-sm">Adicione produtos para iniciar o checkout.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => {
                          const isAtLimit = item.selectedVariation && item.product.variationGroup
                            ? (() => {
                                const opt = item.product.variationGroup.options.find((o) => o.label === item.selectedVariation);
                                return opt?.stock !== undefined && item.quantity >= opt.stock;
                              })()
                            : item.product.stock !== undefined && item.quantity >= item.product.stock;

                          return (
                            <div
                              key={`${item.product.id}-${item.selectedVariation ?? "default"}`}
                            className="rounded-2xl border border-border bg-background p-3"
                          >
                            <div className="flex gap-3">
                              <CartItemImage
                                productId={item.product.id}
                                productImage={item.product.image}
                                productName={item.product.name}
                                className="h-16 w-16 rounded-xl bg-secondary/30"
                              />
                              <div className="flex flex-1 flex-col justify-between gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.product.name}</p>
                                    {item.selectedVariation && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {item.selectedVariation}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveItem(item.product.id, item.selectedVariation)}
                                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1">
                                    <button
                                      onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariation)}
                                      className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="min-w-[28px] text-center text-sm font-semibold text-foreground">
                                      {item.quantity}
                                    </span>
                                    <button
                                      disabled={isAtLimit}
                                      onClick={() => {
                                        if (isAtLimit) return;
                                        updateQuantity(item.product.id, item.quantity + 1, item.selectedVariation);
                                      }}
                                      className={`rounded-full p-1.5 ${isAtLimit ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-primary text-primary-foreground"}`}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    {item.product.isPromo && item.product.oldPrice && (
                                      <span className="text-xs text-muted-foreground line-through">
                                        {formatPrice(item.product.oldPrice * item.quantity)}
                                      </span>
                                    )}
                                    <span className="font-medium text-foreground whitespace-nowrap">
                                      {formatPrice(item.product.price * item.quantity)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </div>
              )}

              {step === "delivery" && (
                <div className="space-y-4 p-4">
                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Seus dados</h3>
                        <p className="text-xs text-muted-foreground">Quem vai receber o pedido?</p>
                      </div>
                    </div>

                    {isEditingContact ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Nome</label>
                          <input
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Nome e sobrenome"
                            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:outline-none md:text-sm"
                          />
                          {name.trim().length > 0 && !isNameValid && (
                            <p className="mt-1 text-xs text-destructive">Digite seu nome e sobrenome (ex: João Silva)</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Telefone</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="(67) 99999-9999"
                            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:outline-none md:text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveContact}
                          disabled={!isContactValid}
                          className={`w-full rounded-2xl py-3 text-sm font-semibold ${isContactValid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                        >
                          Salvar contato
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <User className="h-4 w-4 text-primary" />
                              {name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Phone className="h-4 w-4 text-primary" />
                              {phone}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingContact(true)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    {structuredAddress ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {structuredAddress.mainText}
                              {structuredAddress.number && structuredAddress.number !== "s/n" ? `, ${structuredAddress.number}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{structuredAddress.secondaryText}</p>
                            {structuredAddress.complement && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Complemento: {structuredAddress.complement}
                              </p>
                            )}
                            {structuredAddress.reference && (
                              <p className="text-xs text-muted-foreground">
                                Referência: {structuredAddress.reference}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(null);
                            setIsShowingSavedAddresses(savedAddresses.length > 0);
                            setIsAddressModalOpen(true);
                          }}
                          className="text-sm font-medium text-primary"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddress(null);
                          setIsShowingSavedAddresses(false);
                          setIsAddressModalOpen(true);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">Cadastrar endereço</p>
                          <p className="text-xs text-muted-foreground">Informe onde deseja receber seu pedido</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-foreground">Observação do pedido</label>
                      <textarea
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        placeholder="Ex: tocar interfone, entregar na portaria, sem pressa..."
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:outline-none md:text-sm"
                      />
                    </div>

                    {isCalculatingFee ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Calculando total com entrega...</span>
                      </div>
                    ) : deliveryError ? (
                      <p className="text-sm font-semibold text-destructive">{deliveryError}</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-base">
                          <span className="font-medium text-muted-foreground">Total com entrega</span>
                          <span className="text-lg font-bold text-primary">{formatPrice(effectiveTotalPrice + deliveryFee)}</span>
                        </div>
                        {deliveryEstimatedTime && (
                          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">Estimativa de entrega: {deliveryEstimatedTime}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === "payment" && (
                <div className="space-y-4 p-4">
                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Pagamento</h3>
                        <p className="text-xs text-muted-foreground">Escolha como deseja pagar</p>
                      </div>
                    </div>

                    {hasPromoItems && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          Desconto promocional válido <strong>apenas no PIX</strong>.
                        </p>
                      </div>
                    )}

                    {isEditingCoupon ? (
                      <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">Cupom</label>
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Digite seu cupom"
                          className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:outline-none md:text-sm"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveCoupon}
                            disabled={!couponCode.trim() || isValidatingCoupon}
                            className={`flex-1 rounded-2xl py-3 text-sm font-semibold ${couponCode.trim() && !isValidatingCoupon ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {isValidatingCoupon ? "Validando..." : "Salvar cupom"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (savedCouponCode) {
                                setCouponCode(savedCouponCode);
                                setIsEditingCoupon(false);
                                return;
                              }
                              setCouponCode("");
                              setIsEditingCoupon(false);
                            }}
                            className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : savedCouponCode ? (
                      <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Ticket className="h-4 w-4 text-primary" />
                            <span>{savedCouponCode}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsEditingCoupon(true)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="inline-flex items-center gap-1 text-sm font-medium text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingCoupon(true)}
                        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                            <Ticket className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">Adicionar cupom</p>
                            <p className="text-xs text-muted-foreground">Se você tiver um código promocional</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}

                    <div className="space-y-3">
                      {paymentOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = paymentMethod === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(option.value);
                              if (option.value === "Cartão de Crédito") {
                                setCreditMode("avista");
                                setCreditInstallments(1);
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                  }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">{option.title}</p>
                                  {option.highlight && (
                                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                      {option.highlight}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                              </div>
                            </div>
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                                }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {paymentMethod === "Cartão de Crédito" && (
                      <div className="mt-4 rounded-2xl bg-secondary p-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">No crédito</label>
                        <div className={`grid ${creditInstallmentsOptions.filter(i => i.value >= 2).length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                          <button
                            type="button"
                            onClick={() => {
                              setCreditMode("avista");
                              setCreditInstallments(1);
                            }}
                            className={`rounded-2xl border px-3 py-3 text-sm font-medium ${creditMode === "avista"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground"
                              }`}
                          >
                            À vista
                          </button>
                          
                          {creditInstallmentsOptions.filter(i => i.value >= 2).length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCreditMode("parcelado");
                                if (creditInstallments < 2) setCreditInstallments(2);
                              }}
                              className={`rounded-2xl border px-3 py-3 text-sm font-medium ${creditMode === "parcelado"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground"
                                }`}
                            >
                              Parcelado
                            </button>
                          )}
                        </div>

                        {creditMode === "parcelado" && (
                          <div className="mt-4 space-y-2">
                            {creditInstallmentsOptions.filter((installment) => installment.value >= 2).map((installment) => {
                              const totalInstallmentPrice = (effectiveTotalPrice + deliveryFee) * (1 + installment.interest / 100);
                              const perInstallment = totalInstallmentPrice / installment.value;
                              const isSelected = creditInstallments === installment.value;

                              return (
                                <button
                                  key={installment.value}
                                  type="button"
                                  onClick={() => setCreditInstallments(installment.value)}
                                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${isSelected ? "border-primary bg-background" : "border-border bg-background/70"
                                    }`}
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {installment.value}x de {formatPrice(perInstallment)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      + {installment.interest.toFixed(2).replace(".", ",")}%
                                    </p>
                                  </div>
                                  <span className="text-sm font-medium text-foreground">
                                    {formatPrice(totalInstallmentPrice)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === "Dinheiro" && (
                      <div className="mt-4 space-y-3 rounded-2xl bg-secondary p-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Precisa de troco?</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setNeedsChange("sim")}
                              className={`rounded-2xl border px-3 py-3 text-sm font-medium ${needsChange === "sim"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground"
                                }`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setNeedsChange("não")}
                              className={`rounded-2xl border px-3 py-3 text-sm font-medium ${needsChange === "não"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground"
                                }`}
                            >
                              Não
                            </button>
                          </div>
                        </div>

                        {needsChange === "sim" && (
                          <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Troco para quanto?</label>
                            <input
                              value={changeFor}
                              onChange={(e) => setChangeFor(formatCurrencyInput(e.target.value))}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="Ex: 100,00"
                              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:outline-none md:text-sm"
                            />
                            {!isChangeEnough && changeFor.trim().length > 0 && (
                              <p className="mt-2 text-sm text-destructive">
                                O valor do troco deve ser maior ou igual a {formatPrice(finalTotal)}.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-card p-4 text-sm shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Resumo</h3>
                    <div className="space-y-2">
                      {savedCouponCode && (
                        <div className="flex justify-between text-primary">
                          <span>Cupom ({savedCouponCode})</span>
                          <span className="font-medium">
                            {couponData?.type === 'FREE_SHIPPING' ? 'Frete Grátis' : `-${formatPrice(couponData?.discountAmount || 0)}`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">{formatPrice(effectiveTotalPrice)}</span>
                      </div>
                      {paymentMethod === "PIX" && pixDiscount > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Desconto Pix</span>
                          <span className="font-medium">-{formatPrice(pixDiscount)}</span>
                        </div>
                      )}

                      {paymentMethod === "Cartão de Crédito" && creditMode === "parcelado" && selectedInstallment.interest > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Juros do parcelamento</span>
                          <span className="font-medium">+{selectedInstallment.interest.toFixed(2).replace(".", ",")}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrega</span>
                        <span className="font-medium text-foreground">
                          {couponData?.type === 'FREE_SHIPPING' ? (
                            <span className="text-primary font-bold">Grátis</span>
                          ) : (
                            formatPrice(deliveryFee)
                          )}
                        </span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-base">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="text-lg font-bold text-primary">{formatPrice(finalTotal)}</span>
                        </div>
                        {paymentMethod === "Cartão de Crédito" && creditMode === "parcelado" && (
                          <p className="mt-1 text-right text-xs text-muted-foreground">
                            {effectiveCreditInstallments}x de {formatPrice(finalTotal / effectiveCreditInstallments)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === "confirmation" && (
                <div className="space-y-4 p-4">
                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Entrega</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <User className="h-4 w-4 text-primary" />
                        <span>{name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{phone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{savedAddressDisplay || "-"}</span>
                      </div>
                      {orderNote.trim() && (
                        <div className="flex items-start gap-2 text-foreground">
                          <Pencil className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{orderNote.trim()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Itens do pedido</h3>
                    <div className="space-y-2">
                      {effectiveItems.map((item) => (
                        <div
                          key={`${item.product.id}-${item.selectedVariation ?? "default"}`}
                          className="flex items-start justify-between text-sm gap-3"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-muted-foreground whitespace-nowrap">{item.quantity}x</span>
                            <div className="flex flex-col">
                              <span className="text-foreground">{item.product.name}</span>
                              {item.selectedVariation && (
                                <span className="text-xs text-muted-foreground">{item.selectedVariation}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            {item.product.isPromo && item.product.oldPrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(item.product.oldPrice * item.quantity)}
                              </span>
                            )}
                            <span className="font-medium text-foreground whitespace-nowrap">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-card p-4 text-sm shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Pagamento e total</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Forma de pagamento</span>
                        <span className="font-medium text-foreground">{paymentLabel}</span>
                      </div>
                      {paymentMethod === "Cartão de Crédito" && creditMode === "parcelado" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Parcelamento</span>
                          <span className="font-medium text-foreground">
                            {effectiveCreditInstallments}x de {formatPrice(finalTotal / effectiveCreditInstallments)}
                          </span>
                        </div>
                      )}
                      {savedCouponCode && (
                        <div className="flex justify-between text-primary">
                          <span>Cupom ({savedCouponCode})</span>
                          <span className="font-medium">
                            {couponData?.type === 'FREE_SHIPPING' ? 'Frete Grátis' : `-${formatPrice(couponData?.discountAmount || 0)}`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">{formatPrice(effectiveTotalPrice)}</span>
                      </div>
                      {paymentMethod === "PIX" && pixDiscount > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Desconto Pix</span>
                          <span className="font-medium">-{formatPrice(pixDiscount)}</span>
                        </div>
                      )}

                      {paymentMethod === "Cartão de Crédito" && creditMode === "parcelado" && selectedInstallment.interest > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Juros do parcelamento</span>
                          <span className="font-medium">+{selectedInstallment.interest.toFixed(2).replace(".", ",")}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrega</span>
                        <span className="font-medium text-foreground">
                          {couponData?.type === 'FREE_SHIPPING' ? (
                            <span className="text-primary font-bold">Grátis</span>
                          ) : (
                            formatPrice(deliveryFee)
                          )}
                        </span>
                      </div>
                      {deliveryEstimatedTime && (
                        <div className="flex justify-between text-primary mt-1 font-medium">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Estimativa de entrega</span>
                          <span>{deliveryEstimatedTime}</span>
                        </div>
                      )}
                      {paymentMethod === "Dinheiro" && needsChange === "sim" && changeFor && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Troco para</span>
                            <span className="font-medium text-foreground">R$ {changeFor}</span>
                          </div>
                          {parseCurrencyInput(changeFor) > finalTotal && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Troco</span>
                              <span className="font-medium text-foreground">{formatPrice(parseCurrencyInput(changeFor) - finalTotal)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-base">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="text-lg font-bold text-primary">{formatPrice(finalTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-card p-4">
              {step === "cart" &&
                (items.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"})
                      </span>
                      <span className="text-lg font-bold text-primary">{formatPrice(effectiveTotalPrice)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={goToDelivery}
                      className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
                    >
                      Continuar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-muted py-3.5 text-sm font-bold text-muted-foreground"
                  >
                    Escolha os produtos para continuar
                  </button>
                ))}

              {step === "delivery" && (
                <button
                  type="button"
                  onClick={goToPayment}
                  disabled={!canContinueDelivery}
                  className={`w-full rounded-2xl py-3.5 text-sm font-bold ${canContinueDelivery ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                >
                  Ir para pagamento
                </button>
              )}

              {step === "payment" && (
                <button
                  type="button"
                  onClick={goToConfirmation}
                  disabled={!isPaymentValid}
                  className={`w-full rounded-2xl py-3.5 text-sm font-bold ${isPaymentValid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                >
                  Revisar pedido
                </button>
              )}

              {step === "confirmation" && (
                <button
                  type="button"
                  onClick={finalizeOrder}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Finalizar"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm md:flex md:justify-end">
          <div className="h-full w-full bg-background md:relative md:mr-0 md:w-full md:max-w-md md:shadow-2xl">
            <div className="mx-auto flex h-full w-full max-w-md flex-col">
              {isShowingSavedAddresses ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddressModalOpen(false);
                        setIsShowingSavedAddresses(false);
                      }}
                      className="rounded-full p-1 text-muted-foreground"
                      aria-label="Voltar"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-base font-semibold text-foreground">Endereços</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-[#f7f7f7] p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        setIsShowingSavedAddresses(false);
                      }}
                      className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">Buscar novo endereço</p>
                        <p className="text-xs text-muted-foreground">Digite e selecione pelo Google</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <SavedAddressesList
                      addresses={savedAddresses}
                      selectedAddressId={structuredAddress?.id}
                      onSelect={handleSelectSavedAddress}
                      onEdit={handleEditSavedAddress}
                      onDelete={handleDeleteSavedAddress}
                    />
                  </div>
                </>
              ) : (
                <AddressSearch
                  onSave={handleSaveAddress}
                  onCancel={() => {
                    if (savedAddresses.length > 0 && !editingAddress) {
                      setIsShowingSavedAddresses(true);
                      return;
                    }
                    setEditingAddress(null);
                    setIsAddressModalOpen(false);
                  }}
                  initialAddress={editingAddress}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={isFinishModalOpen}
        onOpenChange={(open) => {
          if (paymentMethod === "PIX" && !hasCopiedPix && !open) {
            return;
          }
          setIsFinishModalOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="z-[120] h-[100dvh] w-screen max-w-none rounded-none border-0 bg-[#5d5d5d]/85 p-0 shadow-none sm:h-auto sm:w-full sm:max-w-md sm:rounded-[32px] sm:border sm:border-border sm:bg-background sm:p-0 sm:shadow-2xl"
          onPointerDownOutside={(event) => {
            if (paymentMethod === "PIX" && !hasCopiedPix) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (paymentMethod === "PIX" && !hasCopiedPix) event.preventDefault();
          }}
        >
          <div className="flex h-full w-full items-center justify-center p-0 sm:p-0">
            <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background sm:h-full sm:max-h-[90vh] sm:max-w-md sm:rounded-[32px] sm:shadow-2xl">
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
                <div className="mx-auto max-w-[320px] text-center">
                  <h3 className="text-[22px] font-bold leading-tight text-[#686868]">
                    Agora é só enviar seu pedido via WhatsApp
                  </h3>
                </div>

                <div className="mt-7">
                  <p className="text-[18px] font-bold text-[#666666]">Pedido #{finishOrderNumber}</p>
                  <p className="mt-1 text-[15px] text-[#7d7d7d]">
                    {finishDate.toLocaleDateString("pt-BR")} -{" "}
                    {finishDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="mt-2 text-[16px] text-[#666666]">{checkoutName}</p>
                  <p className="text-[16px] text-[#666666]">
                    Contato: <span className="font-semibold">{checkoutPhone}</span>
                  </p>
                  <p className="mt-1 text-[16px] text-[#666666] leading-[1.35]">
                    Endereço: <span className="font-semibold">{checkoutAddress}</span>
                  </p>
                  {checkoutEstimatedTime && (
                    <p className="mt-1 text-[16px] leading-[1.35] flex items-center gap-1.5 text-primary">
                      <Clock className="h-4 w-4" />
                      Estimativa de entrega: <span className="font-semibold">{checkoutEstimatedTime}</span>
                    </p>
                  )}
                  {orderNote.trim() && (
                    <p className="mt-2 text-[16px] text-[#854D0E] bg-[#FEF9C3] p-3 rounded-lg leading-[1.35]">
                      <span className="font-bold">Observação:</span> {orderNote.trim()}
                    </p>
                  )}
                </div>

                <div className="mt-5 border-t border-[#e6e6e6] pt-5">
                  <div className="space-y-4">
                    {checkoutItems.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedVariation ?? "default"}`}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7b00ff] text-sm font-bold text-white">
                          {item.quantity}
                        </div>

                        <CartItemImage
                          productId={item.product.id}
                          productImage={item.product.image}
                          productName={item.product.name}
                          className="h-16 w-16 shrink-0 rounded-2xl bg-[#f4f4f4]"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 text-[15px] text-[#666666]">{item.product.name}</p>
                            <span className="shrink-0 text-[15px] font-semibold text-[#666666]">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                          {item.selectedVariation && (
                            <p className="mt-1 text-[15px] text-[#8b8b8b]">1x {item.selectedVariation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {checkoutOrderNote.trim() && (
                  <div className="mt-5 rounded-2xl bg-[#f7f7f7] p-4 text-[15px] text-[#666666]">
                    <p className="font-semibold">Observação do pedido</p>
                    <p className="mt-1 leading-[1.35]">{checkoutOrderNote.trim()}</p>
                  </div>
                )}

                <div className="mt-6 border-t border-[#e6e6e6] pt-5 text-[15px] text-[#666666]">
                  <div className="flex items-center justify-between gap-4">
                    <span>Total dos itens ({checkoutItems.length})</span>
                    <span className="font-semibold">{formatPrice(checkoutSubtotal)}</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-4">
                    <span>Frete</span>
                    <span className="font-semibold">{formatPrice(checkoutDeliveryFee)}</span>
                  </div>

                  {checkoutPaymentMethod === "PIX" && checkoutPixDiscount > 0 && (
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <span>Desconto PIX</span>
                      <span className="font-semibold">-{formatPrice(checkoutPixDiscount)}</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between gap-4 text-[16px] font-bold">
                    <span>Total pedido</span>
                    <span>{formatPrice(checkoutTotal)}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-1 text-[15px] text-[#666666]">
                  <p>
                    Pagamento: <span className="font-medium">{checkoutPaymentMethod === "PIX" ? "Online" : "Na Entrega"}</span>
                  </p>
                  <p>
                    Forma de pagamento: <span className="font-medium">{checkoutPaymentLabel}</span>
                  </p>
                  {(checkoutPaymentMethod === "cash" || checkoutPaymentMethod === "Dinheiro") && checkoutNeedsChange === "sim" && parseCurrencyInput(checkoutChangeFor) > checkoutTotal && (
                    <>
                      <p>
                        Troco para: <span className="font-medium">{formatPrice(parseCurrencyInput(checkoutChangeFor))}</span>
                      </p>
                      <p>
                        Valor do troco: <span className="font-medium">{formatPrice(parseCurrencyInput(checkoutChangeFor) - checkoutTotal)}</span>
                      </p>
                    </>
                  )}
                  {checkoutPaymentMethod === "PIX" && (
                    <p>
                      Chave PIX: <span className="font-semibold">{storeSettings?.pixKey || PIX_KEY}</span>{" "}
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="inline-flex items-center gap-1 text-[15px] text-[#666666] underline underline-offset-2"
                      >
                        copiar
                      </button>
                    </p>
                  )}
                </div>

                <p className="mx-auto mt-8 max-w-[290px] text-center text-[15px] leading-[1.35] text-[#7a7a7a]">
                  Clique no botão abaixo para encaminhar o pedido para o WhatsApp do vendedor.
                </p>
              </div>

              <div className="border-t border-[#e6e6e6] px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4 sm:px-8 sm:pb-6">
                {checkoutPaymentMethod === "PIX" && !hasCopiedPix ? (
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground"
                  >
                    <Copy className="h-5 w-5" />
                    Copiar PIX
                  </button>
                ) : storeSettings?.phone?.replace(/\D/g, "") ? (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-4 text-base font-bold text-white"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Enviar via WhatsApp
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartSidebar;
