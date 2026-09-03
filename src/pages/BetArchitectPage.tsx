/**
 * BetArchitectPage — main BetArchitect view.
 * Renders BetArchitectPanel; accepts activeSport / selectedTournamentSlugs
 * for SideNav compatibility (SideNav is rendered by App.tsx).
 * @module pages/BetArchitectPage
 */

import BetArchitectPanel from "@/components/betarchitect/BetArchitectPanel";

export default function BetArchitectPage({
  activeSport,
  selectedTournamentSlugs = [],
}: {
  activeSport?: string;
  selectedTournamentSlugs?: string[];
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <BetArchitectPanel />
    </div>
  );
}
