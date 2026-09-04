import { useState, useEffect, Suspense, lazy } from "react";
import { useSlipStore } from "@/store/useSlipStore";
import TopBar from "@/components/layout/TopBar";
import SideNav from "@/components/layout/SideNav";
import BetSlipDrawer from "@/components/layout/BetSlipDrawer";

// ─── Lazy-loaded page chunks ───
const DiscoveryPage = lazy(() => import("@/pages/DiscoveryPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const BetArchitectPage = lazy(() => import("@/pages/BetArchitectPage"));
const ValueScannerPage = lazy(() =>
  import("@/pages/ValueScannerPage").then((m) => ({
    default: m.ValueScannerPageWithErrorBoundary,
  })),
);
const SlipPage = lazy(() => import("@/components/slip/SlipPage"));

type Page =
  | "discovery"
  | "history"
  | "analytics"
  | "settings"
  | "slip"
  | "betarchitect"
  | "valuescanner";

const PAGES: Record<Page, React.ComponentType> = {
  discovery: DiscoveryPage,
  history: HistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  slip: SlipPage,
  betarchitect: BetArchitectPage,
  valuescanner: ValueScannerPage,
};

/** Lightweight loading fallback while chunks download */
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-muted-foreground text-sm font-mono">
        Loading...
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("discovery");
  const [activeSport, setActiveSport] = useState("soccer");
  const [selectedTournamentSlugs, setSelectedTournamentSlugs] = useState<
    string[]
  >([]);
  const restoreSlip = useSlipStore((s) => s.restoreSlip);
  const ActivePage = PAGES[activePage];

  // Restore bet slip from ?slip= URL parameter on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("slip");
    if (encoded) {
      restoreSlip(encoded);
      // Clean the URL so it doesn't reload again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("slip");
      window.history.replaceState({}, "", url.toString());
    }
  }, [restoreSlip]);

  const handleTournamentToggle = (slug: string) => {
    setSelectedTournamentSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleSportChange = (sport: string) => {
    setActiveSport(sport);
    setSelectedTournamentSlugs([]); // Clear tournament filter when sport changes
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopBar activePage={activePage} onNavigate={(p) => setActivePage(p as Page)} />
      <div className="flex flex-1 overflow-hidden">
        {(activePage === "discovery" || activePage === "betarchitect" || activePage === "valuescanner") && (
          <SideNav
            activeSport={activeSport}
            onSportChange={handleSportChange}
            selectedTournamentSlugs={selectedTournamentSlugs}
            onTournamentToggle={handleTournamentToggle}
            onNavigate={(p) => setActivePage(p as Page)}
          />
        )}
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<PageSkeleton />}>
            {activePage === "discovery" ? (
              <DiscoveryPage
                activeSport={activeSport}
                selectedTournamentSlugs={selectedTournamentSlugs}
              />
            ) : (
              <ActivePage />
            )}
          </Suspense>
        </main>
      </div>
      <BetSlipDrawer />
    </div>
  );
}
