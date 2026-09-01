import { cn } from "@/lib/utils/cn";
import { FolderOpen, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import type { SavedSlip } from "@/store/useSlipStore";

interface SavedSlipListProps {
    slips: SavedSlip[];
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function SavedSlipList({ slips, onLoad, onDelete }: SavedSlipListProps) {
    if (slips.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-muted-foreground gap-2">
                <AlertCircle size={18} className="text-muted-foreground/50" />
                <span>No saved slips. Save your current slip from the Manual tab.</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-2">
            <table className="w-full text-[11px] font-mono">
                <thead className="sticky top-0 bg-card z-10 border-b border-border">
                    <tr className="text-muted-foreground">
                        <th className="text-left px-3 py-1.5 font-medium">Name</th>
                        <th className="text-left px-2 py-1.5 font-medium">Mode</th>
                        <th className="text-right px-2 py-1.5 font-medium">Legs</th>
                        <th className="text-left px-2 py-1.5 font-medium">Saved</th>
                        <th className="text-right px-3 py-1.5 font-medium w-28">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {slips.map((slip) => (
                        <tr
                            key={slip.id}
                            className="hover:bg-muted/20 transition-colors"
                        >
                            <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                    <FolderOpen size={11} className="text-muted-foreground shrink-0" />
                                    <span className="text-foreground truncate max-w-[200px]">{slip.name}</span>
                                </div>
                            </td>
                            <td className="px-2 py-1.5 capitalize text-foreground">{slip.mode}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-foreground">{slip.selections.length}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                                {new Date(slip.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="px-2 py-0.5 text-[10px]"
                                        onClick={() => onLoad(slip.id)}
                                    >
                                        Load
                                    </Button>
                                    <button
                                        onClick={() => onDelete(slip.id)}
                                        className="text-muted-foreground hover:text-bet-lost transition-colors p-1"
                                        title="Delete saved slip"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
