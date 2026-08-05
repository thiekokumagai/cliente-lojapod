import { useState } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import whatsappIcon from "@/assets/whatsapp-original.svg";

interface ProductShareMenuProps {
  productName: string;
  triggerClassName?: string;
}

const ProductShareMenu = ({ productName, triggerClassName }: ProductShareMenuProps) => {
  const [copied, setCopied] = useState(false);

  const handleWhatsAppShare = () => {
    const shareUrl = window.location.href;
    const message = `Olha esse produto que encontrei: ${productName}\n${shareUrl}`;
    const encodedText = encodeURIComponent(message);
    const urlApp = `whatsapp://send?text=${encodedText}`;
    const urlWeb = `https://api.whatsapp.com/send?text=${encodedText}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(urlWeb, "_blank", "noopener,noreferrer");
        }
      }, 1500);
    } else {
      window.open(urlWeb, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link do produto copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Compartilhar produto"
          className={
            triggerClassName ||
            "flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary border border-gray-200 shadow-md transition-transform hover:scale-105 active:scale-95"
          }
        >
          <Share2 className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="z-[100] w-48 rounded-xl p-1.5 shadow-xl bg-card border border-border">
        <DropdownMenuItem
          onClick={handleWhatsAppShare}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary focus:bg-secondary transition-colors"
        >
          <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5 object-contain" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary focus:bg-secondary transition-colors"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <span>Copiar link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProductShareMenu;
