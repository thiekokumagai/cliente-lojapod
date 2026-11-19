import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MercadoPagoPix } from "@/components/payment/MercadoPagoPix";
import { MercadoPagoCard } from "@/components/payment/MercadoPagoCard";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useNoIndex } from "@/hooks/useNoIndex";
import { getMercadoPagoCheckout } from "@/lib/mercadopago";
import { ordersService } from "@/services/orders";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/** Pagamento online do pedido pelo Mercado Pago: Pix (QR Code) ou cartão. Rota `/pedido/:id/pagamento`. */
export default function MercadoPagoPaymentPage() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: storeSettings } = useStoreSettings();

  const [order, setOrder] = useState<{
    orderNumber: number;
    totalOrder: number | string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToSuccess = () => navigate(`/pedido/${id}/sucesso`, { replace: true });

  useEffect(() => {
    if (!id) return;
    let active = true;
    ordersService
      .getStoreOrder(id)
      .then((loaded) => {
        if (!active) return;
        if (loaded?.paymentStatus === "PAID") {
          navigate(`/pedido/${id}/sucesso`, { replace: true });
          return;
        }
        setOrder(loaded);
      })
      .catch(() => active && setError("Não foi possível carregar o pedido."));
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const checkout = getMercadoPagoCheckout(storeSettings?.paymentGateways);
  const wantedMethod =
    searchParams.get("metodo") ?? (String(order?.paymentMethod ?? "").toLowerCase().includes("pix") ? "pix" : "cartao");
  const method: "pix" | "cartao" = wantedMethod === "pix" ? "pix" : "cartao";

  let body: JSX.Element;
  if (error) {
    body = <p className="py-6 text-center text-sm text-destructive" role="alert">{error}</p>;
  } else if (!id || !order || !storeSettings) {
    body = (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando o pedido...
      </div>
    );
  } else if (order.status === "CANCELLED") {
    body = <p className="py-6 text-center text-sm text-destructive">Este pedido foi cancelado.</p>;
  } else if (method === "pix" && checkout.pix) {
    body = <MercadoPagoPix orderId={id} onPaid={goToSuccess} />;
  } else if (method === "cartao" && checkout.card) {
    body = (
      <MercadoPagoCard
        orderId={id}
        amount={Number(order.totalOrder)}
        publicKey={checkout.publicKey}
        maxInstallments={checkout.maxInstallments}
        onApproved={goToSuccess}
        onInProcess={goToSuccess}
      />
    );
  } else {
    body = (
      <p className="py-6 text-center text-sm text-muted-foreground">
        O pagamento online com esta forma não está disponível nesta loja.
      </p>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">
            {order ? `Pagamento do pedido #${order.orderNumber}` : "Pagamento do pedido"}
          </CardTitle>
          {order && (
            <p className="text-2xl font-bold text-primary">{formatPrice(Number(order.totalOrder || 0))}</p>
          )}
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
      {id && (
        <Link to={`/pedido/${id}`} className="text-center text-xs text-muted-foreground underline">
          Ver andamento do pedido
        </Link>
      )}
    </div>
  );
}
