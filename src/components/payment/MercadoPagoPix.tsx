import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordersService, type MercadoPagoPixResponse } from "@/services/orders";
import { subscribeToOrderStatus } from "@/services/order-socket";
import { formatCountdown } from "@/lib/mercadopago";

interface Props {
  orderId: string;
  /** Chamado quando o pagamento é confirmado (websocket ou verificação periódica). */
  onPaid: () => void;
}

const POLL_INTERVAL_MS = 5000;

/**
 * Pix do Mercado Pago: QR Code, copia e cola e contagem do prazo.
 * O valor vem do servidor (a tela não manda valor). Atualiza sozinha quando o Pix é pago:
 * websocket da sala do pedido + verificação a cada 5 s como reserva.
 */
export function MercadoPagoPix({ orderId, onPaid }: Props) {
  const [pix, setPix] = useState<MercadoPagoPixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const handlePaid = useCallback(() => {
    if (paidRef.current) return;
    paidRef.current = true;
    onPaidRef.current();
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPix(await ordersService.createMercadoPagoPix(orderId));
    } catch (err) {
      setPix(null);
      setError(err instanceof Error ? err.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void generate();
  }, [generate]);

  // Contagem do prazo do QR Code
  useEffect(() => {
    if (!pix?.expiresAt) {
      setRemainingMs(null);
      return;
    }
    const expiresAt = Date.parse(pix.expiresAt);
    if (Number.isNaN(expiresAt)) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, expiresAt - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pix?.expiresAt, pix?.paymentId]);

  // Atualiza sozinho quando pago: websocket + verificação periódica
  useEffect(() => {
    if (!pix) return;
    const check = async () => {
      try {
        const status = await ordersService.checkPaymentStatus(orderId);
        if (status?.paid || status?.paymentStatus === "PAID") handlePaid();
      } catch {
        // erro transitório: tenta de novo no próximo ciclo
      }
    };
    const unsubscribe = subscribeToOrderStatus(
      [orderId],
      (event) => {
        if (event.paymentStatus === "PAID") handlePaid();
      },
      () => void check(),
    );
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [pix, orderId, handlePaid]);

  const expired = remainingMs !== null && remainingMs <= 0;

  const copy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground" role="status">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Gerando o QR Code Pix...</span>
      </div>
    );
  }

  if (error || !pix) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-destructive" role="alert">
          {error || "Não foi possível gerar o Pix."}
        </p>
        <Button onClick={() => void generate()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-semibold">
        <QrCode className="h-4 w-4 text-primary" />
        Pague com Pix
      </div>

      {expired ? (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Este QR Code expirou.</p>
          <Button onClick={() => void generate()}>Gerar novo QR Code</Button>
        </div>
      ) : (
        <>
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            className="mx-auto h-56 w-56 rounded-xl border bg-white p-2"
          />
          {remainingMs !== null && (
            <p className="text-xs text-muted-foreground">
              Expira em <span className="font-semibold tabular-nums">{formatCountdown(remainingMs)}</span>
            </p>
          )}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ou use o Pix copia e cola:</p>
            <code className="block max-h-20 overflow-y-auto break-all rounded-lg border bg-muted/40 p-2 text-[11px]">
              {pix.qrCode}
            </code>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void copy()}>
              <Copy className="h-4 w-4" />
              Copiar código Pix
            </Button>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando o pagamento. Esta tela atualiza sozinha.
          </p>
        </>
      )}
    </div>
  );
}
