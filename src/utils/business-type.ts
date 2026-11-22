import type { BusinessType } from "@/hooks/useStoreSettings";

export function supportsCustomization(businessType?: BusinessType): boolean {
  return businessType === "FOOD" || businessType === "ACAI";
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
