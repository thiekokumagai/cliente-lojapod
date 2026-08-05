import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface ProductContactProps {
  isDesktop?: boolean;
  productName?: string;
}

const ProductContact = ({ isDesktop = false, productName }: ProductContactProps) => {
  const { data: settings } = useStoreSettings();
  const phone = settings?.phone?.replace(/\D/g, "") || "5567991032937";
  
  const text = productName 
    ? `Olá, tenho uma dúvida sobre o produto: ${productName}`
    : "Olá, tenho uma dúvida";
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const encodedText = encodeURIComponent(text);
    const urlApp = `whatsapp://send?phone=${phone}&text=${encodedText}`;
    const urlWeb = `https://wa.me/${phone}?text=${encodedText}`;
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

  if (isDesktop) {
    return (
      <div className="mt-10 text-center">
        <p className="text-[14px] text-[#7f7f7f]">Ficou com alguma dúvida?</p>
        <a
          href={href}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mt-3 inline-flex rounded-xl border border-primary px-5 py-2.5 text-base text-primary cursor-pointer"
        >
          Falar com o vendedor
        </a>
      </div>
    );
  }

  return (
    <div className="mt-10 text-center">
      <p className="text-[14px] text-[#7f7f7f]">Ficou com alguma dúvida?</p>
      <a
        href={href}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto mt-3 inline-flex rounded-xl border border-primary px-5 py-2.5 text-base text-primary cursor-pointer"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Falar com o vendedor
      </a>
    </div>
  );
};

export default ProductContact;
