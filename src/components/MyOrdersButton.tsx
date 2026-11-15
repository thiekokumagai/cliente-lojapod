import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, ReceiptText } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { subscribeToOrderStatus } from "@/services/order-socket";
import {
  forgetOrder,
  getOrderStatusLabel,
  MY_ORDERS_CHANGED_EVENT,
  refreshActiveOrders,
  type TrackedOrderView,
} from "@/utils/my-orders";

/**
 * Botão fixo "Meus pedidos de hoje". Só aparece quando este aparelho tem pedido do dia
 * em andamento. O status é consultado ao carregar, ao fazer um pedido novo e ao abrir
 * a lista, e atualizado ao vivo pelo websocket — nunca em intervalo.
 * No celular é um botão redondo só com ícone e contador; o texto aparece a partir do desktop.
 */
const MyOrdersButton = () => {
  const { totalItems, isCartOpen, isFinishModalOpen } = useCart();
  const location = useLocation();
  const [orders, setOrders] = useState<TrackedOrderView[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setOrders(await refreshActiveOrders());
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MY_ORDERS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(MY_ORDERS_CHANGED_EVENT, refresh);
  }, [refresh]);

  // Status ao vivo pelo websocket (sala de cada pedido); ao reconectar, consulta de novo.
  const orderIdsKey = orders.map((o) => o.id).join(",");
  useEffect(() => {
    if (!orderIdsKey) return;
    return subscribeToOrderStatus(
      orderIdsKey.split(","),
      (event) => {
        if (event.status === "COMPLETED" || event.status === "CANCELLED") {
          forgetOrder(event.orderId);
          setOrders((prev) => prev.filter((o) => o.id !== event.orderId));
          return;
        }
        setOrders((prev) => prev.map((o) => (o.id === event.orderId ? { ...o, status: event.status } : o)));
      },
      () => void refresh(),
    );
  }, [orderIdsKey, refresh]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refresh();
  };

  if (orders.length === 0) return null;

  // Some enquanto o carrinho ou o modal "enviar via WhatsApp" estão abertos: o cliente envia o pedido primeiro.
  const hideButton = isCartOpen || isFinishModalOpen;

  // Canto esquerdo, na mesma altura do botão do WhatsApp (direita), acima da barra do carrinho quando ela existe.
  const isProductPage = location.pathname.startsWith("/produto/");
  let mobileBottom = "bottom-6";
  if (isProductPage && totalItems > 0) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+160px+var(--cart-bar-extra,0px))]";
  } else if (isProductPage) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+100px)]";
  } else if (totalItems > 0) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+80px+var(--cart-bar-extra,0px))]";
  }

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className={`fixed left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 md:bottom-6 md:left-6 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 md:text-sm md:font-semibold ${mobileBottom}`}
          aria-label={`Meus pedidos de hoje: ${orders.length} em andamento`}
        >
          <ReceiptText className="h-5 w-5 md:h-4 md:w-4" />
          <span className="hidden md:inline">Meus pedidos de hoje</span>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground ring-2 ring-background md:static md:ring-0 md:bg-white md:text-primary">
            {orders.length}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Meus pedidos de hoje</DialogTitle>
            <DialogDescription>Pedidos em andamento feitos neste aparelho.</DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/pedido/${order.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Pedido #{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {getOrderStatusLabel(order.status, order.deliveryModality)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyOrdersButton;
