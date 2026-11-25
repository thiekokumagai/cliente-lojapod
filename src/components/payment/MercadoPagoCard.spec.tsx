import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MercadoPagoCard } from "./MercadoPagoCard";
import { buildCardBrickVisual } from "@/lib/mercadopago";

// Nada de rede nem SDK real: window.MercadoPago e o serviço de pedidos são mocks.
const createMercadoPagoCard = vi.fn();
vi.mock("@/services/orders", () => ({
  ordersService: { createMercadoPagoCard: (id: string, payload: unknown) => createMercadoPagoCard(id, payload) },
}));

type BrickSettings = {
  initialization: { amount: number };
  customization: { paymentMethods: { maxInstallments: number }; visual: ReturnType<typeof buildCardBrickVisual> };
  callbacks: {
    onReady: () => void;
    onSubmit: (formData: Record<string, unknown>) => Promise<void>;
    onError: () => void;
  };
};

let brickSettings: BrickSettings;
const unmount = vi.fn();
const sdkConstructor = vi.fn();

beforeEach(() => {
  createMercadoPagoCard.mockReset();
  unmount.mockClear();
  sdkConstructor.mockClear();
  (window as unknown as { MercadoPago: unknown }).MercadoPago = class {
    constructor(publicKey: string, options: unknown) {
      sdkConstructor(publicKey, options);
    }
    bricks() {
      return {
        create: async (_brick: string, containerId: string, settings: BrickSettings) => {
          expect(document.getElementById(containerId)).not.toBeNull();
          brickSettings = settings;
          settings.callbacks.onReady();
          return { unmount };
        },
      };
    }
  };
});

afterEach(() => {
  delete (window as unknown as { MercadoPago?: unknown }).MercadoPago;
});

const formData = {
  token: "tok_abc",
  issuer_id: 24,
  payment_method_id: "visa",
  installments: 3,
  transaction_amount: 1, // valor do navegador: precisa ser ignorado
  payer: { email: "ana@exemplo.com", identification: { type: "CPF", number: "12345678909" } },
};

function setup() {
  const onApproved = vi.fn();
  const onInProcess = vi.fn();
  const view = render(
    <MercadoPagoCard
      orderId="order-1"
      amount={100}
      publicKey="TEST-public"
      maxInstallments={6}
      onApproved={onApproved}
      onInProcess={onInProcess}
    />,
  );
  return { onApproved, onInProcess, ...view };
}

