import { getApiHeaders } from "./api";

export interface StoreLoyaltyProgram {
  id: string;
  storeId: string;
  isActive: boolean;
  type: "FREE_PRODUCT" | "POINTS_DISCOUNT" | "CASHBACK" | "PROGRESSIVE_DISCOUNT" | "HYBRID";
  stampsRequired: number;
  minOrderValue: number;
  validityDays: number;
  rewardText: string;
  rewardCouponCode?: string | null;
  rewardDiscount?: number | null;
  pointsPerReal?: number;
  pointsRedemptionValue?: number;
  cashbackPercent?: number;
  progressiveTiers?: { minOrders: number; discountPercent: number }[] | null;
}

export interface StoreLoyaltyCard {
  id: string;
  storeId: string;
  customerPhone: string;
  customerName?: string | null;
  currentStamps: number;
  pointsBalance: number;
  cashbackBalance: number;
  totalCompleted: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "REDEEMED";
  redemptions?: any[];
}

export interface StoreLoyaltyCardResponse {
  card: StoreLoyaltyCard | null;
  program: StoreLoyaltyProgram | null;
}

export const storeLoyaltyService = {
  getCard: async (phone?: string): Promise<StoreLoyaltyCardResponse> => {
    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
    const url = cleanPhone
      ? `${import.meta.env.VITE_ADMIN_API}/store/loyalty/card?phone=${encodeURIComponent(cleanPhone)}`
      : `${import.meta.env.VITE_ADMIN_API}/store/loyalty/card`;
    const response = await fetch(url, {
      headers: getApiHeaders(),
    });
    if (!response.ok) {
      throw new Error("Erro ao consultar cartão fidelidade");
    }
    return response.json();
  },

  redeemReward: async (payload: { phone: string; rewardType?: string; rewardTitle?: string; orderId?: string }) => {
    const cleanPhone = payload.phone.replace(/\D/g, "");
    const response = await fetch(`${import.meta.env.VITE_ADMIN_API}/store/loyalty/redeem`, {
      method: "POST",
      headers: {
        ...getApiHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: cleanPhone,
        rewardType: payload.rewardType,
        rewardTitle: payload.rewardTitle,
        orderId: payload.orderId,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Erro ao resgatar recompensa");
    }
    return response.json();
  },
};
