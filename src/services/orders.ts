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
    unitPrice: number;
    subTotal: number;
    variationString?: string;
  }>;
}

export const ordersService = {
  async createStoreOrder(payload: CreateOrderPayload) {
    return api.post<{ id: string; orderNumber: number }>("/store/orders", payload);
  },
};
