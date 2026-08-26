import { useState, useEffect, useCallback } from "react";
import { StakingPreset } from "@/lib/contracts/db.contract";
import {
    getAllPresets,
    getDefaultPreset,
    createPreset as dbCreatePreset,
    updatePreset as dbUpdatePreset,
    deletePreset as dbDeletePreset,
    setDefaultPreset as dbSetDefaultPreset,
} from "@/lib/db/repositories/preset.repository";

export function useStakingPresets() {
    const [presets, setPresets] = useState<StakingPreset[]>([]);
    const [defaultPreset, setDefaultPresetState] = useState<StakingPreset | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPresets = useCallback(async () => {
        try {
            setIsLoading(true);
            const [all, def] = await Promise.all([getAllPresets(), getDefaultPreset()]);
            setPresets(all);
            setDefaultPresetState(def);
        } catch {
            setPresets([]);
            setDefaultPresetState(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPresets();
    }, [fetchPresets]);

    const createPreset = useCallback(
        async (p: Omit<StakingPreset, "id">): Promise<number> => {
            const id = await dbCreatePreset({
                name: p.name,
                mode: p.mode,
                amount: p.amount,
                percentage: p.percentage,
                unitSize: p.unitSize,
                bankroll: p.bankroll,
                isDefault: p.isDefault,
            });
            await fetchPresets();
            return id;
        },
        [fetchPresets]
    );

    const updatePreset = useCallback(
        async (id: number, p: Partial<StakingPreset>): Promise<void> => {
            await dbUpdatePreset(id, p);
            await fetchPresets();
        },
        [fetchPresets]
    );

    const deletePreset = useCallback(
        async (id: number): Promise<void> => {
            await dbDeletePreset(id);
            await fetchPresets();
        },
        [fetchPresets]
    );

    const setDefault = useCallback(
        async (id: number): Promise<void> => {
            await dbSetDefaultPreset(id);
            await fetchPresets();
        },
        [fetchPresets]
    );

    return {
        presets,
        defaultPreset,
        createPreset,
        updatePreset,
        deletePreset,
        setDefault,
        isLoading,
    };
}
