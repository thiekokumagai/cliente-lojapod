import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Loader2,
  CreditCard,
  Package,
  Truck,
  Store,
  Check,
  XCircle,
} from "lucide-react";
import { ordersService } from "@/services/orders";
import { subscribeToOrderStatus } from "@/services/order-socket";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { formatWhatsAppNumber } from "@/utils/phone";

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

// Retirada na loja não tem etapa de despacho: "Pronto para Retirada" = CONFIRMED ("Separado" no admin).
const getStepStatusIndex = (status?: string, isStorePickup = false) => {
  if (isStorePickup) {
    return status === "COMPLETED" ? 2 : status === "PENDING" || !status ? 0 : 1;
  }
  switch (status) {
    case "PENDING":
      return 0;
    case "CONFIRMED":
      return 1;
    case "DISPATCHED":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return 0;
  }
};

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
        if (transactionId || slug) {
          try {
            const statusRes = await ordersService.checkPaymentStatus(id!, transactionId || undefined, slug || undefined);
            if (statusRes && (statusRes as any).order) {
              loadedOrder = (statusRes as any).order;
            }
          } catch (e) {
            // Fallback
          }
        }

        if (!loadedOrder) {
          loadedOrder = await ordersService.getStoreOrder(id!);
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

  // A confirmação da operadora pode chegar alguns segundos depois do retorno para cartão online
  const [pollAttempts, setPollAttempts] = useState(0);
  const MAX_POLL_ATTEMPTS = 30;
  const isCreditOnline = order?.paymentMethod === "Cartão de Crédito Online";
  const awaitingPayment = !!order && isCreditOnline && order.paymentStatus !== "PAID" && order.status !== "CANCELLED";

  useEffect(() => {
    if (!id || !awaitingPayment || pollAttempts >= MAX_POLL_ATTEMPTS) return;
    const timer = setTimeout(async () => {
      try {
        const statusRes: any = await ordersService.checkPaymentStatus(id, transactionId || undefined, slug || undefined);
        if (statusRes?.order) setOrder(statusRes.order);
      } catch (e) {
        // tenta de novo no próximo ciclo
      }
      setPollAttempts((n) => n + 1);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, awaitingPayment, pollAttempts, transactionId, slug]);

  // Atualização ao vivo pelo websocket da loja: o servidor avisa só quem entrou na sala deste pedido.
  // Sem polling: busca de novo apenas ao reconectar o socket e ao voltar para a aba.
  const orderStatus = order?.status;
  const orderPaymentStatus = order?.paymentStatus;
  const latestRef = useRef({ isCreditOnline, orderStatus, orderPaymentStatus });
  latestRef.current = { isCreditOnline, orderStatus, orderPaymentStatus };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const refetch = async () => {
      const latest = latestRef.current;
      if (latest.orderStatus === "COMPLETED" || latest.orderStatus === "CANCELLED") return;
      try {
        let updatedOrder = null;
        if (latest.isCreditOnline && latest.orderPaymentStatus !== "PAID" && (transactionId || slug)) {
          try {
            const statusRes: any = await ordersService.checkPaymentStatus(id, transactionId || undefined, slug || undefined);
            if (statusRes?.order) updatedOrder = statusRes.order;
          } catch {
            // fallback
          }
        }
        if (!updatedOrder) updatedOrder = await ordersService.getStoreOrder(id);
        if (isMounted && updatedOrder) setOrder(updatedOrder);
      } catch {
        // Erro transitório de rede: o próximo evento ou volta à aba atualiza
      }
    };

    const unsubscribe = subscribeToOrderStatus(
      [id],
      (event) => {
        if (!isMounted) return;
        setOrder((prev: any) =>
          prev ? { ...prev, status: event.status, paymentStatus: event.paymentStatus ?? prev.paymentStatus } : prev,
        );
      },
      refetch,
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [id, transactionId, slug]);

  const handleOpenWhatsApp = () => {
    if (!order) return;

    const storePhone = formatWhatsAppNumber(storeSettings?.phone);
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
        const isCombo = item.isCombo || !!item.comboId;
        const isBump = !!(item.isOrderBump || item.orderBumpId);
        const prefix = isCombo ? "[COMBO] " : isBump ? "[PEÇA TAMBÉM] " : "";
        const name = item.productName || item.product?.name || "Produto";
        let qtyStr = `${item.quantity} x ${prefix}${name}: ${formatPrice(Number(item.price) * item.quantity)}`;
        if (item.variation) {
          qtyStr += `\n    ${item.quantity}x ${item.variation}`;
        }
        if (item.comboSelections && Array.isArray(item.comboSelections)) {
          item.comboSelections.forEach((cs: any) => {
            const compVar = cs.variation ? ` (${cs.variation})` : "";
            qtyStr += `\n    • ${cs.quantity || 1}x ${cs.productName || "Item"}${compVar}`;
          });
        }
        return qtyStr;
      })
      .join("\n\n");

    const totalQty = (order.items || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);

    const lines = [
      `Olá, meu nome é ${order.customerName || "-"}, esse é o meu pedido realizado através do site`,
      `--------`,
      ``,
      itemsFormatted,
      ``,
      `--------`,
      `Quantidade de itens: ${totalQty} `,
      `Total dos itens: ${formatPrice(Number(order.itemsTotal || 0))}`,
      `--------`,
      order.deliveryModality === "STORE_PICKUP"
        ? `Entrega: Retirada na loja`
        : `Valor da entrega: ${Number(order.freight) === 0 ? "Grátis" : formatPrice(Number(order.freight))}`,
    ];

    if (order.couponTitle) {
      lines.push(`Cupom: ${order.couponTitle} ${order.couponDiscount ? formatPrice(Number(order.couponDiscount)) : ""}`);
    }

    if (Number(order.receiptDiscount) > 0) {
      lines.push(`Fidelidade: -${formatPrice(Number(order.receiptDiscount))}`);
    }

    if (Number(order.paymentDiscount) > 0) {
      lines.push(`Desconto: ${formatPrice(Number(order.paymentDiscount))}`);
    }

    if (Number(order.installmentSurcharge) > 0) {
      lines.push(`Acréscimo cartão: ${formatPrice(Number(order.installmentSurcharge))}`);
    }

    lines.push(`Valor Total: ${formatPrice(Number(order.totalOrder || 0))}`);
    lines.push(`Forma de pagamento: ${order.paymentMethod || "Não informado"}`);
    if (order.paymentMethod === "Cartão de Crédito Online") {
      lines.push(`Status do pagamento: ${order.paymentStatus === "PAID" ? "PAGO ✅" : "Processando"}`);
      lines.push(`Pagamento: Online`);
    } else {
      lines.push(`Status do pedido: ${order.status || "PENDING"}`);
    }

    if (order.deliveryModality === "STORE_PICKUP") {
      lines.push(`Para entregar em: Retirada na loja`);
    } else {
      const addr = [order.street, order.number, order.neighborhood, order.city, order.state].filter(Boolean).join(", ");
      const fullAddress = order.complement ? `${addr} (${order.complement})` : addr;
      lines.push(`Para entregar em: ${fullAddress || "-"}`);
    }

    if (order.observation && order.observation.trim() !== "") {
      lines.push(`Observação do Pedido: ${order.observation.trim()}`);
    }

    lines.push(`Contato: ${order.customerPhone || "-"}`);
    lines.push(`Número do pedido: ${order.orderNumber}`);
    lines.push(`Acompanhe seu pedido: ${window.location.origin}/pedido/${order.id}`);
    lines.push(`--------`);
    lines.push(`Pedido feito na ${storeSettings?.storeName || ""}`);

    return lines.join("\n");
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">Carregando informações do pedido...</p>
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
  const isCancelled = order.status === "CANCELLED";
  const isStorePickup = order.deliveryModality === "STORE_PICKUP";
  const currentStepIdx = getStepStatusIndex(order.status, isStorePickup);
  const isCompleted = order.status === "COMPLETED";

  // Se for cartão online e ainda não confirmou o pagamento, mostra tela de espera/retentativa
  if (isCreditOnline && !isPaid) {
    const stillChecking = !isCancelled && pollAttempts < MAX_POLL_ATTEMPTS;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
        {stillChecking ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-bold text-foreground">Aguardando confirmação do pagamento</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos confirmando o pagamento do pedido #{order.orderNumber} com a operadora do cartão. Não feche esta página.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <CreditCard className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Pagamento não aprovado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isCancelled
                ? "O prazo para pagar este pedido terminou e ele foi cancelado. Faça um novo pedido na loja."
                : "Não recebemos a confirmação do pagamento, então o pedido está aguardando pagamento. Tente pagar de novo ou escolha outra forma de pagamento."}
            </p>
            <div className="mt-6 flex w-full flex-col gap-3">
              {!isCancelled && order.gatewayCheckoutUrl && (
                <a
                  href={order.gatewayCheckoutUrl}
                  className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Tentar pagar novamente
                </a>
              )}
              {!isCancelled && (
                <button
                  type="button"
                  onClick={() => setPollAttempts(0)}
                  className="w-full rounded-2xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground"
                >
                  Já paguei, verificar de novo
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full rounded-2xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground"
              >
                Voltar para a loja
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const orderDate = new Date(order.createdAt || Date.now());

  const timelineSteps = [
    {
      key: "PENDING",
      label: "Pedido Recebido",
      description: "Aguardando confirmação da loja",
      icon: Clock,
    },
    {
      key: "CONFIRMED",
      label: isStorePickup ? "Pronto para Retirada" : "Em Preparo",
      description: isStorePickup
        ? "Seu pedido foi separado e está pronto para ser retirado na loja"
        : "Seu pedido está sendo preparado",
      icon: isStorePickup ? Store : Package,
    },
    {
      key: "DISPATCHED",
      label: "Saiu para Entrega",
      description: "O entregador está a caminho do seu endereço",
      icon: Truck,
    },
    {
      key: "COMPLETED",
      label: isStorePickup ? "Retirado" : "Entregue",
      description: isStorePickup
        ? "Pedido retirado com sucesso na loja"
        : "Pedido entregue com sucesso",
      icon: CheckCircle2,
    },
  ].filter((step) => !(isStorePickup && step.key === "DISPATCHED"));

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-6 sm:py-12">
      <div className="mx-auto max-w-md px-4">
        <div className="overflow-hidden rounded-3xl bg-background p-6 shadow-xl border border-border/60 sm:p-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isCancelled
                ? "bg-destructive/10 text-destructive"
                : isCompleted
                ? "bg-emerald-100 text-emerald-600"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-9 w-9" />
            ) : (
              <CheckCircle2 className="h-9 w-9" />
            )}
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {isCancelled
                ? "Pedido Cancelado"
                : isCompleted
                ? isStorePickup
                  ? "Pedido Retirado!"
                  : "Pedido Entregue!"
                : isStorePickup && (order.status === "CONFIRMED" || order.status === "DISPATCHED")
                ? "Pronto para Retirada!"
                : order.status === "DISPATCHED"
                ? "Saiu para Entrega!"
                : order.status === "CONFIRMED"
                ? "Pedido em Preparo!"
                : isPaid
                ? "Pagamento Confirmado!"
                : "Pedido Realizado com Sucesso!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCancelled
                ? "Este pedido foi cancelado."
                : isCompleted
                ? isStorePickup
                  ? "Seu pedido foi retirado com sucesso na loja."
                  : "Seu pedido foi entregue com sucesso."
                : isStorePickup && (order.status === "CONFIRMED" || order.status === "DISPATCHED")
                ? "Seu pedido foi separado. Você já pode retirar no estabelecimento."
                : order.status === "DISPATCHED"
                ? "O entregador já está a caminho."
                : order.status === "CONFIRMED"
                ? "A loja confirmou o pedido e está separando os itens."
                : isPaid
                ? "Seu pagamento foi confirmado com sucesso."
                : "Recebemos o seu pedido e estamos aguardando a confirmação da loja."}
            </p>
          </div>

          {/* Linha do Tempo de Status do Pedido */}
          <div className="mt-6 rounded-2xl bg-muted/30 p-4 sm:p-5 border border-border/40">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Acompanhamento do Pedido
            </h2>

            {isCancelled ? (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-3.5 border border-destructive/20 text-destructive">
                <XCircle className="h-6 w-6 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Pedido Cancelado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Este pedido foi cancelado. Para dúvidas, entre em contato com a loja.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative pl-1">
                {timelineSteps.map((step, idx) => {
                  const isPast = currentStepIdx > idx || isCompleted;
                  const isCurrent = currentStepIdx === idx && !isCompleted;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="relative flex items-start gap-3.5 pb-5 last:pb-0">
                      {idx < timelineSteps.length - 1 && (
                        <div
                          className={`absolute left-[15px] top-7 -bottom-1 w-0.5 transition-colors ${
                            isPast ? "bg-emerald-500" : isCurrent ? "bg-primary/40" : "bg-border/80"
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isPast
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground border border-border/60"
                        }`}
                      >
                        {isPast ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs sm:text-sm font-semibold ${
                              isCurrent
                                ? "text-primary font-bold"
                                : isPast
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary animate-pulse">
                              Em andamento
                            </span>
                          )}
                          {isPast && (
                            <span className="inline-flex items-center text-[11px] font-medium text-emerald-600">
                              Concluído
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-muted/30 p-4 border border-border/40">
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
                <strong className="font-semibold inline-flex items-center gap-1 text-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  {order.paymentMethod || "Não informado"}{" "}
                  {isPaid
                    ? "(Aprovado)"
                    : isCreditOnline
                    ? "(Em processamento)"
                    : "(Pendente / Na entrega)"}
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
                <span>{Number(order.freight) > 0 ? formatPrice(Number(order.freight)) : "Grátis"}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
                <span>Total Pedido</span>
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
