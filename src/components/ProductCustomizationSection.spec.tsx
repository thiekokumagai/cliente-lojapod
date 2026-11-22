import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductCustomizationSection from "./ProductCustomizationSection";
import {
  calculateCustomization,
  getEffectiveStageLimits,
  type CompositionSelections,
  type PublicCompositionStage,
} from "@/services/compositions";

const STAGES: PublicCompositionStage[] = [
  {
    id: "pc-ponto",
    groupId: "g-ponto",
    name: "Ponto da carne",
    minQuantity: 1,
    maxQuantity: 1,
    freeQuantity: 0,
    sortOrder: 0,
    options: [
      { id: "o-mal", name: "Malpassada", price: 0, maxQuantityPerItem: 1, sortOrder: 0 },
      { id: "o-ponto", name: "Ao ponto", price: 0, maxQuantityPerItem: 1, sortOrder: 1 },
    ],
  },
  {
    id: "pc-adicionais",
    groupId: "g-adicionais",
    name: "Adicionais",
    minQuantity: 0,
    maxQuantity: 3,
    freeQuantity: 0,
    sortOrder: 1,
    options: [
      { id: "o-cebola", name: "Sem cebola", description: "Retira cebola", price: 0, maxQuantityPerItem: 1, sortOrder: 0 },
      { id: "o-bacon", name: "Bacon extra", price: 4, maxQuantityPerItem: 2, sortOrder: 1 },
    ],
  },
];

function Harness() {
  const [selections, setSelections] = useState<CompositionSelections>({});
  const handleChange = (
    groupId: string,
    optionId: string,
    delta: number,
    stage: PublicCompositionStage,
  ) => {
    setSelections((prev) => {
      const group = { ...(prev[groupId] || {}) };
      const curr = group[optionId] || 0;
      const total = Object.values(group).reduce((s, q) => s + q, 0);
      const { maxQuantity } = getEffectiveStageLimits(stage);
      const optMax = stage.options.find((o) => o.id === optionId)?.maxQuantityPerItem ?? 1;
      if (delta > 0) {
        if (maxQuantity === 1) return { ...prev, [groupId]: { [optionId]: 1 } };
        if (total >= maxQuantity || curr >= optMax) return prev;
        group[optionId] = curr + 1;
      } else if (delta < 0) {
        if (curr <= 1) delete group[optionId];
        else group[optionId] = curr - 1;
      }
      return { ...prev, [groupId]: group };
    });
  };
  const summary = calculateCustomization(STAGES, selections, 30);
  return (
    <div>
      <ProductCustomizationSection
        stages={STAGES}
        isLoading={false}
        selections={selections}
        onChangeQuantity={handleChange}
      />
      <div data-testid="total-price">{summary.finalUnitPrice.toFixed(2)}</div>
      <div data-testid="valid">{summary.isAllValid ? "VALID" : "INVALID"}</div>
    </div>
  );
}

describe("ProductCustomizationSection (inline estilo iFood)", () => {
  it("renderiza radio (max=1), checkbox (max>1, optMax=1) e contador -/+ (optMax>1), atualiza badge OBRIGATÓRIO -> OK e soma preço ao vivo", () => {
    render(<Harness />);

    expect(screen.getByText("OBRIGATÓRIO")).toBeInTheDocument();
    expect(screen.getByText("OPCIONAL")).toBeInTheDocument();
    expect(screen.getByTestId("valid")).toHaveTextContent("INVALID");
    expect(screen.getByTestId("total-price")).toHaveTextContent("30.00");

    // Radio: escolher "Ao ponto" cumpre obrigatório
    const radioAoPonto = screen.getByRole("radio", { name: /Ao ponto/i });
    fireEvent.click(radioAoPonto);
    expect(radioAoPonto).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByTestId("valid")).toHaveTextContent("VALID");

    // Checkbox: "Sem cebola"
    const cbCebola = screen.getByRole("checkbox", { name: /Sem cebola/i });
    fireEvent.click(cbCebola);
    expect(cbCebola).toHaveAttribute("aria-checked", "true");

    // Contador -/+: adicionar 2x Bacon extra (+R$ 8,00 -> total 38,00)
    const addBacon = screen.getByRole("button", { name: /Aumentar Bacon extra/i });
    fireEvent.click(addBacon);
    fireEvent.click(addBacon);
    expect(screen.getByTestId("total-price")).toHaveTextContent("38.00");
    // Atingiu maxQuantityPerItem (2) -> botão + desabilitado
    expect(addBacon).toBeDisabled();
  });
});
