import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import OrderSuccessPage from "./OrderSuccessPage";

// Nada de rede: serviços, socket, configurações da loja e roteador são mocks.
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "order-1" }),
  useSearchParams: () => [new URLSearchParams("")],
  useNavigate: () => vi.fn(),
}));

const getStoreOrder = vi.fn();
vi.mock("@/services/orders", () => ({
  ordersService: {
    getStoreOrder: (id: string) => getStoreOrder(id),
    checkPaymentStatus: vi.fn(),
  },
}));
vi.mock("@/services/order-socket", () => ({ subscribeToOrderStatus: () => () => {} }));
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: { storeName: "Loja Teste", phone: "(67) 99999-0000" } }),
}));

const order = (overrides: Record<string, unknown> = {}) => ({
  id: "order-1",
  orderNumber: 65789,
  status: "PENDING",
  paymentStatus: "PENDING",
  paymentType: "entrega",
  paymentMethod: "credit",
  customerName: "Cliente Teste",
  customerPhone: "(67) 99999-0000",
  street: "Rua A",
  number: "1",
  neighborhood: "Centro",
  city: "Campo Grande",
  state: "MS",
  freight: 16,
  totalOrder: 136,
  createdAt: "2026-11-17T16:04:00.000Z",
  items: [{ productName: "Produto", quantity: 1, price: 120 }],
  ...overrides,
});

/** Abre a mensagem do WhatsApp e devolve o texto já decodificado. */
async function whatsappText(open: ReturnType<typeof vi.spyOn>) {
  fireEvent.click(await screen.findByText("Enviar comprovante no WhatsApp"));
  expect(open).toHaveBeenCalledTimes(1);
  const url = String(open.mock.calls[0][0]);
  return decodeURIComponent(url.slice(url.indexOf("text=") + 5));
}

describe("OrderSuccessPage: status do pedido em português no WhatsApp", () => {
  beforeEach(() => {
    getStoreOrder.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    ["PENDING", undefined, "Pedido Recebido"],
    ["CONFIRMED", undefined, "Em Preparo"],
    ["DISPATCHED", undefined, "Saiu para Entrega"],
    ["COMPLETED", undefined, "Entregue"],
    ["CANCELLED", undefined, "Pedido Cancelado"],
    ["CONFIRMED", "STORE_PICKUP", "Pronto para Retirada"],
    ["COMPLETED", "STORE_PICKUP", "Retirado"],
  ])("%s (%s) -> 'Status do pedido: %s', o mesmo rótulo da tela", async (status, modality, label) => {
    getStoreOrder.mockResolvedValue(order({ status, deliveryModality: modality }));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<OrderSuccessPage />);

    const text = await whatsappText(open);

    expect(text).toContain(`Status do pedido: ${label}`);
    expect(text).not.toMatch(/Status do pedido: [A-Z_]{4,}\b/); // nenhum código cru (PENDING, CONFIRMED...)
    // O rótulo da mensagem é o mesmo que a própria tela de acompanhamento mostra.
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it("sem status: 'Pedido Recebido' (antes saía 'PENDING')", async () => {
    getStoreOrder.mockResolvedValue(order({ status: undefined }));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<OrderSuccessPage />);

    const text = await whatsappText(open);

    expect(text).toContain("Status do pedido: Pedido Recebido");
    expect(text).not.toContain("PENDING");
  });

  it("status que a tela não conhece: 'Status indisponível', nunca o código cru", async () => {
    getStoreOrder.mockResolvedValue(order({ status: "REFUNDED" }));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<OrderSuccessPage />);

    const text = await whatsappText(open);

    expect(text).toContain("Status do pedido: Status indisponível");
    expect(text).not.toContain("REFUNDED");
  });

  it("injeta meta robots e googlebot com noindex na página do pedido e remove ao desmontar", async () => {
    getStoreOrder.mockResolvedValue(order());
    const { unmount } = render(<OrderSuccessPage />);

    await screen.findByText("Enviar comprovante no WhatsApp");

    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const googlebot = document.head.querySelector<HTMLMetaElement>('meta[name="googlebot"]');
    expect(robots?.getAttribute("content")).toBe("noindex, nofollow, noarchive, nosnippet");
    expect(googlebot?.getAttribute("content")).toBe("noindex, nofollow, noarchive, nosnippet");

    unmount();

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.head.querySelector('meta[name="googlebot"]')).toBeNull();
  });
});
