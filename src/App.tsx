import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import SideNav from "@/components/layout/SideNav";
import BetSlipDrawer from "@/components/layout/BetSlipDrawer";
import DiscoveryPage from "@/pages/DiscoveryPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import { useSlipStore } from "@/store/useSlipStore";

type Page = "discovery" | "history" | "analytics" | "settings";

const PAGES: Record<Page, React.ComponentType> = {
  discovery: DiscoveryPage,
  history: HistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>("discovery");
  const [activeSport, setActiveSport] = useState("soccer");
  const [selectedTournamentSlugs, setSelectedTournamentSlugs] = useState<string[]>([]);
  const restoreFromUrl = useSlipStore((s) => s.restoreFromUrl);
  const ActivePage = PAGES[activePage];

  // Restore bet slip from URL param (?slip=<base64>) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slipData = params.get("slip");
    if (slipData) {
      restoreFromUrl(slipData);
      // Clean the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [restoreFromUrl]);

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
        {activePage === "discovery" && (
          <SideNav
            activeSport={activeSport}
            onSportChange={handleSportChange}
            selectedTournamentSlugs={selectedTournamentSlugs}
            onTournamentToggle={handleTournamentToggle}
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
