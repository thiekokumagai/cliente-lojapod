import { useMemo } from "react";

export interface BusinessHourInterval {
  open: string;
  close: string;
}

export interface BusinessHourRule {
  id: string;
  days: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  intervals: BusinessHourInterval[];
}

export function useBusinessStatus(businessHours: BusinessHourRule[] | undefined | null) {
  return useMemo(() => {
    if (!businessHours || businessHours.length === 0) {
      return {
        isOpen: false, // Default to closed if not configured
        closingTimeStr: null,
        todayRules: null,
        nextOpenDateStr: null,
        businessHours: []
      };
    }

    const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Campo_Grande" });
    const now = new Date(nowStr);
    const dayOfWeek = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayRule = businessHours.find((rule) => rule.days.includes(dayOfWeek));

    let isOpen = false;
    let closingTimeStr: string | null = null;
    if (todayRule && todayRule.intervals.length > 0) {
      for (const interval of todayRule.intervals) {
        const [openHour, openMin] = interval.open.split(":").map(Number);
        const [closeHour, closeMin] = interval.close.split(":").map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

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
        const targetRule = businessHours.find((rule) => rule.days.includes(targetDay));
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
      businessHours
    };
  }, [businessHours]);
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function getTodayWeekdayName() {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Campo_Grande" });
  const day = new Date(nowStr).getDay();
  return WEEKDAYS[day];
}
