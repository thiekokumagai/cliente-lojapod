import { ChevronLeft, Play, Search } from "lucide-react";
import ProductShareMenu from "./ProductShareMenu";

interface ProductMobileGalleryProps {
  productName: string;
  images: string[];
  selectedImage: number;
  onBack: () => void;
  onOpenModal: () => void;
  isBestSeller?: boolean;
  isPromo?: boolean;
  discount?: number;
}

const ProductMobileGallery = ({
  productName,
  images,
  selectedImage,
  onBack,
  onOpenModal,
  isBestSeller,
  isPromo,
  discount,
}: ProductMobileGalleryProps) => {
  return (
    <div className="relative bg-[#f5f5f5]">
      {isPromo && discount && (
        <span className="absolute left-16 top-4 z-10 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md">
          -{discount}%
        </span>
      )}
      
      {isBestSeller && (
        <div 
          className="absolute right-16 top-1 z-10 flex h-[64px] w-[64px] items-center justify-center drop-shadow-md" 
          style={{ transform: 'rotate(-8deg)' }}
        >
          <div className="absolute inset-1 bg-[#DE2839]" style={{ transform: 'rotate(0deg)' }}></div>
          <div className="absolute inset-1 bg-[#DE2839]" style={{ transform: 'rotate(22.5deg)' }}></div>
          <div className="absolute inset-1 bg-[#DE2839]" style={{ transform: 'rotate(45deg)' }}></div>
          <div className="absolute inset-1 bg-[#DE2839]" style={{ transform: 'rotate(67.5deg)' }}></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center leading-[0.95] text-white font-black tracking-[-0.03em]">
            <span className="text-[17px]">BEST</span>
            <span className="text-[13px]">SELLER</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenModal}
        className="block w-full"
      >
        <div className="aspect-square w-full">
          <img
            src={images[selectedImage]}
            alt={productName}
            className="h-full w-full object-contain"
          />
        </div>
      </button>

      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onOpenModal}
        aria-label="Ampliar imagem"
        className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-bl-[28px] bg-black/20 text-white backdrop-blur-sm"
      >
        <Search className="h-5 w-5" />
      </button>


      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#cfc4ba] px-3 py-0.5 text-sm text-foreground/80">
        {selectedImage + 1} de {images.length}
      </div>

      <ProductShareMenu
        productName={productName}
        triggerClassName="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#e10600] border border-gray-200 shadow-lg transition-transform active:scale-95"
      />
    </div>
  );
};

export default ProductMobileGallery;
