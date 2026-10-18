import { useState, useCallback } from "react";
import type { Product, ComboComponentSelection, ComboItemComponent } from "@/data/products";
import { useCart } from "@/contexts/CartContext";

export function useComboVariationFlow() {
  const { addToCart } = useCart();
  const [activeCombo, setActiveCombo] = useState<Product | null>(null);
  const [pendingComponents, setPendingComponents] = useState<ComboItemComponent[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [collectedSelections, setCollectedSelections] = useState<ComboComponentSelection[]>([]);

  const startComboFlow = useCallback((combo: Product, onFinished?: () => void) => {
    if (!combo.isCombo || !combo.comboItems || combo.comboItems.length === 0) {
      addToCart(combo);
      onFinished?.();
      return;
    }

    // Identificar componentes que precisam de seleção de variação:
    // Não possuem variação fixa definida E o componentProduct possui variationGroups
    const needsSelection = combo.comboItems.filter((ci) => {
      if (ci.variation) return false; // Já possui variação fixa
      const cp = ci.componentProduct;
      const groups = cp?.variationGroups && cp.variationGroups.length > 0
        ? cp.variationGroups
        : cp?.variationGroup
          ? [cp.variationGroup]
          : [];
      return groups.length > 0;
    });

    if (needsSelection.length === 0) {
      // Nenhum componente precisa de seleção, adiciona imediatamente
      addToCart(combo);
      onFinished?.();
      return;
    }

    // Inicia fluxo sequencial de seleção
    setActiveCombo(combo);
    setPendingComponents(needsSelection);
    setCurrentStepIndex(0);
    setCollectedSelections([]);
  }, [addToCart]);

  const handleConfirmCurrentStep = useCallback((selectedVariation: string) => {
    if (!activeCombo || pendingComponents.length === 0) return;

    const currentComponent = pendingComponents[currentStepIndex];
    const newSelection: ComboComponentSelection = {
      productId: currentComponent.productId,
      variation: selectedVariation,
      productName: currentComponent.productName,
    };

    const nextSelections = [...collectedSelections, newSelection];
    setCollectedSelections(nextSelections);

    if (currentStepIndex + 1 < pendingComponents.length) {
      // Avança para o próximo componente do combo
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Concluiu todos os passos, adiciona o combo ao carrinho com as escolhas
      addToCart({
        product: activeCombo,
        comboSelections: nextSelections,
      });

      // Limpa estado
      setActiveCombo(null);
      setPendingComponents([]);
      setCurrentStepIndex(0);
      setCollectedSelections([]);
    }
  }, [activeCombo, pendingComponents, currentStepIndex, collectedSelections, addToCart]);

  const handleCancelComboFlow = useCallback(() => {
    setActiveCombo(null);
    setPendingComponents([]);
    setCurrentStepIndex(0);
    setCollectedSelections([]);
  }, []);

  const currentComponent = pendingComponents[currentStepIndex];
  const currentProductForModal = currentComponent?.componentProduct || (currentComponent ? {
    id: currentComponent.productId,
    name: currentComponent.productName,
    image: currentComponent.productImage || "",
    category: "Combo",
    description: "",
    price: currentComponent.productPrice,
  } as Product : null);

  const totalSteps = pendingComponents.length;
  const isStepActive = !!activeCombo && !!currentProductForModal;

  return {
    startComboFlow,
    isStepActive,
    currentProductForModal,
    activeCombo,
    currentStepIndex,
    totalSteps,
    handleConfirmCurrentStep,
    handleCancelComboFlow,
  };
}
