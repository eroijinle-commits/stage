import { ButtonProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-brand-400 active:bg-brand-600",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
  danger: "bg-bet-lost text-white hover:bg-red-600 active:bg-red-700",
  ghost: "text-foreground hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted",
};

const sizes = {
  sm: "px-2.5 py-1 text-xs gap-1.5",
  md: "px-3.5 py-1.5 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2.5",
};

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  type = "button",
  className,
  icon,
  fullWidth,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-mono font-medium rounded transition-colors duration-150 select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
}
