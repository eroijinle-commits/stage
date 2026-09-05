/**
 * Test utilities — provides a QueryClientProvider wrapper for components
 * that use React Query hooks (useBalance, useStakeApi, etc.).
 *
 * Usage:
 *   import { renderWithQueryClient } from "@/tests/test-utils";
 *   renderWithQueryClient(<MyComponent />);
 */
import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
}

interface QueryWrapperProps {
    children: ReactNode;
    client?: QueryClient;
}

export function QueryWrapper({ children, client }: QueryWrapperProps) {
    const queryClient = client ?? createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

/**
 * Render a component wrapped with QueryClientProvider.
 * Passes through all standard @testing-library/react render options.
 */
export function renderWithQueryClient(
    ui: ReactNode,
    options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
) {
    const { queryClient, ...renderOptions } = options ?? {};
    return render(ui, {
        wrapper: ({ children }) => (
            <QueryWrapper client={queryClient}>{children}</QueryWrapper>
        ),
        ...renderOptions,
    });
}
