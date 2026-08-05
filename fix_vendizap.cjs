const fs = require('fs');

let c = fs.readFileSync('src/hooks/useVendizapProducts.ts', 'utf8');

c = c.replace(
  /const available = product\.items\?\.some\(item => \n\s*item\.stock > 0 && item\.options\.some\(o => o\.option\.value === opt\.value\)\n\s*\) \?\? false;/g,
  `const availableItem = product.items?.find(item => 
      item.options.some(o => o.option.value === opt.value)
    );
    const stock = availableItem?.stock ?? 0;
    const available = stock > 0;`
);

c = c.replace(
  /return \{\n\s*label: opt\.value,\n\s*available,\n\s*\};/g,
  `return {
      label: opt.value,
      available,
      stock,
    };`
);

fs.writeFileSync('src/hooks/useVendizapProducts.ts', c);
console.log('Done');
