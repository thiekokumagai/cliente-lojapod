const fs = require('fs');

let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

c = c.replace(
  /disabled=\{item\.product\.stock \!\=\= undefined \&\& item\.quantity \>\= item\.product\.stock\}/g,
  `disabled={(() => {
                                        let max = item.product.stock;
                                        if (item.selectedVariation && item.product.variationGroup) {
                                          const opt = item.product.variationGroup.options.find(o => o.label === item.selectedVariation);
                                          if (opt && opt.stock !== undefined) max = opt.stock;
                                        }
                                        return max !== undefined && item.quantity >= max;
                                      })()}`
);

c = c.replace(
  /className=\{\`rounded-full p-1\.5 \$\{item\.product\.stock \!\=\= undefined \&\& item\.quantity \>\= item\.product\.stock \? \"bg-muted text-muted-foreground cursor-not-allowed\" : \"bg-primary text-primary-foreground\"\}\`\}/g,
  `className={\`rounded-full p-1.5 \${(() => {
                                        let max = item.product.stock;
                                        if (item.selectedVariation && item.product.variationGroup) {
                                          const opt = item.product.variationGroup.options.find(o => o.label === item.selectedVariation);
                                          if (opt && opt.stock !== undefined) max = opt.stock;
                                        }
                                        return max !== undefined && item.quantity >= max;
                                      })() ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground"}\`}`
);

fs.writeFileSync('src/components/CartSidebar.tsx', c);
console.log('done');
