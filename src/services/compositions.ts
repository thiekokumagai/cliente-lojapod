import { api } from "./api";

// Contrato de GET /store/compositions/product/:productId (api-lojapod compositions.service.ts).
// min/max/freeQuantity já vêm resolvidos (sobrescrita do produto ?? valor do grupo).
export interface PublicCompositionOption {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  maxQuantityPerItem: number;
  sortOrder: number;
}

export interface PublicCompositionStage {
  id: string;
  groupId: string;
  name: string;
  description?: string | null;
  minQuantity: number;
  maxQuantity: number;
  freeQuantity: number;
  sortOrder: number;
  options: PublicCompositionOption[];
}

export interface PublicProductCompositions {
  product: {
    id: string;
    title: string;
    price: number | string | null;
    promotionalPrice?: number | string | null;
    isCustomizable: boolean;
    isVisible: boolean;
  };
  stages: PublicCompositionStage[];
}

/** { [groupId]: { [optionId]: quantidade } } */
export type CompositionSelections = Record<string, Record<string, number>>;

export interface CustomizationSummary {
  totalAdditions: number;
  finalUnitPrice: number;
  isAllValid: boolean;
  pendingStageMessage: string | null;
  stages: {
    groupId: string;
    groupName: string;
    options: { optionId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Mesma conta do servidor (create-order.use-case.ts, resolveCustomizedAllowedPrices):
 * por grupo, as primeiras `freeQuantity` unidades na ordem das opções (sortOrder) são grátis
 * e as demais pagam `price`.
 */
export function calculateCustomization(
  stages: PublicCompositionStage[],
  selections: CompositionSelections,
  basePrice: number,
): CustomizationSummary {
  let additionsSum = 0;
  let pendingMsg: string | null = null;
  let valid = true;
  const snapshotStages: CustomizationSummary["stages"] = [];

  for (const stage of stages) {
    const groupSelections = selections[stage.groupId] || {};
    const totalGroupQty = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);

    if (totalGroupQty < stage.minQuantity) {
      valid = false;
      if (!pendingMsg) pendingMsg = `Escolha ao menos ${stage.minQuantity} opção em "${stage.name}"`;
    }

    const freeSlots = stage.freeQuantity || 0;
    let usedFree = 0;
    const options = [...stage.options]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .filter((opt) => (groupSelections[opt.id] || 0) > 0)
      .map((opt) => {
        const quantity = groupSelections[opt.id];
        const unitPrice = Number(opt.price) || 0;
        const freeHere = Math.min(quantity, Math.max(0, freeSlots - usedFree));
        usedFree += freeHere;
        const totalPrice = round2(unitPrice * (quantity - freeHere));
        additionsSum += totalPrice;
        return { optionId: opt.id, name: opt.name, quantity, unitPrice, totalPrice };
      });

    if (options.length > 0) {
      snapshotStages.push({ groupId: stage.groupId, groupName: stage.name, options });
    }
  }

  const totalAdditions = round2(additionsSum);
  return {
    totalAdditions,
    finalUnitPrice: round2((basePrice || 0) + totalAdditions),
    isAllValid: valid,
    pendingStageMessage: pendingMsg,
    stages: snapshotStages,
  };
}

export const compositionsService = {
  async getProductCompositions(productId: string): Promise<PublicProductCompositions> {
    return api.get<PublicProductCompositions>(`/store/compositions/product/${productId}`);
  },
};
