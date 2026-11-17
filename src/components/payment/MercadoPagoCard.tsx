import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  loadMercadoPagoSdk,
  type MercadoPagoBrickController,
  type MercadoPagoCardFormData,
} from "@/lib/mercadopago";
import { ordersService, type MercadoPagoCardResponse } from "@/services/orders";

interface Props {
  orderId: string;
  /** Só para exibir no formulário: a cobrança usa o valor gravado no servidor. */
  amount: number;
  publicKey: string;
  maxInstallments: number;
  /** Cartão aprovado. */
  onApproved: () => void;
  /** Pagamento em análise: o servidor confirma depois (webhook). */
  onInProcess: () => void;
}

const CONTAINER_ID = "mercadopago-card-brick";

/**
 * Cartão pelo Card Payment Brick do Mercado Pago. O número, a validade e o CVV são digitados no
 * formulário do Mercado Pago e viram um `token` no navegador; nossa API só recebe o token.
 */
export function MercadoPagoCard({ orderId, amount, publicKey, maxInstallments, onApproved, onInProcess }: Props) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const callbacksRef = useRef({ onApproved, onInProcess });
  callbacksRef.current = { onApproved, onInProcess };

  useEffect(() => {
    let cancelled = false;
    let controller: MercadoPagoBrickController | null = null;

    (async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;
        const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
        controller = await mp.bricks().create("cardPayment", CONTAINER_ID, {
          initialization: { amount },
          customization: {
            paymentMethods: { maxInstallments },
            visual: { hidePaymentButton: false },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onSubmit: async (formData: MercadoPagoCardFormData) => {
              setMessage(null);
              let result: MercadoPagoCardResponse;
              try {
                result = await ordersService.createMercadoPagoCard(orderId, {
                  token: formData.token,
                  installments: formData.installments,
                  paymentMethodId: formData.payment_method_id,
                  issuerId: formData.issuer_id !== undefined ? String(formData.issuer_id) : undefined,
                  payerEmail: formData.payer?.email,
                  identification:
                    formData.payer?.identification?.type && formData.payer.identification.number
                      ? {
                          type: formData.payer.identification.type,
                          number: formData.payer.identification.number,
                        }
                      : undefined,
                });
              } catch (err) {
                const text = err instanceof Error ? err.message : "Não foi possível processar o pagamento.";
                setMessage(text);
                throw err; // o Brick mostra o erro e deixa tentar de novo
              }

              if (result.status === "approved") {
                callbacksRef.current.onApproved();
                return;
              }
              if (result.status === "in_process") {
                callbacksRef.current.onInProcess();
                return;
              }
              setMessage(result.message);
              throw new Error(result.message); // recusado: o cliente corrige o cartão e tenta de novo
            },
            onError: () => {
              if (!cancelled) setMessage("Confira os dados do cartão e tente novamente.");
            },
          },
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Não foi possível carregar o pagamento com cartão.");
        }
      }
    })();

    return () => {
      cancelled = true;
      controller?.unmount();
    };
  }, [orderId, amount, publicKey, maxInstallments]);

  if (loadError) {
    return (
      <p className="py-6 text-center text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando o pagamento seguro...
        </div>
      )}
      <div id={CONTAINER_ID} />
      {message && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
