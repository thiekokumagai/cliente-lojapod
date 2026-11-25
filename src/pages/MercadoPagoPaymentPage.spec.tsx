import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MercadoPagoPaymentPage from "./MercadoPagoPaymentPage";

// Nada de rede: serviço, configurações da loja, roteador e telas de pagamento são mocks.
const navigate = vi.fn();
let search = "metodo=pix";
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "order-1" }),
  useSearchParams: () => [new URLSearchParams(search)],
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));

const getStoreOrder = vi.fn();
vi.mock("@/services/orders", () => ({ ordersService: { getStoreOrder: (id: string) => getStoreOrder(id) } }));

let gateways: unknown;
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: { paymentGateways: gateways } }),
}));

vi.mock("@/components/payment/MercadoPagoPix", () => ({
  MercadoPagoPix: ({ orderId, onPaid }: { orderId: string; onPaid: () => void }) => (
    <button onClick={onPaid}>pix-{orderId}</button>
  ),
}));
vi.mock("@/components/payment/MercadoPagoCard", () => ({
  MercadoPagoCard: (props: { orderId: string; amount: number; publicKey: string; maxInstallments: number }) => (
    <div>
      card-{props.orderId}-{props.amount}-{props.publicKey}-{props.maxInstallments}
    </div>
  ),
}));

const mp = { enabled: true, acceptPix: true, acceptCreditCard: true, publicKey: "TEST-public", maxInstallments: 4 };
const order = (overrides: Record<string, unknown> = {}) => ({
  orderNumber: 77,
  totalOrder: "100.00",
  status: "PENDING",
  paymentStatus: "PENDING",
  ...overrides,
});

beforeEach(() => {
  navigate.mockClear();
  getStoreOrder.mockReset();
  search = "metodo=pix";
  gateways = { mercadopago: mp };
});

describe("MercadoPagoPaymentPage", () => {
  it("mostra o Pix do pedido e vai para a tela de sucesso quando é pago", async () => {
    getStoreOrder.mockResolvedValue(order());
    render(<MercadoPagoPaymentPage />);

    const pixButton = await screen.findByText("pix-order-1");
    expect(screen.getByText("Pagamento do pedido #77")).toBeInTheDocument();
    pixButton.click();
    expect(navigate).toHaveBeenCalledWith("/pedido/order-1/sucesso", { replace: true });
  });

  it("cartão: passa public key, parcelas e o valor do pedido (só exibição)", async () => {
    search = "metodo=cartao";
    getStoreOrder.mockResolvedValue(order());
    render(<MercadoPagoPaymentPage />);
    expect(await screen.findByText("card-order-1-100-TEST-public-4")).toBeInTheDocument();
  });

  it("pedido já pago vai direto para a tela de sucesso", async () => {
    getStoreOrder.mockResolvedValue(order({ paymentStatus: "PAID" }));
    render(<MercadoPagoPaymentPage />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/pedido/order-1/sucesso", { replace: true }));
  });

  it("pedido cancelado não oferece pagamento", async () => {
    getStoreOrder.mockResolvedValue(order({ status: "CANCELLED" }));
    render(<MercadoPagoPaymentPage />);
    expect(await screen.findByText("Este pedido foi cancelado.")).toBeInTheDocument();
    expect(screen.queryByText("pix-order-1")).toBeNull();
  });

  it("forma não disponível na loja mostra aviso em vez de pagamento", async () => {
    gateways = { mercadopago: { ...mp, acceptPix: false } };
    getStoreOrder.mockResolvedValue(order());
    render(<MercadoPagoPaymentPage />);
    expect(await screen.findByText(/não está disponível nesta loja/)).toBeInTheDocument();
  });

  it("erro ao carregar o pedido mostra mensagem", async () => {
    getStoreOrder.mockRejectedValue(new Error("falhou"));
    render(<MercadoPagoPaymentPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o pedido.");
  });
});

describe("MercadoPagoPaymentPage: resumo e troca de forma", () => {
  it("mostra até 3 itens do pedido e quantos faltam", async () => {
    getStoreOrder.mockResolvedValue(
      order({ items: [1, 2, 3, 4, 5].map((n) => ({ productName: `Item ${n}`, quantity: n })) }),
    );
    render(<MercadoPagoPaymentPage />);
    expect(await screen.findByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
    expect(screen.queryByText("Item 4")).toBeNull();
    expect(screen.getByText("+ 2 itens")).toBeInTheDocument();
  });

  it("loja com Pix e cartão: troca de forma pela URL, sem recarregar o pedido", async () => {
    getStoreOrder.mockResolvedValue(order());
    render(<MercadoPagoPaymentPage />);
    await screen.findByText("pix-order-1");
    expect(screen.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "true");
    screen.getByRole("button", { name: "Cartão" }).click();
    expect(navigate).toHaveBeenCalledWith("/pedido/order-1/pagamento?metodo=cartao", { replace: true });
  });

  it("loja só com Pix: não mostra a troca de forma", async () => {
    gateways = { mercadopago: { ...mp, acceptCreditCard: false } };
    getStoreOrder.mockResolvedValue(order());
    render(<MercadoPagoPaymentPage />);
    await screen.findByText("pix-order-1");
    expect(screen.queryByRole("button", { name: "Cartão" })).toBeNull();
  });
});
