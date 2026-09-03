import { BadgeProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-muted text-foreground",
  success: "bg-bet-won/15 text-bet-won",
  warning: "bg-bet-pending/15 text-bet-pending",
  error: "bg-bet-lost/15 text-bet-lost",
  info: "bg-status-active/15 text-status-active",
  neutral: "bg-muted text-muted-foreground",
};

const sizes = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
};

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-medium rounded-sm tracking-wide uppercase",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
