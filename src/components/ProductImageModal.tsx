import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImageModalProps {
  images: string[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}

const ProductImageModal = ({
  images,
  selectedIndex,
  onClose,
  onSelect,
}: ProductImageModalProps) => {
  const previousIndex = selectedIndex === 0 ? images.length - 1 : selectedIndex - 1;
  const nextIndex = selectedIndex === images.length - 1 ? 0 : selectedIndex + 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-5xl flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground"
          aria-label="Fechar imagens"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex min-h-[320px] items-center justify-center rounded-3xl bg-white p-4 md:min-h-[620px] md:p-8">
          <button
            type="button"
            onClick={() => onSelect(previousIndex)}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white md:left-5"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <img
            src={images[selectedIndex]}
            alt={`Imagem ${selectedIndex + 1}`}
            className="aspect-square max-h-[75vh] w-full max-w-3xl object-contain"
          />

          <button
            type="button"
            onClick={() => onSelect(nextIndex)}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white md:right-5"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={`overflow-hidden rounded-2xl border-2 ${selectedIndex === index ? "border-primary" : "border-white/40"}`}
            >
              <img
                src={image}
                alt={`Miniatura ${index + 1}`}
                className="h-16 w-16 object-cover md:h-20 md:w-20"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductImageModal;
