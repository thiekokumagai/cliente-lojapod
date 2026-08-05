import { Play } from "lucide-react";
import ProductShareMenu from "./ProductShareMenu";

interface ProductDesktopGalleryProps {
  productName: string;
  images: string[];
  selectedImage: number;
  isNicSalt: boolean;
  onSelectImage: (index: number) => void;
  onOpenModal: () => void;
  isBestSeller?: boolean;
  isPromo?: boolean;
  discount?: number;
}

const ProductDesktopGallery = ({
  productName,
  images,
  selectedImage,
  isNicSalt,
  onSelectImage,
  onOpenModal,
  isBestSeller,
  isPromo,
  discount,
}: ProductDesktopGalleryProps) => {
  return (
    <div className={`grid items-start gap-4 pt-16 grid-cols-[82px_1fr]`}>
      {!isNicSalt && (
        <div className="flex flex-col gap-3">

          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onSelectImage(index)}
              className={`overflow-hidden rounded-2xl border-2 ${selectedImage === index ? "border-primary" : "border-transparent"}`}
            >
              <img
                src={image}
                alt={`${productName} ${index + 1}`}
                className="aspect-square w-[78px] object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="relative w-full bg-[#f6f5f3] max-w-[440px] rounded-[14px]">
        {isPromo && discount && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md">
            -{discount}%
          </span>
        )}

        {isBestSeller && (
          <div 
            className="absolute right-12 top-1 z-10 flex h-[64px] w-[64px] items-center justify-center drop-shadow-md" 
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
          className="block w-full overflow-hidden rounded-[14px]"
        >
          <div className="aspect-square w-full">
            <img
              src={images[selectedImage]}
              alt={productName}
              className="h-full w-full object-contain"
            />
          </div>
        </button>

        <ProductShareMenu
          productName={productName}
          triggerClassName="absolute right-[-10px] top-[-10px] z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary border border-gray-200 shadow-md transition-transform hover:scale-105 active:scale-95"
        />
      </div>
    </div>
  );
};

export default ProductDesktopGallery;
