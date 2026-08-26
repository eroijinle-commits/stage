import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import SideNav from "@/components/layout/SideNav";
import BetSlipDrawer from "@/components/layout/BetSlipDrawer";
import DiscoveryPage from "@/pages/DiscoveryPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";

type Page = "discovery" | "history" | "analytics" | "settings";

const PAGES: Record<Page, React.ComponentType> = {
  discovery: DiscoveryPage,
  history: HistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>("discovery");
  const [activeSport, setActiveSport] = useState("football");
  const ActivePage = PAGES[activePage];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopBar activePage={activePage} onNavigate={(p) => setActivePage(p as Page)} />
      <div className="flex flex-1 overflow-hidden">
        {activePage === "discovery" && (
          <SideNav activeSport={activeSport} onSportChange={setActiveSport} />
        )}
        <main className="flex-1 overflow-hidden">
          <ActivePage />
        </main>
      </div>
      <BetSlipDrawer />
    </div>
  );
}
