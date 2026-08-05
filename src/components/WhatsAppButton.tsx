import { useCart } from "@/contexts/CartContext";
import { useLocation } from "react-router-dom";
import whatsappIcon from "@/assets/whatsapp-original.svg";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProduct } from "@/hooks/useProducts";

const WhatsAppButton = () => {
  const { totalItems, selectedCategory } = useCart();
  const location = useLocation();
  const hasCartItems = totalItems > 0;
  const isProductPage = location.pathname.startsWith("/produto/");
  const productId = isProductPage ? location.pathname.split("/").pop() : undefined;
  const { data: product } = useProduct(productId);

  const { data: settings } = useStoreSettings();
  const phone = settings?.phone?.replace(/\D/g, "") || "5567991032937"; // fallback to default just in case

  let message = "Olá, estou navegando em sua loja e gostaria de tirar uma dúvida.";
  if (isProductPage && product?.name) {
    message = `Olá, tenho uma dúvida sobre o produto: ${product.name}`;
  } else if (location.pathname === "/" && selectedCategory && selectedCategory.toLowerCase() !== "todos") {
    message = `Olá, estou navegando em sua loja e gostaria de mais informações categoria ${selectedCategory.toLowerCase()}`;
  }

  // On product page mobile: sticky "Adicionar" bar (~60px) + if cart items, bottom nav (~64px)
  // On home mobile: if cart items, bottom nav (~64px)
  let mobileBottom = "bottom-6";
  if (isProductPage && hasCartItems) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+160px)]";
  } else if (isProductPage) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+100px)]";
  } else if (hasCartItems) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+80px)]";
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const encodedText = encodeURIComponent(message);
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

  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(142,70%,45%)]  transition-all  md:bottom-6 md:right-6 ${mobileBottom}`}
      aria-label="Fale conosco no WhatsApp"
    >
      <img src={whatsappIcon} alt="WhatsApp" />
    </a>
  );
};

export default WhatsAppButton;
