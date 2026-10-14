import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Gift, Sparkles, Clock, CheckCircle2, AlertCircle, ChevronRight, Percent, DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { storeLoyaltyService } from "@/services/loyalty";

interface LoyaltyCardWidgetProps {
  customerPhone?: string;
  onApplyRewardCoupon?: (couponCode: string) => void;
  onApplyDiscountValue?: (discount: number) => void;
  onRewardRedeemed?: (reward: { rewardType: string; rewardTitle: string }) => void;
}

export default function LoyaltyCardWidget({
  customerPhone,
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

  const redeemMutation = useMutation({
    mutationFn: (overrideReward?: { rewardType?: string; rewardTitle?: string }) =>
      storeLoyaltyService.redeemReward({
        phone: cleanPhone,
        rewardType: overrideReward?.rewardType,
        rewardTitle: overrideReward?.rewardTitle,
      }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["store-loyalty-card", cleanPhone] });
      toast.success("Parabéns! Recompensa resgatada e adicionada ao seu pedido! 🎉");
      if (res.rewardCouponCode && onApplyRewardCoupon) {
        onApplyRewardCoupon(res.rewardCouponCode);
      }
      if (res.rewardDiscount && onApplyDiscountValue) {
        onApplyDiscountValue(Number(res.rewardDiscount));
      }
      if (onRewardRedeemed) {
        onRewardRedeemed({
          rewardType: variables?.rewardType || "FREE_PRODUCT",
          rewardTitle: variables?.rewardTitle || data?.program?.rewardText || "Brinde Fidelidade",
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao resgatar recompensa");
    },
  });

  const program = data?.program;
  const card = data?.card;

  const progType = program?.type || "FREE_PRODUCT";
  const maxStamps = program?.stampsRequired || 10;
  const currentStamps = card?.currentStamps || 0;
  const isStampsCompleted =
    (progType === "FREE_PRODUCT" || progType === "HYBRID") &&
    (currentStamps >= maxStamps || card?.status === "COMPLETED");

  const cashbackBalance = Number(card?.cashbackBalance) || 0;
  const pointsBalance = Number(card?.pointsBalance) || 0;
  const pointsMoneyValue = pointsBalance * (Number(program?.pointsRedemptionValue) || 0.05);

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-xs shrink-0 ${
              isStampsCompleted || cashbackBalance > 0 || pointsBalance > 0 || (currentTier && currentTier.discountPercent > 0)
                ? "bg-emerald-500 text-white animate-pulse"
                : "bg-primary text-primary-foreground"
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
            ) : (
              <Award className="h-5 w-5" />
            )}
          </div>
          <div>
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
              ) : isStampsCompleted ? (
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  Prêmio Disponível!
                </span>
              ) : (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {currentStamps} de {maxStamps} selos
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {progType === "CASHBACK"
                ? `Ganhe ${program.cashbackPercent || 5}% de volta em cada compra!`
                : progType === "POINTS_DISCOUNT"
                ? `Acumule pontos em dinheiro (${Number(program.pointsPerReal || 1)} pt por R$ 1).`
                : progType === "PROGRESSIVE_DISCOUNT"
                ? nextTier
                  ? `Faça mais ${nextTier.minOrders - currentStamps} pedidos para subir para ${nextTier.discountPercent}% OFF!`
                  : `Você atingiu o nível máximo de desconto exclusivo!`
                : `Prêmio: ${program.rewardText}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
        >
          {isExpanded ? "Ocultar" : "Detalhes"}
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {/* Conteúdo Expandido de Acordo com o Tipo */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
          {/* MODO 1 ou 5: Cartela de Selos */}
          {(progType === "FREE_PRODUCT" || progType === "HYBRID") && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: maxStamps }).map((_, idx) => {
                const hasStamp = idx < currentStamps;
                const isLast = idx === maxStamps - 1;

                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                      hasStamp
                        ? "bg-primary text-primary-foreground border-primary shadow-xs scale-95"
                        : isLast
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                        : "bg-muted/30 border-dashed border-border text-muted-foreground/50"
                    }`}
                  >
                    {hasStamp ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isLast ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <span className="text-[11px] font-semibold">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
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
                <button
                  type="button"
                  onClick={() => {
                    onApplyDiscountValue(cashbackBalance);
                    redeemMutation.mutate({
                      rewardType: "CASHBACK",
                      rewardTitle: `Cashback Utilizado: ${formatBRL(cashbackBalance)}`,
                    });
                  }}
                  disabled={redeemMutation.isPending}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Percent className="h-3.5 w-3.5" />
                  {redeemMutation.isPending ? "Aplicando..." : `Aplicar Cashback de ${formatBRL(cashbackBalance)} no Pedido`}
                </button>
              )}
            </div>
          )}

          {/* MODO 2: Pontos */}
          {progType === "POINTS_DISCOUNT" && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-900">Total de pontos:</span>
                <span className="font-extrabold text-amber-700 text-sm">{pointsBalance} pts</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Seus pontos valem <strong>{formatBRL(pointsMoneyValue)}</strong> de desconto imediato!
              </p>
              {pointsMoneyValue > 0 && onApplyDiscountValue && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyDiscountValue(pointsMoneyValue);
                    redeemMutation.mutate({
                      rewardType: "POINTS_DISCOUNT",
                      rewardTitle: `Desconto por Pontos: ${formatBRL(pointsMoneyValue)} (${pointsBalance} pts)`,
                    });
                  }}
                  disabled={redeemMutation.isPending}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  {redeemMutation.isPending ? "Aplicando..." : `Aplicar Desconto de ${formatBRL(pointsMoneyValue)} no Pedido`}
                </button>
              )}
            </div>
          )}

          {/* Requisito de Pedido Mínimo */}
          {Number(program.minOrderValue) > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                Valor mínimo para pontuar neste programa: <strong>{formatBRL(Number(program.minOrderValue))}</strong>
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
            ) : card?.status === "EXPIRED" ? (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Ciclo anterior expirou. Próxima compra inicia uma nova pontuação!
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
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center space-y-2">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                🎉 Cartela completa! Resgate o brinde para o lojista enviar junto com sua entrega:
              </p>

              {progType === "HYBRID" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      redeemMutation.mutate({
                        rewardType: "FREE_PRODUCT",
                        rewardTitle: program.rewardText,
                      })
                    }
                    disabled={redeemMutation.isPending}
                    className="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Gift className="h-3.5 w-3.5" /> Ganhar Brinde
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      redeemMutation.mutate({
                        rewardType: "DISCOUNT_COUPON",
                        rewardTitle: "Desconto Fidelidade",
                      })
                    }
                    disabled={redeemMutation.isPending}
                    className="py-2 px-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Pegar Desconto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    redeemMutation.mutate({
                      rewardType: "FREE_PRODUCT",
                      rewardTitle: program.rewardText,
                    })
                  }
                  disabled={redeemMutation.isPending}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Gift className="h-4 w-4" />
                  {redeemMutation.isPending ? "Resgatando..." : `Resgatar Brinde: ${program.rewardText}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
