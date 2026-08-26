import { apiGet, apiPost, apiDelete } from "../../api";
import type { SavedFilter } from "../../contracts/db.contract";

export interface InsertSavedFilter {
    name: string;
    sport: string | null;
    group: string | null;
    tournamentSlugs: string[];
    dateFrom: number | null;
    dateTo: number | null;
    marketTemplate: string | null;
    createdAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): SavedFilter {
    return {
        id: row.id,
        name: row.name,
        sport: row.sport,
        group: row.group,
        tournamentSlugs: row.tournamentSlugs,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        marketTemplate: row.marketTemplate,
        createdAt: row.createdAt,
    };
}

export async function createFilter(filter: InsertSavedFilter): Promise<number> {
    const data = await apiPost<{ id: number }>("/api/filters", filter);
    return data.id;
}

export async function getFilter(id: number): Promise<SavedFilter | null> {
    const all = await getAllFilters();
    return all.find((f) => f.id === id) ?? null;
}

export async function getAllFilters(): Promise<SavedFilter[]> {
    const rows = await apiGet<Array<Record<string, unknown>>>("/api/filters");
    return rows.map(rowToRecord);
}

export async function updateFilter(
    id: number,
    filter: Partial<InsertSavedFilter>
): Promise<void> {
    // Fetch existing, merge, and re-create (server doesn't have PATCH endpoint)
    const all = await getAllFilters();
    const existing = all.find((f) => f.id === id);
    if (!existing) return;
    await apiDelete(`/api/filters/${id}`);
    await apiPost("/api/filters", { ...existing, ...filter, id });
}

export async function deleteFilter(id: number): Promise<void> {
    await apiDelete(`/api/filters/${id}`);
}
