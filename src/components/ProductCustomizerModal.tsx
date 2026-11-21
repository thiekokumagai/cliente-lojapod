import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Minus, Check, AlertCircle, ShoppingBag, X } from "lucide-react";
import type { Product, SelectedProduct } from "@/data/products";
import {
  calculateCustomization,
  compositionsService,
  type CompositionSelections,
  type PublicCompositionStage,
} from "@/services/compositions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BusinessType } from "@/hooks/useStoreSettings";
import { getCustomizationCopy } from "@/utils/business-type";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  businessType?: BusinessType;
  onConfirm: (item: SelectedProduct) => void;
}

const formatPrice = (price: number) => `R$${price.toFixed(2).replace(".", ",")}`;
const NO_STAGES: PublicCompositionStage[] = [];

export default function ProductCustomizerModal({
  isOpen,
  onClose,
  product,
  businessType,
  onConfirm,
}: ProductCustomizerModalProps) {
  const customizationCopy = getCustomizationCopy(businessType);
  const { data, isLoading } = useQuery({
    queryKey: ["product-compositions-public", product.id],
    queryFn: () => compositionsService.getProductCompositions(product.id),
    enabled: isOpen && !!product.id,
  });
  const compositions = data?.stages ?? NO_STAGES;

  // Estado: { [groupId]: { [optionId]: quantity } }
  const [selections, setSelections] = useState<CompositionSelections>({});

  // Resetar seleções quando o modal abrir para um novo produto
  useEffect(() => {
    if (isOpen) {
      setSelections({});
    }
  }, [isOpen, product.id]);

  // Função para alterar quantidade de uma opção
  const handleOptionQuantityChange = (
    groupId: string,
    optionId: string,
    delta: number,
    comp: PublicCompositionStage,
  ) => {
    setSelections((prev) => {
      const groupSelections = { ...(prev[groupId] || {}) };
      const currentQty = groupSelections[optionId] || 0;
      const totalGroupQty = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);

      const targetOption = comp.options.find((o) => o.id === optionId);
      const optionMax = targetOption?.maxQuantityPerItem ?? 1;

      if (delta > 0) {
        // Se maxQuantity do grupo for 1, substitui seleção anterior (estilo radio button)
        if (comp.maxQuantity === 1) {
          return {
            ...prev,
            [groupId]: { [optionId]: 1 },
          };
        }

        // Verifica limite do grupo e da opção
        if (totalGroupQty >= comp.maxQuantity) return prev;
        if (currentQty >= optionMax) return prev;

        groupSelections[optionId] = currentQty + 1;
      } else if (delta < 0) {
        if (currentQty <= 0) return prev;
        const nextQty = currentQty - 1;
        if (nextQty <= 0) {
          delete groupSelections[optionId];
        } else {
          groupSelections[optionId] = nextQty;
        }
      }

      return {
        ...prev,
        [groupId]: groupSelections,
      };
    });
  };

  // Cálculo de acréscimos e validações (mesma conta do servidor)
  const summary = useMemo(
    () => calculateCustomization(compositions, selections, product.price || 0),
    [compositions, selections, product.price],
  );
  const { totalAdditions, finalUnitPrice, isAllValid, pendingStageMessage } = summary;

  const handleConfirm = () => {
    if (!isAllValid) return;

    const stages = summary.stages;

    const snapshot = {
      basePrice: product.price,
      stages,
      totalAdditions,
      finalUnitPrice,
    };

    const lineId = `custom-${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    onConfirm({
      product: {
        ...product,
        price: finalUnitPrice,
      },
      isCustomized: true,
      customizationSnapshot: snapshot,
      customizationLineId: lineId,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-background border shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20 relative">
          <DialogTitle className="text-xl font-bold pr-6 text-foreground">{product.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {customizationCopy.modalSubtitle} Preço base:{" "}
            <span className="font-semibold text-foreground">{formatPrice(product.price)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando opções de montagem...
            </div>
          ) : compositions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma etapa de montagem configurada para este produto.
            </div>
          ) : (
            compositions.map((comp, idx) => {
              const groupSelections = selections[comp.groupId] || {};
              const totalGroupQty = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
              const isRequired = comp.minQuantity > 0;
              const isSatisfied = totalGroupQty >= comp.minQuantity;
              const isSingleChoice = comp.maxQuantity === 1;

              return (
                <div key={comp.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {idx + 1}. {comp.name}
                        </span>
                        {isRequired ? (
                          <Badge
                            variant={isSatisfied ? "secondary" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {isSatisfied ? "OK" : "Obrigatório"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Opcional
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {comp.description ||
                          (isSingleChoice
                            ? "Escolha 1 opção"
                            : `Escolha de ${comp.minQuantity} até ${comp.maxQuantity} opções`)}
                        {comp.freeQuantity > 0 &&
                          ` (${comp.freeQuantity} grátis)`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {totalGroupQty}/{comp.maxQuantity}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50 pt-1">
                    {comp.options.map((opt) => {
                      const qty = groupSelections[opt.id] || 0;
                      const isSelected = qty > 0;
                      const priceVal = Number(opt.price) || 0;
                      const hasExtraPrice = priceVal > 0;

                      return (
                        <div
                          key={opt.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground block truncate">{opt.name}</span>
                            {opt.description && (
                              <span className="text-xs text-muted-foreground block truncate">
                                {opt.description}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-primary block mt-0.5">
                              {hasExtraPrice ? `+ ${formatPrice(priceVal)}` : "Incluso"}
                            </span>
                          </div>

                          {isSingleChoice ? (
                            <button
                              type="button"
                              onClick={() => handleOptionQuantityChange(comp.groupId, opt.id, 1, comp)}
                              className={`h-7 px-3 rounded-full text-xs font-semibold transition-all border ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-muted"
                              }`}
                            >
                              {isSelected ? "Selecionado" : "Escolher"}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 rounded-xl p-1 border">
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => handleOptionQuantityChange(comp.groupId, opt.id, -1, comp)}
                                className="h-6 w-6 rounded-lg bg-background flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold">{qty}</span>
                              <button
                                type="button"
                                disabled={totalGroupQty >= comp.maxQuantity || qty >= opt.maxQuantityPerItem}
                                onClick={() => handleOptionQuantityChange(comp.groupId, opt.id, 1, comp)}
                                className="h-6 w-6 rounded-lg bg-background flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer com resumo de preço e botão de adicionar */}
        <div className="p-4 border-t bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-xl font-extrabold text-foreground">{formatPrice(finalUnitPrice)}</span>
              {totalAdditions > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({formatPrice(product.price)} + {formatPrice(totalAdditions)})
                </span>
              )}
            </div>
            {!isAllValid && pendingStageMessage && (
              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="h-3 w-3" /> {pendingStageMessage}
              </p>
            )}
          </div>

          <Button
            type="button"
            disabled={!isAllValid || isLoading || compositions.length === 0}
            onClick={handleConfirm}
            className="h-11 rounded-2xl px-6 font-semibold shadow-md gap-2"
          >
            <ShoppingBag className="h-4 w-4" /> Adicionar ao Carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
