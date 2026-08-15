import { useQuery } from "@tanstack/react-query";
import { getApiHeaders, getSubdomain } from "@/services/api";

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
  searchSuffix?: string;
  searchCity?: string;
}

function buildSettingsImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("settings/")) {
    return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
  }

  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
}

export function useStoreSettings() {
  const subdomain = getSubdomain();
  return useQuery({
    queryKey: ["store-settings", subdomain],
    queryFn: async (): Promise<StoreSettings> => {
      const response = await fetch(
        `${import.meta.env.VITE_ADMIN_API}/store/settings`,
        {
          headers: getApiHeaders(),
        },
      );
      if (response.status === 404) {
        throw new Error("STORE_NOT_FOUND");
      }
      if (response.status === 403) {
        throw new Error("STORE_OFFLINE");
      }
      if (!response.ok) throw new Error("Failed to fetch store settings");
      const data = await response.json();
      
      let searchCity = "Campo Grande";
      let searchSuffix = ", Campo Grande, MS, Brasil";

      const allowAboveMax = data.deliveryRanges?.allowAboveMax;

      if (data.deliveryOriginCep) {
        try {
          const cleanCep = data.deliveryOriginCep.replace(/\D/g, "");
          const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const viaCepData = await viaCepRes.json();
          if (!viaCepData.erro) {
            searchCity = viaCepData.localidade;
            const state = viaCepData.uf;
            searchSuffix = allowAboveMax ? ", Brasil" : `, ${searchCity}, ${state}, Brasil`;
          } else if (allowAboveMax) {
            searchSuffix = ", Brasil";
          }
        } catch (e) {
          if (allowAboveMax) searchSuffix = ", Brasil";
        }
      } else if (allowAboveMax) {
        searchSuffix = ", Brasil";
      }

      return {
        ...data,
        searchCity,
        searchSuffix,
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
    retry: false,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  });
}
