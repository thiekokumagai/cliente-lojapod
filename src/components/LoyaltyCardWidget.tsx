import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Gift, Sparkles, Clock, CheckCircle2, AlertCircle, ChevronRight, Percent, DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { storeLoyaltyService } from "@/services/loyalty";

interface LoyaltyCardWidgetProps {
  customerPhone?: string;
  orderAmount?: number;
  selectedReward?: { rewardType: string; rewardTitle: string } | null;
  onApplyRewardCoupon?: (couponCode: string) => void;
  onApplyDiscountValue?: (discount: number) => void;
  onRewardRedeemed?: (reward: { rewardType: string; rewardTitle: string } | null) => void;
}

export default function LoyaltyCardWidget({
  customerPhone,
  orderAmount,
  selectedReward,
  onApplyRewardCoupon,
  onApplyDiscountValue,
  onRewardRedeemed,
}: LoyaltyCardWidgetProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const cleanPhone = useMemo(() => {
    return (customerPhone || "").replace(/\D/g, "");
  }, [customerPhone]);

  const { data } = useQuery({
    queryKey: ["store-loyalty-card", cleanPhone],
    queryFn: () => storeLoyaltyService.getCard(cleanPhone),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  const handleSelectReward = (reward: {
    rewardType: string;
    rewardTitle: string;
    discountValue?: number;
    couponCode?: string;
  }) => {
    if (reward.couponCode && onApplyRewardCoupon) {
      onApplyRewardCoupon(reward.couponCode);
    }
    if (reward.discountValue !== undefined && onApplyDiscountValue) {
      onApplyDiscountValue(reward.discountValue);
    }
    if (onRewardRedeemed) {
      onRewardRedeemed({
        rewardType: reward.rewardType,
        rewardTitle: reward.rewardTitle,
      });
    }
  };

  const handleRemoveReward = () => {
    if (onApplyDiscountValue) {
      onApplyDiscountValue(0);
    }
    if (onRewardRedeemed) {
      onRewardRedeemed(null);
    }
  };

  const program = data?.program;
  const card = data?.card;

  const isCardExpired =
    card?.status === "EXPIRED" ||
    (card?.expiresAt && new Date().getTime() > new Date(card.expiresAt).getTime());

  const progType = program?.type || "FREE_PRODUCT";
  const maxStamps = program?.stampsRequired || 10;
  const currentStamps = isCardExpired || card?.status === "REDEEMED" ? 0 : (card?.currentStamps || 0);
  const isStampsCompleted =
    !isCardExpired &&
    (progType === "FREE_PRODUCT" || progType === "HYBRID") &&
    (currentStamps >= maxStamps || card?.status === "COMPLETED");

  const cashbackBalance = isCardExpired || card?.status === "REDEEMED" ? 0 : (Number(card?.cashbackBalance) || 0);
  const pointsBalance = isCardExpired || card?.status === "REDEEMED" ? 0 : (Number(card?.pointsBalance) || 0);
  const pointsMoneyValue = pointsBalance * (Number(program?.pointsRedemptionValue) || 0.05);

  const minOrderVal = Number(program?.minOrderValue) || 0;
  const orderQualifies = orderAmount !== undefined && (minOrderVal <= 0 || orderAmount >= minOrderVal);

  // Desconto Progressivo - Nível Atual e Próximo Nível (Declarados ANTES de qualquer retorno condicional)
  const progressiveTiers = useMemo(() => {
    if (Array.isArray(program?.progressiveTiers) && program.progressiveTiers.length > 0) {
      return [...program.progressiveTiers].sort((a, b) => a.minOrders - b.minOrders);
    }
    return [
      { minOrders: 3, discountPercent: 3 },
      { minOrders: 5, discountPercent: 5 },
      { minOrders: 10, discountPercent: 10 },
    ];
  }, [program?.progressiveTiers]);

  const currentTier = useMemo(() => {
    if (progType !== "PROGRESSIVE_DISCOUNT") return null;
    const qualified = progressiveTiers.filter((t) => currentStamps >= t.minOrders);
    return qualified.length > 0 ? qualified[qualified.length - 1] : null;
  }, [progType, progressiveTiers, currentStamps]);

  const nextTier = useMemo(() => {
    if (progType !== "PROGRESSIVE_DISCOUNT") return null;
    return progressiveTiers.find((t) => currentStamps < t.minOrders) || null;
  }, [progType, progressiveTiers, currentStamps]);

  // Se o programa for PROGRESSIVE_DISCOUNT e o cliente atingiu um nível, aplica automaticamente o desconto no pedido!
  useEffect(() => {
    if (progType === "PROGRESSIVE_DISCOUNT" && currentTier && currentTier.discountPercent > 0 && orderAmount) {
      const discountVal = Math.round(orderAmount * (currentTier.discountPercent / 100) * 100) / 100;
      if (onApplyDiscountValue) {
        onApplyDiscountValue(discountVal);
      }
      if (onRewardRedeemed) {
        onRewardRedeemed({
          rewardType: "PROGRESSIVE_DISCOUNT",
          rewardTitle: `Desconto Progressivo: ${currentTier.discountPercent}% OFF (-${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(discountVal)})`,
        });
      }
    }
  }, [progType, currentTier, orderAmount]);

  // Se o programa não existir ou estiver desativado pela loja, não renderiza
  if (!program || !program.isActive) {
    return null;
  }

  // Se não temos telefone ainda, mostra um convite amigável com a regra exata da loja
  if (!cleanPhone || cleanPhone.length < 8) {
    const inviteBenefit =
      program.type === "CASHBACK"
        ? `Ganhe ${program.cashbackPercent || 5}% de volta em saldo a cada compra!`
        : program.type === "POINTS_DISCOUNT"
        ? `Cada R$ 1 gasto vira pontos para trocar por dinheiro de desconto.`
        : program.type === "PROGRESSIVE_DISCOUNT"
        ? `Quanto mais pedidos você fizer, maior será seu desconto exclusivo em cada compra.`
        : program.type === "HYBRID"
        ? `Junte pontos e escolha entre brinde grátis ou cupom de desconto.`
        : `Junte ${program.stampsRequired || 10} compras válidas e ganhe: ${program.rewardText}!`;

    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
            {program.type === "CASHBACK" ? (
              <Percent className="h-5 w-5" />
            ) : program.type === "POINTS_DISCOUNT" ? (
              <DollarSign className="h-5 w-5" />
            ) : program.type === "PROGRESSIVE_DISCOUNT" ? (
              <Percent className="h-5 w-5" />
            ) : (
              <Gift className="h-5 w-5" />
            )}
          </div>
          <div>
            <span className="font-bold block text-primary">
              {program.type === "CASHBACK"
                ? "Programa de Cashback Ativo!"
                : program.type === "POINTS_DISCOUNT"
                ? "Programa de Pontos Ativo!"
                : program.type === "PROGRESSIVE_DISCOUNT"
                ? "Programa de Desconto Progressivo Ativo!"
                : "Programa de Cartão Fidelidade Ativo!"}
            </span>
            <span className="text-muted-foreground text-[11px] block mt-0.5">
              {inviteBenefit} Insira seu WhatsApp na entrega para pontuar.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatValidity = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Campo_Grande",
    });
  };

  const validityDateStr = formatValidity(card?.expiresAt);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-3.5 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-xs shrink-0 ${
              isStampsCompleted || cashbackBalance > 0 || pointsBalance > 0 || (currentTier && currentTier.discountPercent > 0)
                ? "bg-emerald-500 text-white animate-pulse"
                : orderQualifies
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-100"
            }`}
          >
            {progType === "CASHBACK" ? (
              <Percent className="h-5 w-5" />
            ) : progType === "POINTS_DISCOUNT" ? (
              <DollarSign className="h-5 w-5" />
            ) : progType === "PROGRESSIVE_DISCOUNT" ? (
              <Percent className="h-5 w-5" />
            ) : isStampsCompleted ? (
              <Gift className="h-5 w-5" />
            ) : orderQualifies ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Award className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {progType === "CASHBACK"
                  ? "Seu Cashback"
                  : progType === "POINTS_DISCOUNT"
                  ? "Seus Pontos"
                  : progType === "PROGRESSIVE_DISCOUNT"
                  ? "Desconto Progressivo"
                  : "Cartão Fidelidade"}
              </span>

              {progType === "CASHBACK" ? (
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  {formatBRL(cashbackBalance)} disponível
                </span>
              ) : progType === "POINTS_DISCOUNT" ? (
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                  {pointsBalance} pts ({formatBRL(pointsMoneyValue)})
                </span>
              ) : progType === "PROGRESSIVE_DISCOUNT" ? (
                currentTier ? (
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    {currentTier.discountPercent}% OFF Ativo!
                  </span>
                ) : (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {currentStamps} {currentStamps === 1 ? "pedido" : "pedidos"} feitos
                  </span>
                )
              ) : progType === "HYBRID" ? (
                <div className="flex items-center gap-1">
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {currentStamps} de {maxStamps} selos
                  </span>
                  <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                    {pointsBalance} pts ({formatBRL(pointsMoneyValue)})
                  </span>
                </div>
              ) : isStampsCompleted ? (
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  Prêmio Disponível!
                </span>
              ) : (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {currentStamps} de {maxStamps} selos
                </span>
              )}

              {Number(program.minOrderValue) > 0 && (
                orderAmount !== undefined ? (
                  orderAmount >= Number(program.minOrderValue) ? (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Pontua neste pedido ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Falta {formatBRL(Number(program.minOrderValue) - orderAmount)} p/ pontuar
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
                    (mín. {formatBRL(Number(program.minOrderValue))})
                  </span>
                )
              )}
            </div>

            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {orderAmount !== undefined && Number(program.minOrderValue) > 0 && orderAmount < Number(program.minOrderValue)
                ? `Pedido de ${formatBRL(orderAmount)} não atinge o mínimo de ${formatBRL(Number(program.minOrderValue))} para pontuar.`
                : progType === "CASHBACK"
                ? `Ganhe ${program.cashbackPercent || 5}% de volta em cada compra!`
                : progType === "POINTS_DISCOUNT"
                ? `Acumule pontos (${Number(program.pointsPerReal || 1)} pt/R$ 1).`
                : progType === "PROGRESSIVE_DISCOUNT"
                ? nextTier
                  ? `Mais ${nextTier.minOrders - currentStamps} pedidos para ${nextTier.discountPercent}% OFF!`
                  : `Nível máximo de desconto atingido!`
                : `Prêmio: ${program.rewardText}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0 ml-1"
        >
          {isExpanded ? "Ocultar" : "Detalhes"}
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {/* Conteúdo Expandido de Acordo com o Tipo */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-2.5">
          {/* MODO 1 ou 5: Cartela de Selos */}
          {(progType === "FREE_PRODUCT" || progType === "HYBRID") && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start items-center">
                {Array.from({ length: maxStamps }).map((_, idx) => {
                  const hasStamp = idx < currentStamps;
                  const isNextPending = idx === currentStamps;
                  const isEarnedThisOrder = isNextPending && orderQualifies;
                  const isLast = idx === maxStamps - 1;

                  return (
                    <div
                      key={idx}
                      title={
                        hasStamp
                          ? `Selo ${idx + 1} conquistado`
                          : isEarnedThisOrder
                          ? `Selo ${idx + 1} será liberado com este pedido!`
                          : `Selo ${idx + 1}`
                      }
                      className={`h-9 w-9 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        hasStamp
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs scale-95"
                          : isEarnedThisOrder
                          ? "bg-emerald-50 text-emerald-700 border-dashed border-2 border-emerald-500 animate-pulse font-bold"
                          : isLast
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                          : "bg-muted/30 border-dashed border-border text-muted-foreground/50"
                      }`}
                    >
                      {hasStamp ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isEarnedThisOrder ? (
                        <span className="text-[11px] font-extrabold">+1</span>
                      ) : isLast ? (
                        <Gift className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[10px] font-semibold">{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda contextual */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                {orderQualifies ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    O selo piscou? Este pedido pontuará +1 selo!
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    ⚠️ Este pedido ainda não pontua selo (mín. {formatBRL(minOrderVal)}).
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MODO 4: Escadinha de Desconto Progressivo */}
          {progType === "PROGRESSIVE_DISCOUNT" && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-950">Seu progresso:</span>
                <span className="font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {currentStamps} pedidos concluídos
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {progressiveTiers.map((tier, idx) => {
                  const reached = currentStamps >= tier.minOrders;
                  const isCurrent = currentTier?.minOrders === tier.minOrders;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs"
                          : reached
                          ? "bg-emerald-100/80 text-emerald-900 border-emerald-300 font-medium"
                          : "bg-background/60 text-muted-foreground border-border/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {reached ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                        A partir de {tier.minOrders} pedidos
                      </span>
                      <span className={`font-bold ${isCurrent ? "text-white" : reached ? "text-emerald-700" : "text-foreground"}`}>
                        {tier.discountPercent}% OFF
                      </span>
                    </div>
                  );
                })}
              </div>

              {currentTier && currentTier.discountPercent > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Desconto de {currentTier.discountPercent}% OFF aplicado automaticamente!
                    </span>
                    <span className="font-bold">
                      -{formatBRL(Math.round((orderAmount || 0) * (currentTier.discountPercent / 100) * 100) / 100)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 3: Cashback */}
          {progType === "CASHBACK" && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-900">Saldo acumulado:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{formatBRL(cashbackBalance)}</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Você acumula {program.cashbackPercent || 5}% de volta a cada pedido. Saldo disponível para abater no valor da compra!
              </p>
              {cashbackBalance > 0 && onApplyDiscountValue && (
                selectedReward?.rewardType === "CASHBACK" ? (
                  <button
                    type="button"
                    onClick={handleRemoveReward}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 border border-emerald-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Cashback Aplicado: {formatBRL(cashbackBalance)} (Clique para remover)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectReward({
                        rewardType: "CASHBACK",
                        rewardTitle: `Cashback Utilizado: ${formatBRL(cashbackBalance)}`,
                        discountValue: cashbackBalance,
                      });
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Aplicar Cashback de {formatBRL(cashbackBalance)} no Pedido
                  </button>
                )
              )}
            </div>
          )}

          {/* MODO 2 ou HÍBRIDO: Pontos */}
          {(progType === "POINTS_DISCOUNT" || progType === "HYBRID") && (() => {
            const minPoints = Number(program.minPointsToRedeem) || 0;
            const hasReachedMinPoints = minPoints <= 0 || pointsBalance >= minPoints;
            const isPointsSelected = selectedReward?.rewardType === "POINTS_DISCOUNT";

            return (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-900">Total de pontos:</span>
                  <span className="font-extrabold text-amber-700 text-sm">{pointsBalance} pts</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Seus pontos valem <strong>{formatBRL(pointsMoneyValue)}</strong> de desconto imediato!
                  {minPoints > 0 && (
                    <span className="block mt-0.5 text-[10px] text-amber-700 font-medium">
                      (Mínimo para resgate: <strong>{minPoints} pontos</strong>)
                    </span>
                  )}
                </p>

                {pointsMoneyValue > 0 && onApplyDiscountValue && (
                  hasReachedMinPoints ? (
                    isPointsSelected ? (
                      <button
                        type="button"
                        onClick={handleRemoveReward}
                        className="w-full py-1.5 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 border border-amber-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                        Desconto de Pontos Aplicado: {formatBRL(pointsMoneyValue)} (Clique para remover)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectReward({
                            rewardType: "POINTS_DISCOUNT",
                            rewardTitle: `Desconto por Pontos: ${formatBRL(pointsMoneyValue)} (${pointsBalance} pts)`,
                            discountValue: pointsMoneyValue,
                          });
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Aplicar Desconto de {formatBRL(pointsMoneyValue)} no Pedido
                      </button>
                    )
                  ) : (
                    <div className="w-full py-1.5 px-3 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-800 text-xs font-semibold text-center">
                      Faltam {minPoints - pointsBalance} pontos para liberar o resgate
                    </div>
                  )
                )}
              </div>
            );
          })()}

          {/* Requisito de Pedido Mínimo */}
          {Number(program.minOrderValue) > 0 && (
            <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${
              orderAmount !== undefined && orderAmount < Number(program.minOrderValue)
                ? "text-amber-800 bg-amber-50/80 border-amber-200"
                : "text-slate-600 bg-slate-100/80 border-slate-200"
            }`}>
              <Info className={`w-3.5 h-3.5 shrink-0 ${
                orderAmount !== undefined && orderAmount < Number(program.minOrderValue) ? "text-amber-600" : "text-slate-500"
              }`} />
              <span>
                {orderAmount !== undefined && orderAmount < Number(program.minOrderValue) ? (
                  <>
                    Este pedido de <strong>{formatBRL(orderAmount)}</strong> não pontuará. Adicione mais <strong>{formatBRL(Number(program.minOrderValue) - orderAmount)}</strong> para pontuar.
                  </>
                ) : (
                  <>
                    Valor mínimo para pontuar neste programa: <strong>{formatBRL(Number(program.minOrderValue))}</strong>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Validade do Ciclo (Timezone Seguro) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1.5">
            {card?.expiresAt && card.status === "ACTIVE" ? (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Válido até {validityDateStr} às 23:59
              </span>
            ) : isCardExpired ? (
              <span className={`flex items-center gap-1 font-medium ${orderQualifies ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {orderQualifies
                  ? "Ciclo anterior expirou. Esta compra inicia uma nova pontuação!"
                  : `Ciclo anterior expirou. Atinja o mínimo de ${formatBRL(minOrderVal)} para iniciar nova pontuação.`}
              </span>
            ) : (
              <span>Ganhe benefícios a cada pedido concluído!</span>
            )}

            {card?.totalCompleted ? (
              <span className="text-right font-medium">Já resgatou {card.totalCompleted}x 🏆</span>
            ) : null}
          </div>

          {/* Ações de Resgate com Aviso ao Dono da Loja */}
          {isStampsCompleted && (
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center space-y-1.5">
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                🎉 Cartela completa! Resgate para enviar com sua entrega:
              </p>

              {selectedReward ? (
                <div className="space-y-1.5">
                  <div className="py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 truncate">
                      <Gift className="h-4 w-4 shrink-0" />
                      {selectedReward.rewardTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveReward}
                      className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[11px] font-semibold transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    ✓ Recompensa selecionada! Ela será vinculada automaticamente ao finalizar o pedido.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    handleSelectReward({
                      rewardType: "FREE_PRODUCT",
                      rewardTitle: program.rewardText,
                    })
                  }
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Resgatar: {program.rewardText}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
