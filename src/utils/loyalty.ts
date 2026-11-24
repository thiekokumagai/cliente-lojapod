import type { StoreLoyaltyProgram } from "@/services/loyalty";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/** Título do programa conforme o tipo configurado pela loja. */
export function getLoyaltyProgramTitle(program: StoreLoyaltyProgram): string {
  switch (program.type) {
    case "CASHBACK":
      return "Programa de Cashback Ativo!";
    case "POINTS_DISCOUNT":
      return "Programa de Pontos Ativo!";
    case "PROGRESSIVE_DISCOUNT":
      return "Programa de Desconto Progressivo Ativo!";
    default:
      return "Programa de Cartão Fidelidade Ativo!";
  }
}

/**
 * Prêmio sem o verbo, porque muitas lojas cadastram "Ganhe 1 Onigiri" e o título
 * já começa com "Ganhe". Também tira pontuação final ("!", ".").
 */
export function getLoyaltyRewardName(rewardText?: string | null): string {
  return (rewardText ?? "")
    .trim()
    .replace(/^(ganhe|ganha|ganhar)\s*:?\s+/i, "")
    .replace(/[\s!.]+$/, "")
    .trim();
}

/** Benefício em uma frase curta, para título em destaque no catálogo. */
export function getLoyaltyHeadline(program: StoreLoyaltyProgram): string {
  const reward = getLoyaltyRewardName(program.rewardText) || "um prêmio";
  switch (program.type) {
    case "CASHBACK":
      return `${program.cashbackPercent || 5}% de volta em cada compra`;
    case "POINTS_DISCOUNT":
      return "Junte pontos e troque por desconto";
    case "PROGRESSIVE_DISCOUNT": {
      const tiers = program.progressiveTiers ?? [];
      const max = tiers.length > 0 ? Math.max(...tiers.map((t) => t.discountPercent)) : 10;
      return `Até ${max}% OFF nos seus pedidos`;
    }
    case "HYBRID":
      return `Ganhe ${reward} ou desconto`;
    default:
      return `Ganhe ${reward}`;
  }
}

/** Resumo de uma linha embaixo do título (o detalhe completo fica em "Ver regras"). */
export function getLoyaltySummary(program: StoreLoyaltyProgram): string {
  switch (program.type) {
    case "CASHBACK":
      return "O valor volta como saldo para a próxima compra";
    case "POINTS_DISCOUNT":
      return `Cada R$ 1 vale ${Number(program.pointsPerReal ?? 1)} ponto`;
    case "PROGRESSIVE_DISCOUNT":
      return "Quanto mais pedidos, maior o desconto";
    case "HYBRID":
      return `A cada ${program.stampsRequired || 10} compras ou com seus pontos`;
    default:
      return `A cada ${program.stampsRequired || 10} compras`;
  }
}

/** Benefício do programa com a regra exata da loja (usado no catálogo e no carrinho). */
export function getLoyaltyBenefitText(program: StoreLoyaltyProgram): string {
  switch (program.type) {
    case "CASHBACK":
      return `Ganhe ${program.cashbackPercent || 5}% de volta em saldo a cada compra!`;
    case "POINTS_DISCOUNT": {
      const pointsPerReal = Number(program.pointsPerReal ?? 1);
      const pointValue = formatBRL(Number(program.pointsRedemptionValue ?? 0.05));
      return `Ganhe ${pointsPerReal} ponto(s) a cada R$ 1,00 gasto. Cada ponto vale ${pointValue} em desconto.`;
    }
    case "PROGRESSIVE_DISCOUNT":
      return "Quanto mais pedidos você fizer, maior será seu desconto exclusivo em cada compra.";
    case "HYBRID":
      return "Junte pontos e escolha entre brinde grátis ou cupom de desconto.";
    default:
      return `Junte ${program.stampsRequired || 10} compras válidas e ganhe: ${program.rewardText}!`;
  }
}

/**
 * Regras do programa ativo da loja, em itens curtos (sem dados de cliente).
 * Usado no informativo do catálogo; o saldo do cliente fica no carrinho.
 */
export function getLoyaltyProgramRules(program: StoreLoyaltyProgram): string[] {
  const rules: string[] = [];
  const type = program.type;

  if (type === "FREE_PRODUCT" || type === "HYBRID") {
    rules.push(`a cada ${program.stampsRequired || 10} compras`);
  }
  if (type === "POINTS_DISCOUNT" || type === "HYBRID") {
    rules.push(`${Number(program.pointsPerReal ?? 1)} pt por R$ 1`);
    rules.push(`1 pt = ${formatBRL(Number(program.pointsRedemptionValue ?? 0.05))}`);
    const minPoints = Number(program.minPointsToRedeem) || 0;
    if (minPoints > 0) rules.push(`resgate a partir de ${minPoints} pts`);
  }
  if (type === "CASHBACK") {
    rules.push("vira saldo para a próxima compra");
  }
  if (type === "PROGRESSIVE_DISCOUNT") {
    const tiers = Array.isArray(program.progressiveTiers) && program.progressiveTiers.length > 0
      ? [...program.progressiveTiers].sort((a, b) => a.minOrders - b.minOrders)
      : [
          { minOrders: 3, discountPercent: 3 },
          { minOrders: 5, discountPercent: 5 },
          { minOrders: 10, discountPercent: 10 },
        ];
    for (const tier of tiers) {
      rules.push(`${tier.minOrders} pedidos: ${tier.discountPercent}%`);
    }
  }

  const minOrder = Number(program.minOrderValue) || 0;
  if (minOrder > 0) rules.push(`mín. ${formatBRL(minOrder)} p/ pontuar`);
  const validity = Number(program.validityDays) || 0;
  if (validity > 0) rules.push(`válido por ${validity} dias`);

  return rules;
}
