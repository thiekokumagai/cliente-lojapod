import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
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
vi.mock("@/hooks/useStoreSettings", () => ({ useStoreSettings: () => ({ data: { storeName: "Loja Teste", phone: "" } }) }));

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

const paymentLine = () => screen.getByText("Pagamento:").parentElement as HTMLElement;

describe("OrderSuccessPage: forma de pagamento em português", () => {
  beforeEach(() => {
    getStoreOrder.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("credit pendente: 'Cartão de Crédito (Pendente / Na entrega)' e nunca 'credit'", async () => {
    getStoreOrder.mockResolvedValue(order({ paymentMethod: "credit", paymentStatus: "PENDING" }));
    render(<OrderSuccessPage />);

    await waitFor(() => expect(screen.getByText("Pagamento:")).toBeInTheDocument());
    expect(paymentLine().textContent).toContain("Cartão de Crédito (Pendente / Na entrega)");
    expect(paymentLine().textContent).not.toMatch(/credit\b/);
  });

  it("credit pago: 'Cartão de Crédito (Aprovado)'", async () => {
    getStoreOrder.mockResolvedValue(order({ paymentMethod: "credit", paymentStatus: "PAID" }));
    render(<OrderSuccessPage />);

    await waitFor(() => expect(screen.getByText("Pagamento:")).toBeInTheDocument());
    expect(paymentLine().textContent).toContain("Cartão de Crédito (Aprovado)");
  });

  it.each([
    ["pix", "Pix"],
    ["PIX", "Pix"],
    ["debit", "Cartão de Débito"],
    ["cash", "Dinheiro"],
    ["Cash", "Dinheiro"],
    ["meal_voucher", "Vale refeição"],
    ["food_voucher", "Vale alimentação"],
  ])("%s aparece como %s", async (method, label) => {
    getStoreOrder.mockResolvedValue(order({ paymentMethod: method }));
    render(<OrderSuccessPage />);

    await waitFor(() => expect(screen.getByText("Pagamento:")).toBeInTheDocument());
    expect(paymentLine().textContent).toContain(label);
    expect(paymentLine().textContent).not.toMatch(/credit|debit|cash|voucher|_/i);
  });

  it("sem forma de pagamento: 'Não informado'", async () => {
    getStoreOrder.mockResolvedValue(order({ paymentMethod: "" }));
    render(<OrderSuccessPage />);

    await waitFor(() => expect(screen.getByText("Pagamento:")).toBeInTheDocument());
    expect(paymentLine().textContent).toContain("Não informado");
  });

  it("mensagem do WhatsApp: 'Forma de pagamento: Cartão de Crédito' (não 'credit')", async () => {
    getStoreOrder.mockResolvedValue(order({ paymentMethod: "credit" }));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<OrderSuccessPage />);

    fireEvent.click(await screen.findByText("Enviar comprovante no WhatsApp"));

    expect(open).toHaveBeenCalledTimes(1);
    const url = String(open.mock.calls[0][0]);
    const text = decodeURIComponent(url.slice(url.indexOf("text=") + 5));
    expect(text).toContain("Forma de pagamento: Cartão de Crédito");
    expect(text).not.toMatch(/Forma de pagamento: credit/i);
  });
});
