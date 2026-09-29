import { useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBusinessStatus } from "@/hooks/useBusinessStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function StoreHoursTopBar() {
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const { data: settings, isLoading } = useStoreSettings();
  const { isOpen, nextOpenDateStr, businessHours, closingTimeStr } = useBusinessStatus(settings?.businessHours);

  if (isLoading) return null;

  return (
    <>
      <div className="w-full z-[50]">
        {isOpen ? (
          <div className="bg-emerald-600 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 w-full shadow-xs">
            <Clock className="h-3.5 w-3.5 shrink-0 text-white" />
            <span className="truncate">
              A loja está aberta. {closingTimeStr ? `Atendendo até às ${closingTimeStr}!` : 'Recebendo pedidos normalmente!'}
            </span>
            <button
              type="button"
              onClick={() => setHoursModalOpen(true)}
              className="underline ml-1 shrink-0 hover:text-emerald-100 transition-colors font-bold"
            >
              Ver horários
            </button>
          </div>
        ) : (
          <div className="bg-red-500 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 w-full shadow-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-white" />
            <span className="truncate">
              A loja está fechada. {nextOpenDateStr ? `Reabre ${nextOpenDateStr.toLowerCase()}.` : 'Pedidos no próximo horário útil.'}
            </span>
            <button
              type="button"
              onClick={() => setHoursModalOpen(true)}
              className="underline ml-1 shrink-0 hover:text-red-100 transition-colors font-bold"
            >
              Ver horários
            </button>
          </div>
        )}
      </div>

      <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horários de Atendimento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {businessHours && businessHours.length > 0 ? (
              WEEKDAYS.map((dayName, idx) => {
                const rule = businessHours.find((r: any) => r.days.includes(idx));
                const isToday = new Date().getDay() === idx;

                return (
                  <div
                    key={idx}
                    className={`flex justify-between py-2 border-b border-border-subtle last:border-0 ${
                      isToday ? 'font-bold text-primary' : 'text-fg-secondary'
                    }`}
                  >
                    <span>{dayName}</span>
                    <span className="text-right">
                      {rule && rule.intervals.length > 0
                        ? rule.intervals.map((i: any) => `${i.open} - ${i.close}`).join(', ')
                        : 'Fechado'}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">Horários não configurados.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
