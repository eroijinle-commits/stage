import { useState, useEffect, useCallback } from "react";
import { SavedFilter } from "@/lib/contracts/db.contract";
import {
    getAllFilters,
    createFilter as dbCreateFilter,
    updateFilter as dbUpdateFilter,
    deleteFilter as dbDeleteFilter,
} from "@/lib/db/repositories/filter.repository";

export function useSavedFilters() {
    const [filters, setFilters] = useState<SavedFilter[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFilters = useCallback(async () => {
        try {
            setIsLoading(true);
            const all = await getAllFilters();
            setFilters(all);
        } catch {
            setFilters([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    const createFilter = useCallback(
        async (f: Omit<SavedFilter, "id" | "createdAt">): Promise<number> => {
            const id = await dbCreateFilter({
                ...f,
                createdAt: Math.floor(Date.now() / 1000),
            });
            await fetchFilters();
            return id;
        },
        [fetchFilters]
    );

    const updateFilter = useCallback(
        async (id: number, f: Partial<SavedFilter>): Promise<void> => {
            await dbUpdateFilter(id, f);
            await fetchFilters();
        },
        [fetchFilters]
    );

    const deleteFilter = useCallback(
        async (id: number): Promise<void> => {
            await dbDeleteFilter(id);
            await fetchFilters();
        },
        [fetchFilters]
    );

    return {
        filters,
        createFilter,
        updateFilter,
        deleteFilter,
        isLoading,
    };
}
