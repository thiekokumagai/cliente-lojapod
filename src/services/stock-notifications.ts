import { api } from "./api";

export interface CreateStockNotificationRequest {
  productId: string;
  productItemId?: string;
  customerName: string;
  customerPhone: string;
}

export const stockNotificationsService = {
  async create(data: CreateStockNotificationRequest): Promise<any> {
    return api.post("/store/stock-notifications", data);
  },
};
