import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, CreditCard, Lock, QrCode, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MercadoPagoPix } from "@/components/payment/MercadoPagoPix";
import { MercadoPagoCard } from "@/components/payment/MercadoPagoCard";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useStoreFavicon } from "@/hooks/useStoreFavicon";
import { useNoIndex } from "@/hooks/useNoIndex";
import { getMercadoPagoCheckout } from "@/lib/mercadopago";
import { ordersService } from "@/services/orders";
import { hexToHslTriplet, prefersDarkText } from "@/utils/color";
import { cn } from "@/lib/utils";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface PaymentOrder {
  orderNumber: number;
  totalOrder: number | string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items?: Array<{ productName?: string; quantity?: number }>;
}

const MAX_SUMMARY_ITEMS = 3;

/**
 * Esta rota fica fora do layout da loja, então a cor do tema não vem aplicada.
 * Aplica a cor da loja só dentro desta tela (variáveis --primary/--ring do Tailwind).
 */
function storeColorVars(hex?: string): CSSProperties | undefined {
  const hsl = hexToHslTriplet(hex);
  if (!hsl) return undefined;
  return {
    "--primary": hsl,
    "--ring": hsl,
    "--primary-foreground": prefersDarkText(hex) ? "222 47% 11%" : "0 0% 100%",
  } as CSSProperties;
}

function StateMessage({ tone, icon: Icon, children }: { tone: "error" | "muted"; icon: LucideIcon; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center text-sm",
        tone === "error" ? "bg-destructive/5 text-destructive" : "bg-muted/50 text-muted-foreground",
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon className="h-8 w-8 opacity-80" aria-hidden="true" />
      <p className="max-w-xs font-medium">{children}</p>
    </div>
  );
}

/** Pagamento online do pedido pelo Mercado Pago: Pix (QR Code) ou cartão. Rota `/pedido/:id/pagamento`. */
export default function MercadoPagoPaymentPage() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: storeSettings } = useStoreSettings();
  useStoreFavicon(storeSettings?.faviconUrl);

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToSuccess = () => navigate(`/pedido/${id}/sucesso`, { replace: true });

  useEffect(() => {
    if (!id) return;
    let active = true;
    ordersService
      .getStoreOrder(id)
      .then((loaded) => {
        if (!active) return;
        if (loaded?.paymentStatus === "PAID") {
          navigate(`/pedido/${id}/sucesso`, { replace: true });
          return;
        }
        setOrder(loaded);
      })
      .catch(() => active && setError("Não foi possível carregar o pedido."));
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const checkout = getMercadoPagoCheckout(storeSettings?.paymentGateways);
  const wantedMethod =
    searchParams.get("metodo") ?? (String(order?.paymentMethod ?? "").toLowerCase().includes("pix") ? "pix" : "cartao");
  const method: "pix" | "cartao" = wantedMethod === "pix" ? "pix" : "cartao";
  const brandColor = storeSettings?.primaryColor;
  const storeName = storeSettings?.storeName;
  // A forma foi escolhida no carrinho: aqui só paga. Etiqueta informativa, sem troca.
  const showsMethod =
    !error &&
    !!order &&
    !!storeSettings &&
    order.status !== "CANCELLED" &&
    ((method === "pix" && checkout.pix) || (method === "cartao" && checkout.card));

  let body: JSX.Element;
  if (error) {
    body = (
      <StateMessage tone="error" icon={AlertCircle}>
        {error}
      </StateMessage>
    );
  } else if (!id || !order || !storeSettings) {
    body = (
      <div className="space-y-3" role="status">
        <Skeleton className="mx-auto h-48 w-48 rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <p className="text-center text-xs text-muted-foreground">Carregando o pedido...</p>
      </div>
    );
  } else if (order.status === "CANCELLED") {
    body = (
      <StateMessage tone="error" icon={XCircle}>
        Este pedido foi cancelado.
      </StateMessage>
    );
  } else if (method === "pix" && checkout.pix) {
    body = <MercadoPagoPix orderId={id} onPaid={goToSuccess} />;
  } else if (method === "cartao" && checkout.card) {
    body = (
      <MercadoPagoCard
        orderId={id}
        amount={Number(order.totalOrder)}
        publicKey={checkout.publicKey}
        maxInstallments={checkout.maxInstallments}
        brandColor={brandColor}
        onApproved={goToSuccess}
        onInProcess={goToSuccess}
      />
    );
  } else {
    body = (
      <StateMessage tone="muted" icon={CreditCard}>
        O pagamento online com esta forma não está disponível nesta loja.
      </StateMessage>
    );
  }

  const items = order?.items ?? [];
  const shownItems = items.slice(0, MAX_SUMMARY_ITEMS);
  const hiddenItems = items.length - shownItems.length;

  return (
    <div
      style={storeColorVars(brandColor)}
      className="min-h-screen bg-background bg-[radial-gradient(120%_55%_at_50%_0%,hsl(var(--primary)/0.14),transparent_70%)]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pb-8 pt-5 sm:justify-center sm:pt-10">
        {/* Loja e selo de segurança */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {storeSettings?.logoUrl ? (
              <img
                src={storeSettings.logoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-black/5 bg-white object-contain"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                aria-hidden="true"
              >
                {(storeName || "L").trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-foreground">{storeName || "Pagamento"}</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Pagamento seguro
          </span>
        </header>

        {/* Comanda: canhoto do pedido + área de pagamento */}
        <main className="overflow-hidden rounded-3xl border border-black/[0.06] bg-card shadow-[0_12px_40px_-16px_rgba(15,23,42,0.25)]">
          <section className="px-5 pb-5 pt-5" aria-label="Resumo do pedido">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {order ? `Pagamento do pedido #${order.orderNumber}` : "Pagamento do pedido"}
            </p>
            {order ? (
              <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight text-foreground">
                {formatPrice(Number(order.totalOrder || 0))}
              </p>
            ) : (
              <Skeleton className="mt-2 h-9 w-40 rounded-lg" />
            )}
            {shownItems.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {shownItems.map((item, index) => (
                  <li key={`${item.productName}-${index}`} className="flex gap-2">
                    <span className="w-7 shrink-0 tabular-nums text-foreground/70">{item.quantity || 1}×</span>
                    <span className="truncate">{item.productName || "Item"}</span>
                  </li>
                ))}
                {hiddenItems > 0 && (
                  <li className="pl-9 text-xs">
                    + {hiddenItems} {hiddenItems === 1 ? "item" : "itens"}
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Picote da comanda */}
          <div className="relative h-0" aria-hidden="true">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-black/[0.06] bg-background" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-black/[0.06] bg-background" />
            <div className="mx-5 border-t-2 border-dashed border-black/[0.08]" />
          </div>

          <section className="space-y-4 px-5 pb-6 pt-5" aria-label="Pagamento">
            {showsMethod && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" data-testid="payment-method-label">
                {method === "pix" ? (
                  <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {method === "pix" ? "Pagamento com Pix" : "Pagamento com cartão"}
              </p>
            )}
            {body}
          </section>
        </main>

        <footer className="space-y-3 text-center">
          <p className="px-4 text-[11px] leading-relaxed text-muted-foreground">
            <Lock className="-mt-0.5 mr-1 inline h-3 w-3" aria-hidden="true" />
            Processado pelo Mercado Pago. Os dados do cartão não passam pela loja.
          </p>
          {id && (
            <Link
              to={`/pedido/${id}`}
              className="inline-block text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Ver andamento do pedido
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
