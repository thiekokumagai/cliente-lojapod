import { describe, expect, it } from "vitest";
import { getMercadoPagoCheckout } from "./mercadopago";

const mp = { enabled: true, acceptPix: true, acceptCreditCard: true, publicKey: "TEST-public", maxInstallments: 6 };

describe("getMercadoPagoCheckout", () => {
  it("liga Pix e cartão quando o Mercado Pago está pronto", () => {
    expect(getMercadoPagoCheckout({ mercadopago: mp })).toEqual({
      pix: true,
      card: true,
      publicKey: "TEST-public",
      maxInstallments: 6,
    });
  });

  it("sem configuração, desligado ou sem public key: nada aparece", () => {
    expect(getMercadoPagoCheckout(undefined)).toMatchObject({ pix: false, card: false });
    expect(getMercadoPagoCheckout({})).toMatchObject({ pix: false, card: false });
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, enabled: false } })).toMatchObject({ pix: false, card: false });
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, publicKey: "" } })).toMatchObject({ pix: false, card: false });
  });

  it("respeita as formas aceitas", () => {
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, acceptPix: false } })).toMatchObject({ pix: false, card: true });
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, acceptCreditCard: false } })).toMatchObject({ pix: true, card: false });
  });

  it("Pix na maquininha tem prioridade: o Pix não é online", () => {
    expect(getMercadoPagoCheckout({ pixOnTerminal: true, mercadopago: mp })).toMatchObject({ pix: false, card: true });
  });

  it("com a InfinitePay ativa para cartão, o cartão online continua nela (mesma prioridade do servidor)", () => {
    const result = getMercadoPagoCheckout({
      infinitepay: { enabled: true, acceptCreditCard: true },
      mercadopago: mp,
    });
    expect(result).toMatchObject({ card: false, pix: true });
  });

  it("parcelas ficam entre 1 e 12", () => {
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, maxInstallments: 99 } }).maxInstallments).toBe(12);
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, maxInstallments: 0 } }).maxInstallments).toBe(1);
    expect(getMercadoPagoCheckout({ mercadopago: { ...mp, maxInstallments: undefined } }).maxInstallments).toBe(1);
  });
});
