import { ModalProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl", full: "max-w-full mx-4" };

export default function Modal({ open, onClose, title, description, children, actions, size = "md" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-card border border-border rounded-lg shadow-2xl", sizes[size])}>
        {(title || description) && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-border">
            <div>
              {title && <h2 className="text-sm font-mono font-semibold text-foreground">{title}</h2>}
              {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {actions && <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">{actions}</div>}
      </div>
    </div>
  );
}
