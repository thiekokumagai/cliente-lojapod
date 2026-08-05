const fs = require('fs');

let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

c = c.replace(
  /return options;\n  \}, \[storeSettings\]\);/g,
  `return options;\n  }, [storeSettings, pixDiscountPercent]);`
);

fs.writeFileSync('src/components/CartSidebar.tsx', c);
