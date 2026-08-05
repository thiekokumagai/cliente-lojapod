interface NicotineOption {
  label: string;
  available: boolean;
}

interface ProductInfoProps {
  isNicSalt: boolean;
  productDescription: string;
  nicotineOptions: NicotineOption[];
  hasNicotineOptions: boolean;
  nicotineStrength: string | null;
  isDesktop?: boolean;
  onSelectNicotine: (value: string) => void;
}

const ProductInfo = ({
  isNicSalt,
  productDescription,
  nicotineOptions,
  hasNicotineOptions,
  nicotineStrength,
  isDesktop = false,
  onSelectNicotine,
}: ProductInfoProps) => {
  const descriptionClassName = isDesktop
    ? "mt-6 text-[15px] leading-[1.35] text-[#6f6f6f] [&>p]:mb-3 last:[&>p]:mb-0"
    : "mt-5 text-[16px] leading-[1.35] text-[#7a7a7a] [&>p]:mb-3 last:[&>p]:mb-0";

  if (!isNicSalt) {
    return <div className={descriptionClassName} dangerouslySetInnerHTML={{ __html: productDescription }} />;
  }

  return (
    <div className={isDesktop ? "mt-6 space-y-5 text-[15px] leading-[1.25] text-[#6f6f6f]" : "mt-5 space-y-5 text-[16px] text-[#7a7a7a]"}>
      <div className={`${isDesktop ? "text-[16px] text-[#666666]" : ""} [&>p]:mb-3 last:[&>p]:mb-0`} dangerouslySetInnerHTML={{ __html: productDescription }} />

      <div className="border-t border-[#ececec] pt-4">
        {isDesktop ? (
          <div className="flex items-center gap-4">
            <p className="text-sm uppercase tracking-wide text-[#7f7f7f]">Teor de nicotina :</p>
            <div className="h-px flex-1 bg-[#ececec]" />
          </div>
        ) : (
          <p className="text-sm uppercase tracking-wide text-[#7f7f7f]">Teor de nicotina :</p>
        )}

        <div className="mt-3 space-y-3">
          {hasNicotineOptions &&
            nicotineOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => option.available && onSelectNicotine(option.label)}
                disabled={!option.available}
                className={`flex items-center gap-3 text-left ${
                  option.available ? "" : "cursor-not-allowed opacity-50"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full border ${
                    nicotineStrength === option.label
                      ? "border-primary bg-primary"
                      : option.available
                        ? "border-[#c9c9c9] bg-[#d9d9d9]"
                        : "border-[#d8d8d8] bg-[#eeeeee]"
                  }`}
                />
                <span className={`text-[16px] ${option.available ? "text-[#555555]" : "text-[#9a9a9a] line-through"}`}>
                  {option.label}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;
