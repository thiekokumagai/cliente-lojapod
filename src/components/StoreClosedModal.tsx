import { useState, useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBusinessStatus } from "@/hooks/useBusinessStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const StoreClosedModal = () => {
  const { totalItems } = useCart();
  const { data: settings, isLoading } = useStoreSettings();
  const { isOpen, nextOpenDateStr } = useBusinessStatus(settings?.businessHours);
  const [showModal, setShowModal] = useState(false);
  
  const previousTotalItems = useRef(totalItems);
  const hasShownThisSession = useRef(false);

  useEffect(() => {
    // If items went from 0 to >0, and store is closed, and we haven't shown it yet this session
    if (
      previousTotalItems.current === 0 &&
      totalItems > 0 &&
      !isLoading &&
      !isOpen &&
      !hasShownThisSession.current
    ) {
      setShowModal(true);
      hasShownThisSession.current = true;
    }
    previousTotalItems.current = totalItems;
  }, [totalItems, isOpen, isLoading]);

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent overlayClassName="z-[100]" className="sm:max-w-md text-center flex flex-col items-center p-6 z-[100]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Loja Fechada</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center text-base text-muted-foreground mt-2">
          Adicionamos o produto no seu carrinho, mas note que <strong>estamos fora do nosso horário de atendimento agora</strong>.
          <br /><br />
          Você pode concluir sua compra normalmente, e nós começaremos a prepará-la e enviá-la assim que reabrirmos{nextOpenDateStr ? ` ${nextOpenDateStr}` : ' no próximo dia útil'}!
        </DialogDescription>
        <DialogFooter className="sm:justify-center w-full mt-6">
          <Button type="button" variant="default" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-8">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreClosedModal;
