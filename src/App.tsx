import { useState, useEffect } from "react";
import { useSlipStore } from "@/store/useSlipStore";
import TopBar from "@/components/layout/TopBar";
import SideNav from "@/components/layout/SideNav";
import BetSlipDrawer from "@/components/layout/BetSlipDrawer";
import DiscoveryPage from "@/pages/DiscoveryPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import BetArchitectPage from "@/pages/BetArchitectPage";
import SlipPage from "@/components/slip/SlipPage";

type Page = "discovery" | "history" | "analytics" | "settings" | "slip" | "betarchitect";

const PAGES: Record<Page, React.ComponentType> = {
  discovery: DiscoveryPage,
  history: HistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  slip: SlipPage,
  betarchitect: BetArchitectPage,
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>("discovery");
  const [activeSport, setActiveSport] = useState("soccer");
  const [selectedTournamentSlugs, setSelectedTournamentSlugs] = useState<string[]>([]);
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
        {(activePage === "discovery" || activePage === "betarchitect") && (
          <SideNav
            activeSport={activeSport}
            onSportChange={handleSportChange}
            selectedTournamentSlugs={selectedTournamentSlugs}
            onTournamentToggle={handleTournamentToggle}
            onNavigate={(p) => setActivePage(p as Page)}
          />
        )}
        <main className="flex-1 overflow-hidden">
          {activePage === "discovery" ? (
            <DiscoveryPage
              activeSport={activeSport}
              selectedTournamentSlugs={selectedTournamentSlugs}
            />
          ) : (
            <ActivePage />
          )}
        </main>
      </div>
      <BetSlipDrawer />
    </div>
  );
}
