const fs = require('fs');

let c = fs.readFileSync('src/components/ProductVariationModal.tsx', 'utf8');

c = c.replace(
  `  const handleIncrease = () => {
    if (!selectedOption || displayQuantity === 0) return;

    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, selectedOption);
  };`,
  `  const handleIncrease = () => {
    if (!selectedOption || displayQuantity === 0) return;

    const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
    if (currentOption?.stock !== undefined && displayQuantity >= currentOption.stock) return;

    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, selectedOption);
  };`
);

c = c.replace(
  `              <button
                type="button"
                onClick={handleIncrease}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>`,
  `              {(() => {
                const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
                const disableIncrease = currentOption?.stock !== undefined && displayQuantity >= currentOption.stock;
                
                return (
                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={disableIncrease}
                    className={\`flex h-8 w-8 items-center justify-center rounded-full \${
                      disableIncrease ? "bg-primary-foreground/10 opacity-50 cursor-not-allowed" : "bg-primary-foreground/20"
                    }\`}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                );
              })()}`
);

fs.writeFileSync('src/components/ProductVariationModal.tsx', c);
console.log('done');
