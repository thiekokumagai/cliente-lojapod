import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Store, Clock } from "lucide-react";

export function StoreTemporarilyClosedOverlay() {
  const { data: settings, isLoading } = useStoreSettings();

  if (isLoading || !settings?.isTemporarilyClosed) {
    return null;
  }

  const noticeMessage =
    settings.closedNoticeMessage?.trim() ||
    "No momento nossa loja está temporariamente fechada. Por favor, tente novamente mais tarde!";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
          <Store className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Loja Pausada Temporariamente
          </h2>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" /> Estamos indisponíveis no momento
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
            {noticeMessage}
          </p>
        </div>

        <div className="pt-2 text-xs text-slate-400 dark:text-slate-500">
          Agradecemos a sua compreensão!
        </div>
      </div>
    </div>
  );
}

export default StoreTemporarilyClosedOverlay;
