import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Clock, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ordersService, type MercadoPagoPixResponse } from "@/services/orders";
import { subscribeToOrderStatus } from "@/services/order-socket";
import { formatCountdown } from "@/lib/mercadopago";

interface Props {
  orderId: string;
  /** Chamado quando o pagamento é confirmado (websocket ou verificação periódica). */
  onPaid: () => void;
}

const POLL_INTERVAL_MS = 5000;
const COPIED_FEEDBACK_MS = 2500;

const STEPS = [
  "Abra o app do seu banco e escolha pagar com Pix.",
  "Cole o código copiado ou escaneie o QR Code.",
  "Confirme o valor. Esta tela muda sozinha quando o pagamento cair.",
];

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
  const [copied, setCopied] = useState(false);
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

  // Volta o botão de "Copiado!" para o normal depois de um instante
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" role="status">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="mx-auto h-52 w-52 rounded-2xl" />
        <p className="text-center text-xs text-muted-foreground">Gerando o QR Code Pix...</p>
      </div>
    );
  }

  if (error || !pix) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-destructive/5 px-4 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive/80" aria-hidden="true" />
        <p className="max-w-xs text-sm font-medium text-destructive" role="alert">
          {error || "Não foi possível gerar o Pix."}
        </p>
        <Button onClick={() => void generate()} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-8 text-center">
        <Clock className="h-8 w-8 text-amber-600" aria-hidden="true" />
        <p className="text-sm font-semibold text-amber-800">Este QR Code expirou.</p>
        <p className="max-w-xs text-xs text-amber-800/80">Gere outro para pagar. O valor do pedido continua o mesmo.</p>
        <Button onClick={() => void generate()} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Gerar novo QR Code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Situação do pagamento e prazo */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          Aguardando pagamento
        </span>
        {remainingMs !== null && (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Expira em <span className="font-semibold tabular-nums text-foreground">{formatCountdown(remainingMs)}</span>
          </span>
        )}
      </div>

      {/* No celular o cliente paga no mesmo aparelho: o copia e cola vem primeiro. No computador, o QR Code. */}
      <div className="flex flex-col gap-5">
        <div className="order-1 space-y-2 sm:order-2">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-12 w-full gap-2 rounded-xl text-base font-semibold transition-colors",
              copied && "bg-emerald-600 text-white hover:bg-emerald-600",
            )}
            onClick={() => void copy()}
            aria-live="polite"
          >
            {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? "Código copiado!" : "Copiar código Pix"}
          </Button>
          <code className="block max-h-16 overflow-y-auto break-all rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {pix.qrCode}
          </code>
        </div>

        <div className="order-2 flex flex-col items-center gap-2 sm:order-1">
          <div className="relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]">
            {/* Cantoneiras na cor da loja marcando a área de leitura */}
            <span className="pointer-events-none absolute -left-px -top-px h-6 w-6 rounded-tl-2xl border-l-[3px] border-t-[3px] border-primary" aria-hidden="true" />
            <span className="pointer-events-none absolute -right-px -top-px h-6 w-6 rounded-tr-2xl border-r-[3px] border-t-[3px] border-primary" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-px -left-px h-6 w-6 rounded-bl-2xl border-b-[3px] border-l-[3px] border-primary" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-px -right-px h-6 w-6 rounded-br-2xl border-b-[3px] border-r-[3px] border-primary" aria-hidden="true" />
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix"
              className="h-48 w-48 sm:h-56 sm:w-56"
            />
          </div>
          <p className="text-xs text-muted-foreground">Ou escaneie com a câmera do app do banco</p>
        </div>
      </div>

      {/* Como pagar */}
      <ol className="space-y-2.5 rounded-2xl bg-muted/40 p-4">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
