import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "react-router-dom";

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { totalItems } = useCart();
  const location = useLocation();
  const hasCartItems = totalItems > 0;
  const isProductPage = location.pathname.startsWith("/produto/");

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  // Position above WhatsApp button (+56px gap)
  let mobileBottom = "bottom-[74px]";
  if (isProductPage && hasCartItems) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+210px)]";
  } else if (isProductPage) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+150px)]";
  } else if (hasCartItems) {
    mobileBottom = "bottom-[calc(env(safe-area-inset-bottom)+130px)]";
  }

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-border transition-all  md:bottom-[72px] md:right-6 ${mobileBottom}`}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-4 w-4 text-primary" />
    </button>
  );
};

export default BackToTopButton;
