import { useQuery } from "@tanstack/react-query";
import { getApiHeaders } from "@/services/api";

interface StoreSettings {
  storeName: string;
  logoUrl?: string;
  whiteLogoUrl?: string;
  faviconUrl?: string;
  topHeaderText?: string;
  bannerUrls: string[];
  phone: string;
  instagram?: string;
  pixelId?: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  hideAddress: boolean;
  pixEnabled: boolean;
  pixKeyType?: string | null;
  pixKey?: string | null;
  pixHolder?: string | null;
  payOnDeliveryCash: boolean;
  payOnDeliveryCardDebit: boolean;
  payOnDeliveryCardCredit: boolean;
  paymentRules?: {
    id: string;
    paymentMethod: string;
    type: "discount" | "charge";
    value: number;
    parcelaMin?: number;
    parcelaMax?: number;
    passedToCustomer?: boolean;
  }[];
  deliveryOriginCep?: string;
  deliveryOriginNumber?: string;
  deliveryRanges?: {
    ranges: {
      id: string;
      distancia: number;
      valor: number;
    }[];
    allowAboveMax?: boolean;
  };
  marketingLinks?: {
    id: string;
    title: string;
    imageUrl: string;
    url: string;
    isActive: boolean;
    order: number;
  }[];
}

function buildSettingsImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  // If the path already includes 'settings/', we don't need to add it again
  if (path.startsWith("settings/")) {
    return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
  }

  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/settings/${path}`;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings> => {
      const response = await fetch(
        `${import.meta.env.VITE_ADMIN_API}/store/settings`,
        {
          headers: getApiHeaders(),
        },
      );
      if (!response.ok) throw new Error("Failed to fetch store settings");
      const data = await response.json();

      return {
        ...data,
        logoUrl: buildSettingsImageUrl(data.logoUrl),
        whiteLogoUrl: buildSettingsImageUrl(data.whiteLogoUrl),
        faviconUrl: buildSettingsImageUrl(data.faviconUrl),
        bannerUrls: (data.bannerUrls || []).map(buildSettingsImageUrl),
        marketingLinks: (data.marketingLinks || []).map((link: any) => ({
          ...link,
          imageUrl: buildSettingsImageUrl(link.imageUrl),
        })),
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  });
}
