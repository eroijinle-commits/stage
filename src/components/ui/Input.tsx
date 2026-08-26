import { ReactNode } from "react";
import { InputProps, NumberInputProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { Minus, Plus } from "lucide-react";

export default function Input({ value, onChange, placeholder, type = "text", label, error, disabled, min, max, step, prefix, suffix, className }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-mono text-muted-foreground">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-2.5 text-xs font-mono text-muted-foreground select-none">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={cn(
            "w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground",
            "placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            prefix && "pl-8",
            suffix && "pr-8",
            error && "border-bet-lost focus:border-bet-lost focus:ring-bet-lost",
            className,
          )}
        />
        {suffix && <span className="absolute right-2.5 text-xs font-mono text-muted-foreground select-none">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-bet-lost font-mono">{error}</p>}
    </div>
  );
}

export function NumberInput({ value, onChange, label, error, disabled, min = 0, max, step = 100, showControls = true, format = "currency", currency = "NGN", className, prefix, suffix, placeholder }: NumberInputProps) {
  const fmt = (v: number) => {
    if (format === "currency") return v.toLocaleString("en-NG");
    if (format === "percentage") return `${v}`;
    return `${v}`;
  };

  const dec = () => { const n = Math.max(min, (value as number) - step); onChange(n); };
  const inc = () => { const n = max !== undefined ? Math.min(max, (value as number) + step) : (value as number) + step; onChange(n); };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-mono text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-0">
        {showControls && (
          <button type="button" onClick={dec} disabled={disabled || (value as number) <= min}
            className="flex items-center justify-center w-7 h-8 bg-secondary border border-border rounded-l text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
            <Minus size={12} />
          </button>
        )}
        <div className="relative flex-1">
          {(prefix || (format === "currency" && currency)) && (
            <span className="absolute left-2 text-xs font-mono text-muted-foreground select-none top-1/2 -translate-y-1/2">
              {prefix || currency}
            </span>
          )}
          <input
            type="number"
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className={cn(
              "w-full bg-secondary border-y border-border py-1.5 text-sm font-mono text-foreground text-right pr-2.5",
              "focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              !showControls && "rounded border-x",
              format === "currency" && "pl-12",
              error && "border-bet-lost",
              className,
            )}
          />
          {suffix && <span className="absolute right-2 text-xs font-mono text-muted-foreground select-none top-1/2 -translate-y-1/2">{suffix}</span>}
        </div>
        {showControls && (
          <button type="button" onClick={inc} disabled={disabled || (max !== undefined && (value as number) >= max)}
            className="flex items-center justify-center w-7 h-8 bg-secondary border border-border rounded-r text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
            <Plus size={12} />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-bet-lost font-mono">{error}</p>}
    </div>
  );
}
