import { cn } from "@/lib/utils/cn";

interface PlaceBetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function PlaceBetButton({ onClick, disabled = false }: PlaceBetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded text-xs font-mono font-medium bg-primary text-primary-foreground",
        "hover:bg-primary/90 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      Place Bet
    </button>
  );
}
