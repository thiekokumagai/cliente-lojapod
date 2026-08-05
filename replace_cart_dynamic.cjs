const fs = require('fs');

let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

// 1. Rename payment methods globally
c = c.replace(/type PaymentMethod = .*/g, 'type PaymentMethod = "PIX" | "Cartão de Débito" | "Cartão de Crédito" | "Dinheiro";');
c = c.replace(/value: "pix"/g, 'value: "PIX"');
c = c.replace(/value: "debito"/g, 'value: "Cartão de Débito"');
c = c.replace(/value: "credito"/g, 'value: "Cartão de Crédito"');
c = c.replace(/value: "dinheiro"/g, 'value: "Dinheiro"');
c = c.replace(/paymentMethod === "pix"/g, 'paymentMethod === "PIX"');
c = c.replace(/paymentMethod !== "pix"/g, 'paymentMethod !== "PIX"');
c = c.replace(/paymentMethod === "debito"/g, 'paymentMethod === "Cartão de Débito"');
c = c.replace(/paymentMethod !== "debito"/g, 'paymentMethod !== "Cartão de Débito"');
c = c.replace(/paymentMethod === "credito"/g, 'paymentMethod === "Cartão de Crédito"');
c = c.replace(/paymentMethod !== "credito"/g, 'paymentMethod !== "Cartão de Crédito"');
c = c.replace(/paymentMethod === "dinheiro"/g, 'paymentMethod === "Dinheiro"');
c = c.replace(/paymentMethod !== "dinheiro"/g, 'paymentMethod !== "Dinheiro"');
c = c.replace(/paymentMethod === 'pix'/g, "paymentMethod === 'PIX'");
c = c.replace(/paymentMethod === 'credito'/g, "paymentMethod === 'Cartão de Crédito'");
c = c.replace(/paymentMethod === 'debito'/g, "paymentMethod === 'Cartão de Débito'");
c = c.replace(/checkoutPaymentMethod === "pix"/g, 'checkoutPaymentMethod === "PIX"');
c = c.replace(/checkoutPaymentMethod === "debito"/g, 'checkoutPaymentMethod === "Cartão de Débito"');
c = c.replace(/checkoutPaymentMethod === "credito"/g, 'checkoutPaymentMethod === "Cartão de Crédito"');
c = c.replace(/checkoutPaymentMethod === "dinheiro"/g, 'checkoutPaymentMethod === "Dinheiro"');
c = c.replace(/option\.value === "credito"/g, 'option.value === "Cartão de Crédito"');

// 2. Fix the payload formatting (removing the old ternary)
c = c.replace(/paymentMethod: paymentMethod === 'PIX' \? 'PIX' :[\s\S]*?'Dinheiro',/g, 'paymentMethod: paymentMethod,');

// 3. Fix the address number parsing
c = c.replace(/number: "S\/N",/, 'number: structuredAddress?.number || "S/N",');
c = c.replace(/const parts = \[structuredAddress\.mainText, structuredAddress\.secondaryText\];/, 'const parts = [structuredAddress.mainText, structuredAddress.number, structuredAddress.secondaryText];');
c = c.replace(/return parts\.join\(\", \"\);/, 'return parts.filter(Boolean).join(", ");');

// 4. Dynamic settings logic
c = c.replace(/const CREDIT_INSTALLMENTS = \[[\s\S]*?\] as const;\n\n/m, '');

const dynamicCalculations = `
  const pixDiscountPercent = useMemo(() => {
    const rule = storeSettings?.paymentRules?.find((r) => r.paymentMethod === 'pix' && r.type === 'discount');
    return rule ? rule.value : 0;
  }, [storeSettings]);

  const creditInstallmentsOptions = useMemo(() => {
    const rules = storeSettings?.paymentRules?.filter(r => r.paymentMethod === 'credit' && r.type === 'charge') || [];
    const options = [{ value: 1, interest: 0 }];
    
    if (rules.length === 0) return options;

    rules.sort((a, b) => (a.parcelaMin || 0) - (b.parcelaMin || 0));

    rules.forEach(rule => {
       const min = rule.parcelaMin || 2;
       const max = rule.parcelaMax || min;
       const interest = rule.passedToCustomer ? rule.value : 0; 
       
       for (let i = min; i <= max; i++) {
           if (!options.find(o => o.value === i)) {
               options.push({ value: i, interest: interest });
           }
       }
    });

    return options.sort((a, b) => a.value - b.value);
  }, [storeSettings]);

`;

c = c.replace(/  const \[step, setStep\] = useState<CheckoutStep>\("cart"\);/, dynamicCalculations + '  const [step, setStep] = useState<CheckoutStep>("cart");');

// Fix pixDiscount
c = c.replace(/const pixDiscount = useMemo\(\(\) => totalPrice \* 0\.05, \[totalPrice\]\);/, 'const pixDiscount = useMemo(() => totalPrice * (pixDiscountPercent / 100), [totalPrice, pixDiscountPercent]);');

// Fix CREDIT_INSTALLMENTS usage
c = c.replace(/CREDIT_INSTALLMENTS/g, 'creditInstallmentsOptions');

fs.writeFileSync('src/components/CartSidebar.tsx', c);
