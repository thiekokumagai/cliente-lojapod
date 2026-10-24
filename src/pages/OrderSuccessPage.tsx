import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, MapPin, MessageCircle, ArrowLeft, Loader2, CreditCard } from "lucide-react";
import { ordersService } from "@/services/orders";
import { useStoreSettings } from "@/hooks/useStoreSettings";
const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: storeSettings } = useStoreSettings();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transactionId = searchParams.get("transaction_id") || searchParams.get("transaction_nsu");
  const slug = searchParams.get("slug");

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadAndVerifyOrder() {
      try {
        setLoading(true);

        let loadedOrder = null;
        try {
          const statusRes = await ordersService.checkPaymentStatus(id, transactionId || undefined, slug || undefined);
          if (statusRes && (statusRes as any).order) {
            loadedOrder = (statusRes as any).order;
          }
        } catch (e) {
          // Fallback
        }

        if (!loadedOrder) {
          loadedOrder = await ordersService.getStoreOrder(id);
        }

        if (isMounted) {
          setOrder(loadedOrder);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError("Não foi possível carregar as informações do pedido.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAndVerifyOrder();

    return () => {
      isMounted = false;
    };
  }, [id, transactionId, slug]);

  const handleOpenWhatsApp = () => {
    if (!order) return;

    const storePhone = storeSettings?.phone?.replace(/\D/g, "") || "";
    if (!storePhone) {
      window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`, "_blank");
      return;
    }

    const text = encodeURIComponent(buildWhatsAppText());
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const urlApp = `whatsapp://send?phone=${storePhone}&text=${text}`;
    const urlWeb = `https://api.whatsapp.com/send?phone=${storePhone}&text=${text}`;

    if (isMobile) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(urlWeb, "_blank", "noopener,noreferrer");
        }
      }, 1500);
    } else {
      window.open(urlWeb, "_blank", "noopener,noreferrer");
    }
  };

  const buildWhatsAppText = () => {
    if (!order) return "";

    const itemsFormatted = (order.items || [])
      .map((item: any) => {
        const variation = item.variation ? ` (${item.variation})` : "";
        return `${item.quantity}x ${item.productName || item.product?.name || "Produto"}${variation} - ${formatPrice(Number(item.price) * item.quantity)}`;
      })
      .join("\n");

    const lines = [
      `Olá, meu nome é ${order.customerName || "-"}, realizei o pedido #${order.orderNumber} através do site.`,
      `--------`,
      ``,
      itemsFormatted,
      ``,
      `--------`,
      `Total dos itens: ${formatPrice(Number(order.itemsTotal || 0))}`,
      order.freight > 0 ? `Taxa de entrega: ${formatPrice(Number(order.freight))}` : `Taxa de entrega: Grátis`,
      `Valor Total: ${formatPrice(Number(order.totalOrder || 0))}`,
      `Forma de pagamento: Cartão de Crédito Online (Aprovado)`,
      `Status do pagamento: ${order.paymentStatus === "PAID" ? "PAGO ✅" : "Processando"}`,
    ];

    if (order.deliveryModality === "STORE_PICKUP") {
      lines.push(`Entrega: Retirada na loja`);
    } else {
      const addr = [order.street, order.number, order.neighborhood, order.city, order.state].filter(Boolean).join(", ");
      lines.push(`Endereço: ${addr}`);
    }

    if (order.observation) {
      lines.push(`Observação: ${order.observation}`);
    }

    return lines.join("\n");
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">Confirmando seu pagamento...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ArrowLeft className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Pedido não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Não conseguimos localizar seu pedido."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Voltar para a loja
        </button>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const orderDate = new Date(order.createdAt || Date.now());

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-6 sm:py-12">
      <div className="mx-auto max-w-md px-4">
        <div className="overflow-hidden rounded-3xl bg-background p-6 shadow-xl border border-border/60 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {isPaid ? "Pagamento Confirmado!" : "Pedido Realizado com Sucesso!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPaid
                ? "Seu pagamento via cartão online foi aprovado com sucesso."
                : "Recebemos o seu pedido e estamos processando o pagamento."}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-muted/30 p-4 border border-border/40">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Número do Pedido</p>
                <p className="text-lg font-bold text-foreground">#{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-xs font-semibold text-foreground">
                  {orderDate.toLocaleDateString("pt-BR")} às {orderDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <p className="text-foreground">
                <span className="text-muted-foreground">Cliente: </span>
                <strong className="font-semibold">{order.customerName}</strong>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Telefone: </span>
                <strong className="font-semibold">{order.customerPhone}</strong>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Pagamento: </span>
                <strong className="font-semibold inline-flex items-center gap-1 text-emerald-600">
                  <CreditCard className="h-3.5 w-3.5" />
                  Cartão Online {isPaid ? "(Aprovado)" : "(Em processamento)"}
                </strong>
              </p>
              {order.deliveryModality === "STORE_PICKUP" ? (
                <p className="text-foreground">
                  <span className="text-muted-foreground">Modo: </span>
                  <strong className="font-semibold">Retirada na loja</strong>
                </p>
              ) : (
                <div className="flex items-start gap-1 pt-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                  <span className="text-foreground text-[11px] leading-relaxed">
                    {[order.street, order.number, order.neighborhood, order.city, order.state].filter(Boolean).join(", ")}
                    {order.complement ? ` (${order.complement})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Itens do Pedido</h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {(order.items || []).map((item: any, idx: number) => (
                <div key={item.id || idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {item.quantity}
                    </span>
                    <span className="text-xs font-medium text-foreground line-clamp-1">
                      {item.productName || item.product?.name || "Produto"}
                      {item.variation ? ` (${item.variation})` : ""}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-border/60 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.itemsTotal || 0))}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de Entrega</span>
                <span>{order.freight > 0 ? formatPrice(Number(order.freight)) : "Grátis"}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
                <span>Total Pago</span>
                <span className="text-primary text-base">{formatPrice(Number(order.totalOrder || 0))}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:bg-[#20ba59]"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar comprovante no WhatsApp
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full rounded-2xl border border-border bg-background py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted/30"
            >
              Voltar ao cardápio / Início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
