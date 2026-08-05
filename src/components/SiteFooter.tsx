import { Clock, MapPin, CreditCard, BadgeDollarSign, Instagram } from "lucide-react";
import logoFallback from "@/assets/logo.webp";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBusinessStatus, getTodayWeekdayName } from "@/hooks/useBusinessStatus";

const SiteFooter = () => {
  const { data: settings } = useStoreSettings();
  const { isOpen, todayRules } = useBusinessStatus(settings?.businessHours);

  const storeName = settings?.storeName || "Pod & Mais";
  const logo = settings?.logoUrl || logoFallback;
  const instagram = settings?.instagram || "podemais.cg";
  const city = settings?.city || "Campo Grande";
  const state = settings?.state || "MS";

  const acceptsCard = settings?.payOnDeliveryCardDebit || settings?.payOnDeliveryCardCredit;
  const acceptsPix = settings?.pixEnabled;
  const acceptsCash = settings?.payOnDeliveryCash;

  const PaymentMethods = () => (
    <>
      {acceptsCard && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-7 w-7" />
          <span className="text-sm font-medium">Cartão</span>
        </div>
      )}
      {acceptsPix && (
        <div className="flex items-center gap-2 text-[#32BCAD]">
          <BadgeDollarSign className="h-7 w-7" />
          <span className="text-sm font-medium">Pix</span>
        </div>
      )}
      {acceptsCash && (
        <div className="flex items-center gap-2 text-[#2EAD4A]">
          <span className="text-3xl leading-none">💵</span>
          <span className="text-sm font-medium">Dinheiro</span>
        </div>
      )}
      {!acceptsCard && !acceptsPix && !acceptsCash && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium">Consulte as opções no checkout</span>
        </div>
      )}
    </>
  );

  return (
    <footer id="contato" className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="rounded-2xl bg-background px-5 py-5 text-center shadow-sm md:hidden">
          <h3 className="text-lg font-semibold text-foreground">Formas de pagamento aceitas</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            <PaymentMethods />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-10 text-center md:grid md:grid-cols-[1fr_minmax(320px,1.4fr)_1fr] md:items-start md:text-left">
          <div className="flex flex-col items-center space-y-4 md:items-start">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <img src={logo} alt={storeName} className="h-12 w-12 object-contain" />
              <span className="font-display text-lg font-bold text-foreground">
                {storeName}
              </span>
            </div>
            {city && state && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground md:justify-start">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{city} - {state}</span>
              </div>
            )}
          </div>

          <div className="hidden h-full w-full items-center justify-center md:flex">
            <div className="w-full rounded-2xl bg-background px-5 py-5 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Formas de pagamento aceitas</h3>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
                <PaymentMethods />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4 md:items-end">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Horário de Funcionamento
            </h3>
            <div className="text-sm text-muted-foreground flex flex-col items-center md:items-end">
              <div className="flex items-center justify-center gap-2 md:justify-end mb-2">
                <Clock className="h-5 w-5 shrink-0 text-primary" />
                <p className="font-semibold text-foreground">{getTodayWeekdayName()}</p>
                {!isOpen && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Fechado
                  </span>
                )}
                {isOpen && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Aberto
                  </span>
                )}
              </div>
              {todayRules ? (
                todayRules.map((interval: any, index: number) => (
                  <p key={index} className="mt-1">
                    {interval.open} às {interval.close}
                  </p>
                ))
              ) : settings?.businessHours?.length > 0 ? (
                <p className="mt-1">Não abrimos hoje</p>
              ) : (
                <p className="mt-1">Horário não configurado</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 border-t border-border pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
          </p>
          {instagram && (
            <a
              href={`https://instagram.com/${instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram da ${storeName}`}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <Instagram className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