describe("MercadoPagoCard", () => {
  it("abre o formulário do Mercado Pago com a public key, o limite de parcelas e o valor só de exibição", async () => {
    setup();
    await waitFor(() => expect(brickSettings).toBeDefined());
    expect(sdkConstructor).toHaveBeenCalledWith("TEST-public", { locale: "pt-BR" });
    expect(brickSettings.initialization.amount).toBe(100);
    expect(brickSettings.customization.paymentMethods.maxInstallments).toBe(6);
  });

  it("aprovado: manda SÓ o token (nunca dados do cartão nem valor) e avisa a tela", async () => {
    createMercadoPagoCard.mockResolvedValue({ paid: true, status: "approved", paymentId: "1", message: "Pagamento aprovado!" });
    const { onApproved, onInProcess } = setup();
    await waitFor(() => expect(brickSettings).toBeDefined());

    await brickSettings.callbacks.onSubmit(formData);

    expect(createMercadoPagoCard).toHaveBeenCalledWith("order-1", {
      token: "tok_abc",
      installments: 3,
      paymentMethodId: "visa",
      issuerId: "24",
      payerEmail: "ana@exemplo.com",
      identification: { type: "CPF", number: "12345678909" },
    });
    const sent = JSON.stringify(createMercadoPagoCard.mock.calls[0][1]);
    expect(sent).not.toMatch(/transaction_amount|amount|card_number|security_code|cvv/i);
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(onInProcess).not.toHaveBeenCalled();
  });

  it("recusado: mostra a mensagem clara e deixa o cliente tentar de novo", async () => {
    createMercadoPagoCard.mockResolvedValue({
      paid: false,
      status: "rejected",
      paymentId: "2",
      message: "Saldo insuficiente no cartão. Tente outro cartão ou pague com Pix.",
    });
    const { onApproved } = setup();
    await waitFor(() => expect(brickSettings).toBeDefined());

    await expect(brickSettings.callbacks.onSubmit(formData)).rejects.toThrow("Saldo insuficiente");

    expect(await screen.findByRole("alert")).toHaveTextContent("Saldo insuficiente no cartão");
    expect(onApproved).not.toHaveBeenCalled();
  });

  it("em análise: segue para o acompanhamento do pedido, sem dizer que foi pago", async () => {
    createMercadoPagoCard.mockResolvedValue({ paid: false, status: "in_process", paymentId: "3", message: "Seu pagamento está em análise." });
    const { onApproved, onInProcess } = setup();
    await waitFor(() => expect(brickSettings).toBeDefined());

    await brickSettings.callbacks.onSubmit(formData);

    expect(onInProcess).toHaveBeenCalledTimes(1);
    expect(onApproved).not.toHaveBeenCalled();
  });

  it("erro da API aparece na tela e o formulário continua disponível", async () => {
    createMercadoPagoCard.mockRejectedValue(new Error("Esta loja aceita parcelar em até 6x."));
    setup();
    await waitFor(() => expect(brickSettings).toBeDefined());

    await expect(brickSettings.callbacks.onSubmit({ ...formData, installments: 12 })).rejects.toThrow("até 6x");
    expect(await screen.findByRole("alert")).toHaveTextContent("até 6x");
  });

  it("desmonta o formulário ao sair da tela", async () => {
    const { unmount: unmountView } = setup();
    await waitFor(() => expect(brickSettings).toBeDefined());
    unmountView();
    expect(unmount).toHaveBeenCalled();
  });
});

describe("MercadoPagoCard: aparência do formulário (só visual)", () => {
  it("usa a cor da loja, cantos arredondados e o valor no botão, sem tocar no limite de parcelas", async () => {
    render(
      <MercadoPagoCard orderId="order-1" amount={101} publicKey="TEST-public" maxInstallments={6} brandColor="#e11d48" onApproved={vi.fn()} onInProcess={vi.fn()} />,
    );
    await waitFor(() => expect(brickSettings).toBeDefined());
    const visual = brickSettings.customization.visual;
    expect(visual.style.theme).toBe("default");
    expect(visual.style.customVariables).toMatchObject({ baseColor: "#e11d48", outlinePrimaryColor: "#e11d48", buttonTextColor: "#ffffff", borderRadiusMedium: "12px" });
    // formPadding é também o espaço entre os campos e antes do botão: nunca zerar (botão colado)
    expect(visual.style.customVariables.formPadding).toBe("16px");
    // Intl usa espaço inquebrável depois do "R$"
    expect(visual.texts.formSubmit.replace(/\s/g, " ")).toBe("Pagar R$ 101,00");
    expect(visual.hidePaymentButton).toBe(false);
    expect(brickSettings.customization.paymentMethods.maxInstallments).toBe(6);
  });

  it("cor clara ganha texto escuro no botão; cor inválida ou ausente fica com as cores do Mercado Pago", () => {
    expect(buildCardBrickVisual(50, "#facc15").style.customVariables).toMatchObject({ buttonTextColor: "#0f172a" });
    expect(buildCardBrickVisual(50, "rgb(1,2,3)").style.customVariables).not.toHaveProperty("baseColor");
    expect(buildCardBrickVisual(50).style.customVariables).not.toHaveProperty("baseColor");
    expect(buildCardBrickVisual(0).texts.formSubmit).toBe("Pagar");
  });
});
