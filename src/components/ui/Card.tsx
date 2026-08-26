import { CardProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";

const paddings = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

export default function Card({ children, onClick, selected, disabled, className, header, footer, padding = "md" }: CardProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "bg-card border border-border rounded",
        onClick && !disabled && "cursor-pointer hover:border-border/80 hover:bg-card-hover transition-colors",
        selected && "border-primary bg-primary/5",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {header && <div className="px-4 py-3 border-b border-border">{header}</div>}
      <div className={paddings[padding]}>{children}</div>
      {footer && <div className="px-4 py-3 border-t border-border">{footer}</div>}
    </div>
  );
}
