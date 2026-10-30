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
  facebookPixelEnabled?: boolean;
  facebookConversionsToken?: string;
  facebookConversionsApiEnabled?: boolean;
  isTemporarilyClosed?: boolean;
  closedNoticeMessage?: string | null;
  enableExchangePolicy?: boolean;
  exchangePolicy?: string | null;
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
  payOnDeliveryMealVoucher: boolean;
  payOnDeliveryFoodVoucher: boolean;
  paymentGateways?: any;
  paymentRules?: {
    id: string;
    paymentMethod: string;
    type: "discount" | "charge";
    value: number;
    parcelaMin?: number;
    parcelaMax?: number;
    passedToCustomer?: boolean;
  }[];
  freeShippingEnabled?: boolean;
  freeShippingMinValue?: number;
  storePickupEnabled?: boolean;
  deliveryType?: string;
  deliveryFixedFee?: number;
  deliveryOriginCep?: string;
  deliveryOriginNumber?: string;
  deliveryRanges?: {
    ranges: {
      id: string;
      distancia: number;
      valor: number;
    }[];
    allowAboveMax?: boolean;
    maxDeliveryKm?: number | string | null;
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
  searchState?: string;
  restrictToCity?: boolean;
  templateId?: 'classic' | 'menu-express' | 'urban' | 'urban';
  primaryColor?: string;
  secondaryColor?: string;
  priceColor?: string;
  defaultProductSort?: string | null;
  autoHideOutOfStock?: boolean;
  enableStockAlertNotification?: boolean;
  showVariationsOnCard?: boolean;
}

function buildSettingsImageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("settings/")) {
    return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
  }

  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${import.meta.env.VITE_MINIO_BUCKET || "lojapod"}/${path}`;
}

function getCachedSettings(subdomain: string): StoreSettings | undefined {
  try {
    const raw = localStorage.getItem(`store_settings_cache_${subdomain}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

export function useStoreSettings() {
  const subdomain = getSubdomain();
  return useQuery({
    queryKey: ["store-settings", subdomain],
    initialData: () => getCachedSettings(subdomain),
    initialDataUpdatedAt: 0,
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
      
      let searchCity = data.city || "";
      let searchState = data.state || "";

      const cepToLookup = (data.deliveryOriginCep || data.cep || "").replace(/\D/g, "");

      if ((!searchCity || !searchState) && cepToLookup.length >= 8) {
        try {
          const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepToLookup}/json/`);
          const viaCepData = await viaCepRes.json();
          if (!viaCepData.erro) {
            searchCity = searchCity || viaCepData.localidade;
            searchState = searchState || viaCepData.uf;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!searchCity) {
        searchCity = "Campo Grande";
        searchState = "MS";
      }

      // Se houver restrição de raio de entrega (maxDeliveryKm > 0 ou faixas de distância configuradas sem allowAboveMax),
      // restringir estritamente a busca para a cidade/estado da loja.
      const customMaxKm = data.deliveryRanges?.maxDeliveryKm !== undefined && data.deliveryRanges?.maxDeliveryKm !== null
        ? Number(data.deliveryRanges.maxDeliveryKm)
        : 0;
      const hasRanges = Array.isArray(data.deliveryRanges?.ranges) && data.deliveryRanges.ranges.length > 0;
      const allowAboveMax = Boolean(data.deliveryRanges?.allowAboveMax);

      const hasRadiusRestriction = customMaxKm > 0 || (hasRanges && !allowAboveMax) || (!allowAboveMax && data.deliveryType === "DISTANCE");
      const restrictToCity = hasRadiusRestriction;

      const searchSuffix = restrictToCity
        ? `, ${searchCity}, ${searchState}, Brasil`
        : ", Brasil";

      const result: StoreSettings = {
        ...data,
        searchCity,
        searchState,
        searchSuffix,
        restrictToCity,
        logoUrl: buildSettingsImageUrl(data.logoUrl),
        whiteLogoUrl: buildSettingsImageUrl(data.whiteLogoUrl),
        faviconUrl: buildSettingsImageUrl(data.faviconUrl),
        bannerUrls: (data.bannerUrls || []).map(buildSettingsImageUrl),
        marketingLinks: (data.marketingLinks || []).map((link: any) => ({
          ...link,
          imageUrl: buildSettingsImageUrl(link.imageUrl),
        })),
      };

      try {
        localStorage.setItem(`store_settings_cache_${subdomain}`, JSON.stringify(result));
      } catch (e) {
        // ignore
      }

      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
