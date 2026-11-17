import { api } from "./api";

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  itemsTotal: number;
  freight: number;
  paymentDiscount?: number;
  installmentSurcharge?: number;
  couponDiscount?: number;
  couponFreightDiscount?: number;
  receiptDiscount?: number;
  receiptSurcharge?: number;
  totalOrder: number;
  totalReceived: number;
  paymentType: string;
  paymentMethod: string;
  pixKey?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  complement?: string;
  status?: string;
  paymentStatus?: string;
  installments?: number;
  couponTitle?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    price?: number;
    subTotal?: number;
    variationString?: string;
    variation?: string;
    comboId?: string;
    isCombo?: boolean;
  }>;
}

export interface MercadoPagoPixResponse {
  paymentId: string;
  status: string;
  amount: number;
  /** Pix copia e cola */
  qrCode: string;
  /** Imagem PNG do QR Code em base64 */
  qrCodeBase64: string;
  ticketUrl: string | null;
  expiresAt: string | null;
}

export interface MercadoPagoCardPayload {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: string;
  payerEmail?: string;
  identification?: { type: string; number: string };
}

export interface MercadoPagoCardResponse {
  paid: boolean;
  status: "approved" | "in_process" | "rejected";
  paymentId: string;
  statusDetail?: string;
  message: string;
}

export const ordersService = {
  async createStoreOrder(payload: CreateOrderPayload) {
    return api.post<{ id: string; orderNumber: number }>("/store/orders", payload);
  },
  async getStoreOrder(orderId: string) {
    return api.get<any>(`/store/orders/${orderId}`);
  },
  async createOnlineCheckout(orderId: string, originUrl?: string) {
    return api.post<{ checkoutUrl: string; transactionId?: string }>(`/payments/checkout/${orderId}`, { originUrl });
  },
  /** Mercado Pago: o servidor calcula o valor a partir do pedido; o navegador não envia valor. */
  async createMercadoPagoPix(orderId: string) {
    return api.post<MercadoPagoPixResponse>(`/payments/mercadopago/pix/${orderId}`, {});
  },
  /** Mercado Pago: só o token do cartão (gerado no navegador) vai para a API, nunca os dados do cartão. */
  async createMercadoPagoCard(orderId: string, payload: MercadoPagoCardPayload) {
    return api.post<MercadoPagoCardResponse>(`/payments/mercadopago/card/${orderId}`, payload);
  },
  async checkPaymentStatus(orderId: string, transactionNsu?: string, slug?: string) {
    return api.post<{ paid: boolean; status: string; paymentStatus: string }>(`/payments/check-status/${orderId}`, { transactionNsu, slug });
  },
  async checkPhoneBlocked(phone: string) {
    try {
      const res = await api.get<{ isBlocked: boolean }>(`/store/orders/check-blocked?phone=${encodeURIComponent(phone)}`);
      return res.data;
    } catch {
      return { isBlocked: false };
    }
  },
};
