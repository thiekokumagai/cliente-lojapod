import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MercadoPagoPix } from "./MercadoPagoPix";
import { formatCountdown } from "@/lib/mercadopago";

// Nada de rede: serviço de pedidos, websocket e toast são mocks.
const createMercadoPagoPix = vi.fn();
const checkPaymentStatus = vi.fn();
vi.mock("@/services/orders", () => ({
  ordersService: {
    createMercadoPagoPix: (id: string) => createMercadoPagoPix(id),
    checkPaymentStatus: (id: string) => checkPaymentStatus(id),
  },
}));

let socketHandler: ((event: { paymentStatus: string | null }) => void) | undefined;
vi.mock("@/services/order-socket", () => ({
  subscribeToOrderStatus: (_ids: string[], onStatus: typeof socketHandler) => {
    socketHandler = onStatus;
    return () => {
      socketHandler = undefined;
    };
  },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));

const pix = (expiresInMs: number | null) => ({
  paymentId: "987",
  status: "pending",
  amount: 100,
  qrCode: "00020126580014br.gov.bcb.pix-COPIA-E-COLA",
  qrCodeBase64: "QkFTRTY0",
  ticketUrl: null,
  expiresAt: expiresInMs === null ? null : new Date(Date.now() + expiresInMs).toISOString(),
});

beforeEach(() => {
  createMercadoPagoPix.mockReset();
  checkPaymentStatus.mockReset();
  checkPaymentStatus.mockResolvedValue({ paid: false, paymentStatus: "PENDING" });
  toastSuccess.mockClear();
  toastError.mockClear();
  socketHandler = undefined;
});

afterEach(() => vi.useRealTimers());

describe("formatCountdown", () => {
  it("mostra mm:ss e nunca negativo", () => {
    expect(formatCountdown(125_000)).toBe("02:05");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5000)).toBe("00:00");
  });
});

describe("MercadoPagoPix", () => {
  it("gera o Pix só pelo id do pedido e mostra QR Code, copia e cola e o prazo", async () => {
    createMercadoPagoPix.mockResolvedValue(pix(25 * 60_000));
    render(<MercadoPagoPix orderId="order-1" onPaid={vi.fn()} />);

    const img = (await screen.findByAltText("QR Code Pix")) as HTMLImageElement;
    expect(img.src).toBe("data:image/png;base64,QkFTRTY0");
    expect(screen.getByText("00020126580014br.gov.bcb.pix-COPIA-E-COLA")).toBeInTheDocument();
    expect(screen.getByText(/Expira em/)).toBeInTheDocument();
    // a tela não manda valor: só o id do pedido
    expect(createMercadoPagoPix).toHaveBeenCalledWith("order-1");
  });

  it("botão copiar leva o código Pix para a área de transferência", async () => {
    createMercadoPagoPix.mockResolvedValue(pix(null));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<MercadoPagoPix orderId="order-1" onPaid={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Copiar código Pix/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("00020126580014br.gov.bcb.pix-COPIA-E-COLA"));
    expect(toastSuccess).toHaveBeenCalledWith("Código Pix copiado!");
    expect(await screen.findByRole("button", { name: /Código copiado!/ })).toBeInTheDocument();
  });

  it("atualiza sozinho: aviso do websocket de pagamento confirmado chama onPaid uma vez", async () => {
    createMercadoPagoPix.mockResolvedValue(pix(null));
    const onPaid = vi.fn();
    render(<MercadoPagoPix orderId="order-1" onPaid={onPaid} />);
    await screen.findByAltText("QR Code Pix");

    act(() => socketHandler?.({ paymentStatus: "PENDING" }));
    expect(onPaid).not.toHaveBeenCalled();
    act(() => socketHandler?.({ paymentStatus: "PAID" }));
    act(() => socketHandler?.({ paymentStatus: "PAID" }));
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it("atualiza sozinho: a verificação periódica detecta o pagamento", async () => {
    createMercadoPagoPix.mockResolvedValue(pix(null));
    const onPaid = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MercadoPagoPix orderId="order-1" onPaid={onPaid} />);
    await screen.findByAltText("QR Code Pix");

    checkPaymentStatus.mockResolvedValue({ paid: true, paymentStatus: "PAID" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });

    expect(checkPaymentStatus).toHaveBeenCalledWith("order-1");
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it("QR Code vencido mostra aviso e gera um novo ao pedir", async () => {
    createMercadoPagoPix.mockResolvedValueOnce(pix(1500)).mockResolvedValueOnce(pix(25 * 60_000));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MercadoPagoPix orderId="order-1" onPaid={vi.fn()} />);
    await screen.findByAltText("QR Code Pix");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2200);
    });
    expect(screen.getByText("Este QR Code expirou.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar novo QR Code" }));
    await screen.findByAltText("QR Code Pix");
    expect(createMercadoPagoPix).toHaveBeenCalledTimes(2);
  });

  it("erro da API mostra a mensagem e permite tentar de novo", async () => {
    createMercadoPagoPix.mockRejectedValueOnce(new Error("Este pedido já foi pago.")).mockResolvedValueOnce(pix(null));
    render(<MercadoPagoPix orderId="order-1" onPaid={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Este pedido já foi pago.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByAltText("QR Code Pix");
  });
});
