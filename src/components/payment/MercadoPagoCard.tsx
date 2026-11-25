import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCardBrickVisual,
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
  /** Cor da loja (#rrggbb) para o botão e o foco do formulário do Mercado Pago. Só visual. */
  brandColor?: string;
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
export function MercadoPagoCard({ orderId, amount, publicKey, maxInstallments, brandColor, onApproved, onInProcess }: Props) {
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
            visual: buildCardBrickVisual(amount, brandColor),
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
  }, [orderId, amount, publicKey, maxInstallments, brandColor]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-destructive/5 px-4 py-8 text-center" role="alert">
        <AlertCircle className="h-8 w-8 text-destructive/80" aria-hidden="true" />
        <p className="max-w-xs text-sm font-medium text-destructive">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="space-y-3" role="status">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <p className="text-center text-xs text-muted-foreground">Carregando o pagamento seguro...</p>
        </div>
      )}
      {/* O Brick tem margem interna de 16px (formPadding); -mx-4 alinha os campos com o resto da tela */}
      <div id={CONTAINER_ID} className="-mx-4" />
      {message && (
        <p
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
