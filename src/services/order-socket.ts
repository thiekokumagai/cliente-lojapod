import { io, type Socket } from "socket.io-client";

/** Payload do evento `order.status` (só status; nunca dado pessoal). */
export interface OrderStatusEvent {
  orderId: string;
  status: string;
  paymentStatus: string | null;
  updatedAt: string;
}

let socket: Socket | null = null;
let refs = 0;

function acquireSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.VITE_ADMIN_API?.replace(/\/api$/, "") || "http://localhost:3000";
    socket = io(url);
  }
  refs += 1;
  return socket;
}

function releaseSocket() {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Acompanha pedidos pelo mesmo websocket da loja. O servidor só manda `order.status`
 * para quem entrou na sala do pedido (`order.watch` com o orderId que o cliente já tem).
 * `onReconnect` roda quando a conexão volta depois de cair — o chamador busca o pedido de novo.
 * Devolve a função que cancela a assinatura.
 */
export function subscribeToOrderStatus(
  orderIds: string[],
  onStatus: (event: OrderStatusEvent) => void,
  onReconnect?: () => void,
): () => void {
  const ids = orderIds.filter(Boolean);
  if (ids.length === 0) return () => {};

  const watched = new Set(ids.map((id) => id.toLowerCase()));
  const s = acquireSocket();
  let skipNextConnect = !s.connected; // o primeiro connect é a conexão inicial, não uma volta

  const join = () => ids.forEach((orderId) => s.emit("order.watch", { orderId }));
  const handleConnect = () => {
    join();
    if (skipNextConnect) skipNextConnect = false;
    else onReconnect?.();
  };
  const handleStatus = (event: OrderStatusEvent) => {
    if (event && typeof event.orderId === "string" && watched.has(event.orderId.toLowerCase())) onStatus(event);
  };

  s.on("connect", handleConnect);
  s.on("order.status", handleStatus);
  if (s.connected) join();

  return () => {
    s.off("connect", handleConnect);
    s.off("order.status", handleStatus);
    if (s.connected) ids.forEach((orderId) => s.emit("order.unwatch", { orderId }));
    releaseSocket();
  };
}
