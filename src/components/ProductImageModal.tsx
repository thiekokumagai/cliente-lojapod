import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImageModalProps {
  images: string[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  title?: string;
  description?: string;
}

const ProductImageModal = ({
  images,
  selectedIndex,
  onClose,
  onSelect,
  title,
  description,
}: ProductImageModalProps) => {
  const previousIndex = selectedIndex === 0 ? images.length - 1 : selectedIndex - 1;
  const nextIndex = selectedIndex === images.length - 1 ? 0 : selectedIndex + 1;

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (images.length > 1) {
        if (e.key === "ArrowLeft") onSelect(previousIndex);
        if (e.key === "ArrowRight") onSelect(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onSelect, previousIndex, nextIndex, images.length]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex w-full max-w-3xl flex-col gap-3 md:gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-white text-foreground shadow-lg transition-all hover:bg-white/90 active:scale-95"
          aria-label="Fechar imagens"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-white shadow-2xl">
          <div className="relative flex min-h-[240px] max-h-[48vh] md:max-h-[60vh] w-full items-center justify-center bg-[#f9f9f9] p-3 md:p-6">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onSelect(previousIndex)}
                className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors md:left-4 md:h-10 md:w-10"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <img
              src={images[selectedIndex]}
              alt={title || `Imagem ${selectedIndex + 1}`}
              className="aspect-square h-full max-h-[46vh] md:max-h-[58vh] w-full object-contain"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onSelect(nextIndex)}
                className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors md:right-4 md:h-10 md:w-10"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {(title || description) && (
            <div className="border-t border-border/60 bg-white p-4 md:p-6 text-left">
              {title && (
                <h3 className="text-base md:text-xl font-bold text-foreground leading-snug">
                  {title}
                </h3>
              )}
              {description && (
                <div
                  className="mt-2 text-xs md:text-sm text-muted-foreground leading-relaxed max-h-36 md:max-h-48 overflow-y-auto pr-1 overscroll-contain"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex justify-center gap-2 md:gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => onSelect(index)}
                className={`overflow-hidden rounded-xl md:rounded-2xl border-2 transition-all ${
                  selectedIndex === index ? "border-primary scale-105" : "border-white/40 opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={image}
                  alt={`Miniatura ${index + 1}`}
                  className="h-12 w-12 object-cover md:h-16 md:w-16"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageModal;
