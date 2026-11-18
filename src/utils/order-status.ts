/**
 * Nome em português do STATUS DO PEDIDO para textos do cliente (ex.: mensagem do WhatsApp).
 * Usa os mesmos rótulos da linha do tempo da tela de acompanhamento (OrderSuccessPage).
 * Só apresentação: o status gravado e o contrato da API não mudam.
 */
export function formatOrderStatus(status?: string | null, deliveryModality?: string | null): string {
  const isPickup = deliveryModality === "STORE_PICKUP";
  const key = String(status ?? "").trim().toUpperCase();

  switch (key) {
    case "":
    case "PENDING":
      return "Pedido Recebido";
    case "CONFIRMED":
      return isPickup ? "Pronto para Retirada" : "Em Preparo";
    case "DISPATCHED":
      return isPickup ? "Pronto para Retirada" : "Saiu para Entrega";
    case "COMPLETED":
      return isPickup ? "Retirado" : "Entregue";
    case "CANCELLED":
    case "CANCELED":
      return "Pedido Cancelado";
    default:
      // Status novo que a tela ainda não conhece: nunca sai o código cru.
      return "Status indisponível";
  }
}
