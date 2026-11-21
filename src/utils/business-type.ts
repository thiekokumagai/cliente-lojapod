import type { BusinessType } from "@/hooks/useStoreSettings";

export function supportsCustomization(businessType?: BusinessType): boolean {
  return businessType === "FOOD" || businessType === "ACAI";
}

export function getCustomizationCopy(businessType?: BusinessType): {
  buttonLabel: string;
  buttonRepeatLabel: string;
  modalSubtitle: string;
} {
  if (businessType === "FOOD") {
    return {
      buttonLabel: "Monte seu prato",
      buttonRepeatLabel: "Montar outro prato",
      modalSubtitle: "Monte seu prato selecionando as opções abaixo.",
    };
  }
  if (businessType === "ACAI") {
    return {
      buttonLabel: "Monte seu açaí",
      buttonRepeatLabel: "Montar outro açaí",
      modalSubtitle: "Monte seu açaí selecionando os acompanhamentos abaixo.",
    };
  }
  return {
    buttonLabel: "Montar Produto",
    buttonRepeatLabel: "Montar outro",
    modalSubtitle: "Personalize seu produto selecionando as opções abaixo.",
  };
}
