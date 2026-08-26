import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import type { StakingPreset } from "../../contracts/db.contract";

export interface InsertStakingPreset {
    name: string;
    mode: string;
    amount: number | null;
    percentage: number | null;
    unitSize: number | null;
    bankroll: number | null;
    isDefault: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): StakingPreset {
    return {
        id: row.id,
        name: row.name,
        mode: row.mode as StakingPreset["mode"],
        amount: row.amount != null ? Number(row.amount) : null,
        percentage: row.percentage != null ? Number(row.percentage) : null,
        unitSize: row.unitSize != null ? Number(row.unitSize) : null,
        bankroll: row.bankroll != null ? Number(row.bankroll) : null,
        isDefault: row.isDefault,
    };
}

export async function createPreset(preset: InsertStakingPreset): Promise<number> {
    const data = await apiPost<{ id: number }>("/api/presets", preset);
    return data.id;
}

export async function getPreset(id: number): Promise<StakingPreset | null> {
    const all = await getAllPresets();
    return all.find((p) => p.id === id) ?? null;
}

export async function getAllPresets(): Promise<StakingPreset[]> {
    const rows = await apiGet<Array<Record<string, unknown>>>("/api/presets");
    return rows.map(rowToRecord);
}

export async function getDefaultPreset(): Promise<StakingPreset | null> {
    const all = await getAllPresets();
    return all.find((p) => p.isDefault) ?? null;
}

export async function setDefaultPreset(id: number): Promise<void> {
    // Clear all defaults, then set new default
    const all = await getAllPresets();
    for (const p of all) {
        if (p.isDefault) {
            await apiPut(`/api/presets/${p.id}`, { isDefault: false });
        }
    }
    await apiPut(`/api/presets/${id}`, { isDefault: true });
}

export async function updatePreset(
    id: number,
    preset: Partial<InsertStakingPreset>
): Promise<void> {
    await apiPut(`/api/presets/${id}`, preset);
}

export async function deletePreset(id: number): Promise<void> {
    await apiDelete(`/api/presets/${id}`);
}
