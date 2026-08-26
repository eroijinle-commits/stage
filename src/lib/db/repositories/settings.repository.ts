import { apiGet, apiPut } from "../../api";

export async function getSetting(key: string): Promise<string | null> {
    const data = await apiGet<{ value: string | null }>(`/api/settings/${key}`);
    return data.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
    await apiPut(`/api/settings/${key}`, { value });
}

export async function getAppState<T = unknown>(key: string): Promise<T | null> {
    const data = await apiGet<{ value: T | null }>(`/api/app-state/${key}`);
    return data.value;
}

export async function setAppState<T = unknown>(key: string, value: T): Promise<void> {
    await apiPut(`/api/app-state/${key}`, { value });
}
