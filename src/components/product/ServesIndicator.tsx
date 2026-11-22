import { User, Users } from "lucide-react";
import { formatServesLabel } from "@/utils/business-type";
import { cn } from "@/lib/utils";

interface ServesIndicatorProps {
  servesCount?: number | null;
  show?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function ServesIndicator({
  servesCount,
  show = true,
  size = "sm",
  className,
}: ServesIndicatorProps) {
  if (!show) return null;
  const label = formatServesLabel(servesCount);
  if (!label) return null;

  const isSingle = Math.floor(servesCount as number) === 1;
  const Icon = isSingle ? User : Users;
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-foreground/85",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Icon
        className={cn(iconClass, "shrink-0 fill-current text-foreground/85")}
        aria-hidden="true"
        data-testid={isSingle ? "serves-icon-single" : "serves-icon-multiple"}
      />
      <span>{label}</span>
    </p>
  );
}
