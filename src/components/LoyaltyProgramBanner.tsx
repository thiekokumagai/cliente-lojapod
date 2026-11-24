import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, DollarSign, Gift, Percent } from "lucide-react";
import { storeLoyaltyService } from "@/services/loyalty";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { prefersDarkText } from "@/utils/color";
import { getLoyaltyHeadline, getLoyaltyProgramRules, getLoyaltySummary } from "@/utils/loyalty";

interface LoyaltyProgramBannerProps {
  className?: string;
}

/**
 * Informativo do programa de fidelidade ATIVO DA LOJA, acima da listagem de produtos.
 * Não consulta nem mostra dados do cliente (a consulta vai sem telefone e a API devolve
 * só o programa). Selos, pontos e saldo do cliente ficam no LoyaltyCardWidget do carrinho.
 *
 * Faixa compacta na cor da loja (--primary): título e resumo de uma linha cada;
 * as regras completas abrem em "Ver regras". Como --primary-foreground é sempre branco,
 * o texto troca para escuro quando a cor da loja é clara.
 */
export default function LoyaltyProgramBanner({ className = "" }: LoyaltyProgramBannerProps) {
  const [open, setOpen] = useState(false);
  const rulesId = useId();
  const { data } = useQuery({
    queryKey: ["store-loyalty-card", ""],
    queryFn: () => storeLoyaltyService.getCard(),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
  const { data: settings } = useStoreSettings();

  const program = data?.program;
  if (!program || !program.isActive) return null;

  const Icon =
    program.type === "CASHBACK" || program.type === "PROGRESSIVE_DISCOUNT"
      ? Percent
      : program.type === "POINTS_DISCOUNT"
      ? DollarSign
      : Gift;
  const rules = getLoyaltyProgramRules(program);
  const dark = prefersDarkText(settings?.primaryColor);
  const tone = dark
    ? { text: "text-slate-900", muted: "text-slate-900/70", soft: "bg-black/10", divider: "border-black/10" }
    : { text: "text-primary-foreground", muted: "text-primary-foreground/80", soft: "bg-white/20", divider: "border-white/20" };

  return (
    <div className={className}>
      <section
        aria-label="Programa de fidelidade da loja"
        className={`rounded-2xl bg-primary px-3 py-2.5 shadow-sm sm:px-4 ${tone.text}`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.soft}`}>
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-bold leading-tight sm:text-base">{getLoyaltyHeadline(program)}</h2>
            <p className={`truncate text-xs leading-tight ${tone.muted}`}>{getLoyaltySummary(program)}</p>
          </div>
          {rules.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={rulesId}
              className={`flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold ${tone.soft}`}
            >
              {open ? "Fechar" : "Regras"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {open && rules.length > 0 && (
          <ul id={rulesId} className={`mt-2.5 space-y-1 border-t pt-2 text-xs ${tone.divider} ${tone.muted}`}>
            {rules.map((rule) => (
              <li key={rule} className="first-letter:uppercase">
                {rule}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
