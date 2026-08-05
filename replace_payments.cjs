const fs = require('fs');
let c = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

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

c = c.replace(/paymentMethod === 'PIX' \? 'PIX' :/g, "paymentMethod === 'PIX' ? 'PIX' :");
// we already had mapped it in my previous fix, wait:
c = c.replace(/paymentMethod: paymentMethod === 'PIX' \? 'PIX' :[\s\S]*?paymentMethod === 'Cartão de Débito' \? 'Cartão de Débito' :[\s\S]*?'Dinheiro',/g, 'paymentMethod: paymentMethod,');

fs.writeFileSync('src/components/CartSidebar.tsx', c);
