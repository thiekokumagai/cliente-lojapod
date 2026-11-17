/**
 * Mercado Pago no checkout online.
 * A vitrine só recebe `enabled`, `acceptPix`, `acceptCreditCard`, `publicKey` e `maxInstallments`:
 * access token e webhook secret ficam no servidor e nunca chegam aqui.
 */

export interface PublicMercadoPagoGateway {
  enabled?: boolean;
  acceptPix?: boolean;
  acceptCreditCard?: boolean;
  publicKey?: string;
  maxInstallments?: number;
}

export interface MercadoPagoCheckoutConfig {
  /** Pix com QR Code gerado pelo Mercado Pago */
  pix: boolean;
  /** Cartão online pela tela do Mercado Pago (tokenização no navegador) */
  card: boolean;
  publicKey: string;
  maxInstallments: number;
}

type GatewaysLike =
  | {
      pixOnTerminal?: boolean;
      infinitepay?: { enabled?: boolean; acceptCreditCard?: boolean };
      mercadopago?: PublicMercadoPagoGateway;
    }
  | null
  | undefined;

export function getMercadoPagoCheckout(gateways: GatewaysLike): MercadoPagoCheckoutConfig {
  const mp = gateways?.mercadopago;
  const ready = !!mp?.enabled && !!mp.publicKey;
  // Pix na maquininha tem prioridade: o Pix é pago na entrega, nunca como Pix online
  const pix = ready && !!mp?.acceptPix && gateways?.pixOnTerminal !== true;
  // Mesma prioridade do servidor: com a InfinitePay ativa para cartão, ela segue no cartão online
  const infinitePayCard = !!gateways?.infinitepay?.enabled && !!gateways.infinitepay.acceptCreditCard;
  const card = ready && !!mp?.acceptCreditCard && !infinitePayCard;
  return {
    pix,
    card,
    publicKey: mp?.publicKey ?? "",
    maxInstallments: Math.min(12, Math.max(1, Math.floor(Number(mp?.maxInstallments) || 1))),
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Tipos mínimos do SDK v2 do Mercado Pago (carregado por script). */
export interface MercadoPagoCardFormData {
  token: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

export interface MercadoPagoBrickController {
  unmount: () => void;
}

export interface MercadoPagoSdk {
  bricks: () => {
    create: (
      brick: "cardPayment",
      containerId: string,
      settings: Record<string, unknown>,
    ) => Promise<MercadoPagoBrickController>;
  };
}

type MercadoPagoConstructor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoSdk;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<MercadoPagoConstructor> | null = null;

/** Carrega o SDK oficial uma vez só. O cartão é digitado e tokenizado dentro dele, nunca no nosso código. */
export function loadMercadoPagoSdk(): Promise<MercadoPagoConstructor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sem navegador"));
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<MercadoPagoConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) resolve(window.MercadoPago);
      else {
        sdkPromise = null;
        reject(new Error("SDK do Mercado Pago indisponível"));
      }
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Não foi possível carregar o Mercado Pago"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
