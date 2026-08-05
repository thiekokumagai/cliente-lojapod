const fs = require('fs');

let content = fs.readFileSync('src/components/CartSidebar.tsx', 'utf8');

const searchTarget = `<button
                                      onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariation)}
                                      className="rounded-full bg-primary p-1.5 text-primary-foreground"
                                    >`;

const replacementTarget = `<button
                                      onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariation)}
                                      disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
                                      className={\`rounded-full p-1.5 \${item.product.stock !== undefined && item.quantity >= item.product.stock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground"}\`}
                                    >`;

content = content.replace(searchTarget, replacementTarget);

fs.writeFileSync('src/components/CartSidebar.tsx', content);
console.log('Script executed');
