const fs = require('fs');

let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

c = c.replace(
  /subtitle: \"Pagamento instantâneo com 5% de desconto\",/g,
  `subtitle: pixDiscountPercent > 0 ? \`Pagamento instantâneo com \${pixDiscountPercent}% de desconto\` : "Pagamento instantâneo",`
);

c = c.replace(
  /highlight: \"5% OFF\",/g,
  `highlight: pixDiscountPercent > 0 ? \`\${pixDiscountPercent}% OFF\` : undefined,`
);

fs.writeFileSync('src/components/CartSidebar.tsx', c);
console.log('done');
