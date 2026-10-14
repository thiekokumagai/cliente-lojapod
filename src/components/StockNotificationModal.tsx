import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BellRing, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { stockNotificationsService } from "@/services/stock-notifications";

const SESSION_NAME_KEY = "podemais-checkout-name";
const SESSION_PHONE_KEY = "podemais-checkout-phone";

interface StockNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  variationName?: string | null;
  productItemId?: string | null;
}

export function StockNotificationModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  variationName,
  productItemId,
}: StockNotificationModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Inicializa com as variáveis do checkout salvas no localStorage
  useEffect(() => {
    if (isOpen) {
      const storedName = localStorage.getItem(SESSION_NAME_KEY) || "";
      const storedPhone = localStorage.getItem(SESSION_PHONE_KEY) || "";
      setName(storedName);
      setPhone(storedPhone);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Por favor, digite um WhatsApp válido com DDD.");
      return;
    }

    try {
      setIsLoading(true);

      // Salva nas mesmas chaves do checkout
      localStorage.setItem(SESSION_NAME_KEY, name.trim());
      localStorage.setItem(SESSION_PHONE_KEY, phone);

      await stockNotificationsService.create({
        productId,
        productItemId: productItemId || undefined,
        customerName: name.trim(),
        customerPhone: phone,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar solicitação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden rounded-2xl">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Tudo certo!</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Assim que o produto <strong>{productTitle}</strong> {variationName ? `(${variationName})` : ""} estiver disponível, avisaremos você no WhatsApp <strong>{phone}</strong>!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BellRing className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg font-bold text-left">
                  Avise-me quando chegar
                </DialogTitle>
              </div>
              <DialogDescription className="text-left text-xs leading-relaxed">
                Este item está esgotado no momento. Deixe seu WhatsApp para ser avisado em primeira mão assim que repormos o estoque:
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-muted/40 rounded-xl border border-muted text-xs space-y-1">
              <div className="font-semibold text-foreground truncate">{productTitle}</div>
              {variationName && (
                <div className="text-primary font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Variação: {variationName}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="notification-name" className="text-xs font-semibold">
                  Seu Nome
                </Label>
                <Input
                  id="notification-name"
                  placeholder="Como podemos te chamar?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-11 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notification-phone" className="text-xs font-semibold">
                  Seu WhatsApp (com DDD)
                </Label>
                <Input
                  id="notification-phone"
                  placeholder="(00) 00000-0000"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="mt-1 h-11 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-11 rounded-xl text-xs font-semibold gap-1.5 shadow-md shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <BellRing className="h-4 w-4" />
                    Quero ser avisado
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
