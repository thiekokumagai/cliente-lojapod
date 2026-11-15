import { getSubdomain } from "@/services/api";
import { ordersService } from "@/services/orders";

/**
 * Pedidos feitos neste aparelho (checkout sem login).
 * Guarda SÓ identificadores: id, número, loja e data/hora. Nenhum dado pessoal.
 */
const STORAGE_KEY = "my-tracked-orders-v1";
export const MY_ORDERS_CHANGED_EVENT = "my-tracked-orders:changed";

export interface TrackedOrder {
  id: string;
  orderNumber: number | string;
  store: string;
  createdAt: string;
}

export interface TrackedOrderView extends TrackedOrder {
  /** null = não deu para consultar agora (rede/API fora). */
  status: string | null;
  deliveryModality?: string | null;
}

const FINAL_STATUSES = ["COMPLETED", "CANCELLED"];

const isSameLocalDay = (iso: string) => {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
};

const isTrackedOrder = (value: unknown): value is TrackedOrder => {
  const o = value as TrackedOrder;
  return !!o && typeof o.id === "string" && typeof o.store === "string" && typeof o.createdAt === "string";
};

/** Lê o storage já descartando pedidos de dias anteriores. */
function readStored(): TrackedOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isTrackedOrder).filter((o) => isSameLocalDay(o.createdAt)) : [];
  } catch {
    return [];
  }
}

function writeStored(orders: TrackedOrder[]) {
  try {
    if (orders.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // storage cheio/bloqueado: o menu só não aparece
  }
}

/** Chamar logo que o pedido é criado. */
export function rememberOrder(order: { id: string; orderNumber: number | string; createdAt: string }) {
  if (!order.id) return;
  const stored = readStored().filter((o) => o.id !== order.id);
  writeStored([
    { id: order.id, orderNumber: order.orderNumber, store: getSubdomain(), createdAt: order.createdAt },
    ...stored,
  ]);
  window.dispatchEvent(new Event(MY_ORDERS_CHANGED_EVENT));
}

/** Tira um pedido do aparelho (ex.: o socket avisou que foi concluído ou cancelado). */
export function forgetOrder(id: string) {
  writeStored(readStored().filter((o) => o.id !== id));
}

const isNotFound = (err: unknown) => {
  const status = (err as { status?: number })?.status;
  return status === 404 || status === 400;
};

/**
 * Consulta UMA vez cada pedido de hoje da loja atual (sem polling), limpa o storage
 * (dia anterior, finalizado, cancelado, id inexistente) e devolve os que seguem em andamento.
 */
export async function refreshActiveOrders(): Promise<TrackedOrderView[]> {
  const store = getSubdomain();
  const stored = readStored();
  const mine = stored.filter((o) => o.store === store);

  const results = await Promise.all(
    mine.map(async (o): Promise<{ order: TrackedOrder; drop: boolean; view?: TrackedOrderView }> => {
      try {
        const data = await ordersService.getStoreOrder(o.id);
        const status: string | null = data?.status ?? null;
        if (status && FINAL_STATUSES.includes(status)) return { order: o, drop: true };
        return {
          order: o,
          drop: false,
          view: { ...o, status, deliveryModality: data?.deliveryModality ?? null },
        };
      } catch (err) {
        if (isNotFound(err)) return { order: o, drop: true };
        return { order: o, drop: false, view: { ...o, status: null } };
      }
    }),
  );

  const dropped = new Set(results.filter((r) => r.drop).map((r) => r.order.id));
  const kept = stored.filter((o) => !dropped.has(o.id));
  writeStored(kept);

  return results
    .flatMap((r) => (r.view ? [r.view] : []))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderStatusLabel(status: string | null, deliveryModality?: string | null) {
  const isPickup = deliveryModality === "STORE_PICKUP";
  switch (status) {
    case "PENDING":
      return "Pedido recebido";
    case "CONFIRMED":
      return isPickup ? "Pronto para retirada" : "Em preparo";
    case "DISPATCHED":
      return isPickup ? "Pronto para retirada" : "Saiu para entrega";
    default:
      return "Status indisponível";
  }
}
