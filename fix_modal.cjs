const fs = require('fs');

let c = fs.readFileSync('src/components/ProductVariationModal.tsx', 'utf8');

c = c.replace(
  /const handleIncrease = \(\) => \{\n\s*if \(\!selectedOption || displayQuantity === 0\) return;\n\n\s*const nextQuantity = displayQuantity \+ 1;\n\s*setDisplayQuantity\(nextQuantity\);\n\s*updateQuantity\(product.id, nextQuantity, selectedOption\);\n\s*\};/,
  `const handleIncrease = () => {
    if (!selectedOption || displayQuantity === 0) return;

    const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
    if (currentOption?.stock !== undefined && displayQuantity >= currentOption.stock) return;

    const nextQuantity = displayQuantity + 1;
    setDisplayQuantity(nextQuantity);
    updateQuantity(product.id, nextQuantity, selectedOption);
  };`
);

c = c.replace(
  /<button\n\s*type=\"button\"\n\s*onClick=\{handleIncrease\}\n\s*className=\"flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground\/20\"\n\s*aria-label=\"Aumentar quantidade\"\n\s*>/g,
  `{(() => {
    const currentOption = product.variationGroup?.options.find(o => o.label === selectedOption);
    const disableIncrease = currentOption?.stock !== undefined && displayQuantity >= currentOption.stock;
    return (
      <button
        type="button"
        onClick={handleIncrease}
        disabled={disableIncrease}
        className={\`flex h-8 w-8 items-center justify-center rounded-full \${disableIncrease ? "bg-primary-foreground/10 opacity-50 cursor-not-allowed" : "bg-primary-foreground/20"}\`}
        aria-label="Aumentar quantidade"
      >
    );
  })()}`
);

fs.writeFileSync('src/components/ProductVariationModal.tsx', c);
console.log('Done');
