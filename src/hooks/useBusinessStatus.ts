import { useMemo } from "react";
import { useStoreSettings } from "./useStoreSettings";

export interface BusinessHourInterval {
  open: string;
  close: string;
}

export interface BusinessHourRule {
  id: string;
  days: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  intervals: BusinessHourInterval[];
}

export function getTimezoneFromCepOrState(
  cep?: string | null,
  state?: string | null
): string {
  // 1. Sigla do Estado (UF)
  const uf = state?.trim().toUpperCase();
  if (uf) {
    if (uf === "AC") return "America/Rio_Branco"; // Acre: UTC-5
    if (uf === "MT") return "America/Cuiaba"; // Mato Grosso: UTC-4
    if (uf === "MS") return "America/Campo_Grande"; // Mato Grosso do Sul: UTC-4
    if (uf === "RO") return "America/Porto_Velho"; // Rondônia: UTC-4
    if (uf === "RR") return "America/Boa_Vista"; // Roraima: UTC-4
    if (uf === "AM") return "America/Manaus"; // Amazonas: UTC-4
    return "America/Sao_Paulo"; // Demais estados: Horário de Brasília (UTC-3)
  }

  // 2. Faixa de CEP
  if (cep) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length >= 2) {
      const prefix2 = parseInt(cleanCep.slice(0, 2), 10);
      const prefix5 = cleanCep.length >= 5 ? parseInt(cleanCep.slice(0, 5), 10) : 0;

      // Fernando de Noronha (PE)
      if (prefix5 >= 53990 && prefix5 <= 53999) return "America/Noronha";

      // Acre (69900 a 69999)
      if (prefix2 === 69 && cleanCep.length >= 3 && cleanCep.charAt(2) === "9") {
        return "America/Rio_Branco";
      }

      // Rondônia (76800 a 76999)
      if (prefix5 >= 76800 && prefix5 <= 76999) return "America/Porto_Velho";

      // Roraima (69300 a 69399)
      if (prefix5 >= 69300 && prefix5 <= 69399) return "America/Boa_Vista";

      // Amazonas (69000 a 69899)
      if (prefix2 === 69) return "America/Manaus";

      // Mato Grosso (78000 a 78899)
      if (prefix2 === 78) return "America/Cuiaba";

      // Mato Grosso do Sul (79000 a 79999)
      if (prefix2 === 79) return "America/Campo_Grande";

      return "America/Sao_Paulo";
    }
  }

  return "America/Sao_Paulo";
}

export interface StoreLocationInfo {
  cep?: string | null;
  state?: string | null;
  deliveryOriginCep?: string | null;
}

export function useBusinessStatus(
  businessHours?: BusinessHourRule[] | undefined | null,
  locationInfo?: StoreLocationInfo | null
) {
  const { data: storeSettings } = useStoreSettings();

  const rules = businessHours !== undefined ? businessHours : storeSettings?.businessHours;
  const cep = locationInfo?.deliveryOriginCep || locationInfo?.cep || storeSettings?.deliveryOriginCep || storeSettings?.cep;
  const state = locationInfo?.state || storeSettings?.state;

  const timeZone = useMemo(() => getTimezoneFromCepOrState(cep, state), [cep, state]);

  return useMemo(() => {
    if (!rules || rules.length === 0) {
      return {
        isOpen: false, // Default to closed if not configured
        closingTimeStr: null,
        todayRules: null,
        nextOpenDateStr: null,
        businessHours: [],
        timeZone,
        todayWeekdayName: getTodayWeekdayName(timeZone)
      };
    }

    const nowStr = new Date().toLocaleString("en-US", { timeZone });
    const now = new Date(nowStr);
    const dayOfWeek = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayRule = rules.find((rule) => rule.days.includes(dayOfWeek));

    let isOpen = false;
    let closingTimeStr: string | null = null;
    if (todayRule && todayRule.intervals.length > 0) {
      for (const interval of todayRule.intervals) {
        const [openHour, openMin] = interval.open.split(":").map(Number);
        const [closeHour, closeMin] = interval.close.split(":").map(Number);
        const openMinutes = openHour * 60 + openMin;
        
        // Se a hora de fechar for 00:00, consideramos como 24:00 (fim do dia, 1440 minutos)
        let closeMinutes = closeHour * 60 + closeMin;
        if (closeHour === 0 && closeMin === 0) {
          closeMinutes = 1440;
        }

        if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
          isOpen = true;
          closingTimeStr = interval.close;
          break;
        }
      }
    }

    let nextOpenDateStr: string | null = null;
    if (!isOpen) {
      for (let offset = 0; offset < 7; offset++) {
        const targetDay = (dayOfWeek + offset) % 7;
        const targetRule = rules.find((rule) => rule.days.includes(targetDay));
        if (!targetRule || targetRule.intervals.length === 0) continue;

        const intervals = [...targetRule.intervals].sort((a, b) => a.open.localeCompare(b.open));

        for (const interval of intervals) {
          const [openHour, openMin] = interval.open.split(":").map(Number);
          const openMinutes = openHour * 60 + openMin;
          
          if (offset === 0) {
            if (openMinutes > currentMinutes) {
              nextOpenDateStr = `Hoje às ${interval.open}`;
              break;
            }
          } else if (offset === 1) {
            nextOpenDateStr = `Amanhã às ${interval.open}`;
            break;
          } else {
            nextOpenDateStr = `${WEEKDAYS[targetDay]} às ${interval.open}`;
            break;
          }
        }
        if (nextOpenDateStr) break;
      }
    }

    return {
      isOpen,
      closingTimeStr,
      todayRules: todayRule?.intervals || null,
      nextOpenDateStr,
      businessHours: rules,
      timeZone,
      todayWeekdayName: WEEKDAYS[dayOfWeek]
    };
  }, [rules, timeZone]);
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function getTodayWeekdayName(timeZone: string = "America/Sao_Paulo") {
  const nowStr = new Date().toLocaleString("en-US", { timeZone });
  const day = new Date(nowStr).getDay();
  return WEEKDAYS[day];
}
