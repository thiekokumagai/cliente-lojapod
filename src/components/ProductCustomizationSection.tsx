import { Check, Minus, Plus, Loader2 } from "lucide-react";
import {
  getEffectiveStageLimits,
  type CompositionSelections,
  type PublicCompositionStage,
} from "@/services/compositions";

interface ProductCustomizationSectionProps {
  stages: PublicCompositionStage[];
  isLoading: boolean;
  selections: CompositionSelections;
  onChangeQuantity: (
    groupId: string,
    optionId: string,
    delta: number,
    stage: PublicCompositionStage,
  ) => void;
  highlightedGroupId?: string | null;
}

const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

function formatStageRule(minQuantity: number, maxQuantity: number, freeQuantity: number): string {
  let base: string;
  if (minQuantity === 1 && maxQuantity === 1) {
    base = "Escolha 1 opção";
  } else if (minQuantity === 0 && maxQuantity === 1) {
    base = "Escolha até 1 opção";
  } else if (minQuantity === 0) {
    base = `Escolha até ${maxQuantity} opções`;
  } else if (minQuantity === maxQuantity) {
    base = `Escolha ${maxQuantity} opções`;
  } else {
    base = `Escolha de ${minQuantity} a ${maxQuantity} opções`;
  }

  if (freeQuantity > 0) {
    return `${base} • Até ${freeQuantity} grátis`;
  }
  return base;
}

export default function ProductCustomizationSection({
  stages,
  isLoading,
  selections,
  onChangeQuantity,
  highlightedGroupId,
}: ProductCustomizationSectionProps) {
  if (isLoading) {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Carregando opções de montagem...
      </div>
    );
  }

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4" data-testid="product-customization-section">
      {stages.map((stage) => {
        const { minQuantity, maxQuantity } = getEffectiveStageLimits(stage);
        const groupSelections = selections[stage.groupId] || {};
        const totalGroupQty = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
        const isRequired = minQuantity > 0;
        const isSatisfied = totalGroupQty >= minQuantity;
        const isSingleChoice = maxQuantity === 1;
        const isHighlighted = highlightedGroupId === stage.groupId;

        return (
          <section
            key={stage.groupId}
            data-customization-group-id={stage.groupId}
            className={`overflow-hidden rounded-2xl border bg-card transition-all ${
              isHighlighted
                ? "border-destructive ring-2 ring-destructive/30"
                : "border-border-subtle"
            }`}
          >
            {/* Cabeçalho estilo iFood */}
            <div className="flex items-start justify-between gap-3 bg-muted/50 px-4 py-3 border-b border-border-subtle">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground leading-tight">
                  {stage.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stage.description || formatStageRule(minQuantity, maxQuantity, stage.freeQuantity)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {totalGroupQty}/{maxQuantity}
                </span>
                {isRequired ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isSatisfied
                        ? "bg-emerald-600 text-white"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {isSatisfied && <Check className="h-3 w-3" />}
                    {isSatisfied ? "OK" : "OBRIGATÓRIO"}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    OPCIONAL
                  </span>
                )}
              </div>
            </div>

            {/* Lista de opções */}
            <div
              className="divide-y divide-border/50 px-4"
              role={isSingleChoice ? "radiogroup" : undefined}
              aria-label={stage.name}
            >
              {stage.options.map((opt) => {
                const qty = groupSelections[opt.id] || 0;
                const isSelected = qty > 0;
                const priceVal = Number(opt.price) || 0;
                const optionMax = Math.max(1, Number(opt.maxQuantityPerItem) || 1);
                const isCheckbox = !isSingleChoice && optionMax <= 1;
                const groupAtLimit = totalGroupQty >= maxQuantity;

                if (isSingleChoice) {
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() =>
                        onChangeQuantity(
                          stage.groupId,
                          opt.id,
                          isSelected && !isRequired ? -1 : 1,
                          stage,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {opt.name}
                        </span>
                        {opt.description && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        )}
                        {priceVal > 0 && (
                          <span className="mt-0.5 block text-xs font-semibold text-primary">
                            + {formatPrice(priceVal)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </span>
                    </button>
                  );
                }

                if (isCheckbox) {
                  const isDisabled = !isSelected && groupAtLimit;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      disabled={isDisabled}
                      onClick={() =>
                        onChangeQuantity(stage.groupId, opt.id, isSelected ? -1 : 1, stage)
                      }
                      className={`flex w-full items-center justify-between gap-3 py-3 text-left transition-colors ${
                        isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {opt.name}
                        </span>
                        {opt.description && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        )}
                        {priceVal > 0 && (
                          <span className="mt-0.5 block text-xs font-semibold text-primary">
                            + {formatPrice(priceVal)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                }

                // Contador - qty + (quando max > 1 e maxQuantityPerItem > 1)
                return (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{opt.name}</span>
                      {opt.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      )}
                      {priceVal > 0 && (
                        <span className="mt-0.5 block text-xs font-semibold text-primary">
                          + {formatPrice(priceVal)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 rounded-xl border bg-muted/40 p-1">
                      <button
                        type="button"
                        aria-label={`Diminuir ${opt.name}`}
                        disabled={qty <= 0}
                        onClick={() => onChangeQuantity(stage.groupId, opt.id, -1, stage)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background text-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums">{qty}</span>
                      <button
                        type="button"
                        aria-label={`Aumentar ${opt.name}`}
                        disabled={groupAtLimit || qty >= optionMax}
                        onClick={() => onChangeQuantity(stage.groupId, opt.id, 1, stage)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background text-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
