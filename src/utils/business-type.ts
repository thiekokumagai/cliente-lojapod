import type { BusinessType } from "@/hooks/useStoreSettings";

export function supportsCustomization(businessType?: BusinessType): boolean {
  return businessType === "FOOD" || businessType === "ACAI";
}

/**
 * Produto com montagem (grupos/complementos) não pode entrar no carrinho pelo "+" rápido:
 * os grupos e seus mínimos só são carregados na tela do produto, que é quem valida.
 */
export function requiresProductDetails(
  product: { isCustomizable?: boolean; isCombo?: boolean },
  businessType?: BusinessType,
): boolean {
  return !product.isCombo && Boolean(product.isCustomizable) && supportsCustomization(businessType);
}

export function getCustomizationCopy(businessType?: BusinessType): {
  buttonLabel: string;
  buttonRepeatLabel: string;
  modalSubtitle: string;
} {
  if (businessType === "FOOD" || businessType === "ACAI") {
    return {
      buttonLabel: "Monte seu pedido",
      buttonRepeatLabel: "Montar outro pedido",
      modalSubtitle: "Monte seu pedido selecionando as opções abaixo.",
    };
  }
  return {
    buttonLabel: "Montar Produto",
    buttonRepeatLabel: "Montar outro",
    modalSubtitle: "Personalize seu produto selecionando as opções abaixo.",
  };
}

export function formatServesLabel(servesCount?: number | null): string | null {
  if (typeof servesCount !== "number" || !Number.isFinite(servesCount) || servesCount < 1) {
    return null;
  }
  const count = Math.floor(servesCount);
  return count === 1 ? "Serve 1 pessoa" : `Serve ${count} pessoas`;
}
