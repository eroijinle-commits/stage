import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton QueryClient configured for a sports-betting app.
 *
 * Rate-limit aware defaults:
 * - staleTime: 60s — data stays fresh for 60s, reducing redundant refetches
 * - refetchOnWindowFocus: false — prevents multiplying Stake API calls on tab switch
 * - retry: 1 — single retry to avoid stacking during rate-limit windows
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
            refetchOnReconnect: true,
        },
    },
});
