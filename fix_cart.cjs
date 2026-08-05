const fs = require('fs');

let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

// 1. Rename the dynamically generated array to creditInstallmentsOptions
c = c.replace(/const creditInstallments = useMemo\(\(\) => \{/g, 'const creditInstallmentsOptions = useMemo(() => {');
c = c.replace(/\{creditInstallments\.filter\(/g, '{creditInstallmentsOptions.filter(');
c = c.replace(/creditInstallments\.find\(/g, 'creditInstallmentsOptions.find(');
c = c.replace(/creditInstallments\[0\]/g, 'creditInstallmentsOptions[0]');
c = c.replace(/CREDIT_INSTALLMENTS/g, 'creditInstallmentsOptions');

// 2. Remove the old `pixDiscount` that was using `.05`
c = c.replace(/  const pixDiscount = useMemo\(\(\) => totalPrice \* \.05, \[totalPrice\]\);\n/g, '');

fs.writeFileSync('src/components/CartSidebar.tsx', c);
