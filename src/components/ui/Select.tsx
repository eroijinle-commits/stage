import { useState, useRef, useEffect } from "react";
import { SelectProps, MultiSelectProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, X, Check } from "lucide-react";

export default function Select({ options, value, onChange, placeholder = "Select...", label, error, disabled, clearable, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={ref}>
      {label && <label className="text-xs font-mono text-muted-foreground">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-left",
            "hover:border-ring/50 focus:outline-none focus:border-ring",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-bet-lost",
          )}
        >
          <span className={cn(!selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
          <div className="flex items-center gap-1">
            {clearable && selected && (
              <span onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </span>
            )}
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </button>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 text-sm font-mono text-left",
                  "hover:bg-muted transition-colors disabled:opacity-40",
                  value === opt.value && "text-primary",
                )}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-bet-lost font-mono">{error}</p>}
    </div>
  );
}

export function MultiSelect({ options, value, onChange, placeholder = "Select...", label, maxSelected, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!maxSelected || value.length < maxSelected) onChange([...value, v]);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={ref}>
      {label && <label className="text-xs font-mono text-muted-foreground">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-left hover:border-ring/50 focus:outline-none"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((v) => (
                <span key={v} className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs">
                  {options.find((o) => o.value === v)?.label ?? v}
                  <X size={10} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(v); }} />
                </span>
              ))
            )}
          </div>
          <ChevronDown size={14} className={cn("text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm font-mono text-left hover:bg-muted transition-colors"
              >
                <span>{opt.label}</span>
                {value.includes(opt.value) && <Check size={12} className="text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
