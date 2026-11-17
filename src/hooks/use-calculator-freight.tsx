import { useCallback, useState } from "react";
import { useStoreSettings } from "./useStoreSettings";

type FreightResult = {
    distanceKm: number;
    duration: string;
    freightPrice: number | null;
    error: string | null;
    estimatedTimeStr: string | null;
};

type FreightError = {
    error: string;
    distanceKm?: number;
};

type DeliveryRange = {
    id: string;
    distancia: number;
    valor: number;
};

export function getFreightPrice(distanceKm: number, ranges: DeliveryRange[]): number | null {
    if (!ranges || ranges.length === 0) return null;
    
    // Assegurar que as faixas estão ordenadas por distância
    const sortedRanges = [...ranges].sort((a, b) => a.distancia - b.distancia);
    
    for (const tier of sortedRanges) {
        if (distanceKm <= tier.distancia) return tier.valor;
    }

    // Se ultrapassou a última faixa cadastrada, assume o valor da última faixa
    return sortedRanges[sortedRanges.length - 1].valor;
}

export function validateDistance(
    distanceKm: number, 
    ranges: DeliveryRange[], 
    allowAboveMax: boolean,
    customMaxDistance?: number | null
): FreightError | null {
    const km = Math.round(distanceKm * 10) / 10;
    const rangesMax = ranges && ranges.length > 0 ? Math.max(...ranges.map(r => r.distancia)) : 0;
    if (customMaxDistance !== null && customMaxDistance !== undefined && customMaxDistance > 0) {
        if (km > customMaxDistance) {
            return {
                error: `Endereço fora da área de entrega (máximo ${customMaxDistance}km).`,
                distanceKm: km,
            };
        }
    } else if (rangesMax > 0 && km > rangesMax && !allowAboveMax) {
        return {
            error: `Endereço fora da área de entrega (máximo ${rangesMax}km).`,
            distanceKm: km,
        };
    }

    return null;
}

export type FreightPriceSettings = {
    deliveryType?: string | null;
    deliveryFixedFee?: number | string | null;
    deliveryRanges?: { ranges?: DeliveryRange[] } | null;
    freeShippingEnabled?: boolean | null;
    freeShippingMinValue?: number | string | null;
};

/**
 * Preço do frete de uma entrega com a distância já medida (null = taxa a combinar).
 * Mesma regra que o servidor aplica no pedido público (api-lojapod: orders/domain/utils/freight-rules.ts);
 * os dois lados têm a mesma tabela de casos nos testes.
 */
export function computeFreightPrice(settings: FreightPriceSettings | null | undefined, km: number, cartTotal?: number): number | null {
    const ranges = settings?.deliveryRanges?.ranges || [];
    let freightPrice: number | null = null;

    if (settings?.deliveryType === "NO_FEE") {
        freightPrice = 0;
    } else if (settings?.deliveryType === "FIXED_FEE") {
        freightPrice = settings?.deliveryFixedFee ? Number(settings.deliveryFixedFee) : 0;
    } else if (settings?.deliveryType === "TO_COMBINE") {
        freightPrice = null; // Taxa a combinar
    } else {
        // Por distância (DISTANCE ou fallback)
        freightPrice = getFreightPrice(km, ranges);
    }

    // Regra de Frete Grátis
    const freeShippingMin = settings?.freeShippingMinValue ? Number(settings.freeShippingMinValue) : null;
    if (settings?.freeShippingEnabled && freeShippingMin !== null && !isNaN(freeShippingMin) && freeShippingMin > 0) {
        if (cartTotal && cartTotal >= freeShippingMin) {
            freightPrice = 0;
        }
    }

    return freightPrice;
}

export type OriginSettings = {
    street?: string | null;
    number?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    deliveryOriginCep?: string | null;
    deliveryOriginNumber?: string | null;
};

/** Endereço de origem (local ativo da loja) enviado ao Google. Mesmo texto que o servidor monta (freight-address.ts). */
export function buildOriginAddress(storeSettings: OriginSettings | null | undefined): string {
    const street = (storeSettings?.street || "").trim();
    const num = (storeSettings?.deliveryOriginNumber || storeSettings?.number || "").trim();
    const city = (storeSettings?.city || "").trim();
    const state = (storeSettings?.state || "").trim();
    const cep = (storeSettings?.deliveryOriginCep || storeSettings?.cep || "79000-000").replace(/\D/g, "");

    return street
        ? `${street}${num ? `, ${num}` : ""}${city ? `, ${city}` : ""}${state ? ` - ${state}` : ""}, CEP ${cep}, Brasil`
        : (num ? `CEP ${cep}, ${num}, Brasil` : `CEP ${cep}, Brasil`);
}

async function fetchRoute(origin: string, destination: string) {
    const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_MAPS_KEY,
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
            },
            body: JSON.stringify({
                origin: { address: origin },
                destination: { address: destination },
                travelMode: "DRIVE",
            }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.routes?.length) {
        throw new Error("Não foi possível calcular a rota");
    }

    return data.routes[0];
}

export function useFreight() {
    const { data: storeSettings } = useStoreSettings();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [price, setPrice] = useState<number | null>(null);

    const calculate = useCallback(async (destination: string, cartTotal?: number) => {
        try {
            setLoading(true);
            setError(null);

            if (!destination) {
                setError("Endereço de destino é obrigatório");
                return null;
            }

            // Origem da loja para cálculo de rota (o servidor monta o mesmo texto)
            const originAddress = buildOriginAddress(storeSettings);

            const route = await fetchRoute(originAddress, destination);

            const km = route.distanceMeters / 1000;
            const duration = route.duration;

            const ranges = storeSettings?.deliveryRanges?.ranges || [];
            const allowAboveMax = !!storeSettings?.deliveryRanges?.allowAboveMax;
            const customMaxDistance = storeSettings?.deliveryRanges?.maxDeliveryKm
                ? Number(storeSettings.deliveryRanges.maxDeliveryKm)
                : null;

            // Valida limite de distância/raio máximo para qualquer tipo de frete
            const distanceValidation = validateDistance(km, ranges, allowAboveMax, customMaxDistance);
            if (distanceValidation) {
                setError(distanceValidation.error);
                return distanceValidation;
            }

            // Tipo de entrega e frete grátis (mesma regra do servidor)
            const freightPrice = computeFreightPrice(storeSettings, km, cartTotal);

            // Parse duration to get minutes
            let durationMins = 0;
            if (duration) {
                const secs = parseInt(duration.replace("s", ""), 10);
                if (!isNaN(secs)) {
                    durationMins = Math.ceil(secs / 60);
                }
            }

            let estimatedTimeStr = null;
            if (durationMins > 0) {
                let minTime = durationMins + 15;
                let maxTime = durationMins + 25;
                
                minTime = Math.ceil(minTime / 5) * 5;
                maxTime = Math.ceil(maxTime / 5) * 5;

                estimatedTimeStr = `${minTime} a ${maxTime} minutos`;
            }

            const result: FreightResult = {
                distanceKm: Math.round(km * 10) / 10,
                duration,
                freightPrice,
                error: null,
                estimatedTimeStr,
            };

            setDistanceKm(result.distanceKm);
            setPrice(result.freightPrice);
            setError(null);

            return result;
        } catch (err) {
            setError("Erro ao calcular frete");
            return null;
        } finally {
            setLoading(false);
        }
    }, [storeSettings]);

    return {
        calculate,
        loading,
        error,
        distanceKm,
        price,
    };
}
