import type { Product, ProductVariationGroup } from "@/data/products";
import { isOptionAvailableGivenSelections } from "@/utils/variation-stock";

interface ProductInfoProps {
  product?: Product;
  productDescription: string;
  variationGroups?: ProductVariationGroup[];
  selections?: Record<string, string>;
  isDesktop?: boolean;
  onSelectOption?: (groupName: string, optionLabel: string) => void;
}

const ProductInfo = ({
  product,
  productDescription,
  variationGroups = [],
  selections = {},
  isDesktop = false,
  onSelectOption,
}: ProductInfoProps) => {
  const descriptionClassName = isDesktop
    ? "mt-6 text-[15px] leading-[1.35] text-[#6f6f6f] [&>p]:mb-3 last:[&>p]:mb-0"
    : "mt-5 text-[16px] leading-[1.35] text-[#7a7a7a] [&>p]:mb-3 last:[&>p]:mb-0";

  if (!variationGroups || variationGroups.length === 0) {
    return (
      <div
        className={descriptionClassName}
        dangerouslySetInnerHTML={{ __html: productDescription }}
      />
    );
  }

  return (
    <div
      className={
        isDesktop
          ? "mt-6 space-y-5 text-[15px] leading-[1.25] text-[#6f6f6f]"
          : "mt-5 space-y-5 text-[16px] text-[#7a7a7a]"
      }
    >
      <div
        className={`${isDesktop ? "text-[16px] text-[#666666]" : ""} [&>p]:mb-3 last:[&>p]:mb-0`}
        dangerouslySetInnerHTML={{ __html: productDescription }}
      />

      {variationGroups.map((group) => (
        <div key={group.name} className="border-t border-[#ececec] pt-4">
          {isDesktop ? (
            <div className="flex items-center gap-4">
              <p className="text-sm uppercase tracking-wide text-[#7f7f7f]">
                {group.name} :
              </p>
              <div className="h-px flex-1 bg-[#ececec]" />
            </div>
          ) : (
            <p className="text-sm uppercase tracking-wide text-[#7f7f7f]">
              {group.name} :
            </p>
          )}

          <div className="mt-3 space-y-3">
            {group.options.map((option) => {
              const isSelected = selections[group.name] === option.label;
              const isAvailable = product
                ? isOptionAvailableGivenSelections(
                    product,
                    group.name,
                    option.label,
                    selections
                  )
                : option.available;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    isAvailable &&
                    onSelectOption &&
                    onSelectOption(group.name, option.label)
                  }
                  disabled={!isAvailable}
                  className={`flex items-center gap-3 text-left ${
                    isAvailable ? "" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary"
                        : isAvailable
                          ? "border-[#c9c9c9] bg-[#d9d9d9]"
                          : "border-[#d8d8d8] bg-[#eeeeee]"
                    }`}
                  />
                  <span
                    className={`text-[16px] ${
                      isAvailable
                        ? "text-[#555555]"
                        : "text-[#9a9a9a] line-through"
                    }`}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductInfo;
