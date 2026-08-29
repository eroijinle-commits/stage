import { BetTypeConfig } from "@/lib/contracts/ui.contract";

export const BET_TYPES: BetTypeConfig[] = [
  {
    id: "match-winner",
    name: "Match Winner",
    description: "Home win, Draw, or Away win",
    icon: "Trophy",
    category: "match",
    // Templates match API group names (group.name / group.translation)
    // API group: "main" or "result" with translation like "Match Winner"
    templates: ["main", "result", "1x2", "winner", "moneyline"],
    hasLines: false,
    popular: true,
    sports: ["soccer", "tennis", "cricket", "american-football", "baseball"],
  },
  {
    id: "over-under-goals",
    name: "Over/Under Goals",
    description: "Total goals over or under a line",
    icon: "Goal",
    category: "goals",
    // API groups: "goals", "totalGoals", "totalGoalsOddEven"
    templates: ["goals", "totalGoals", "Asian Total", "totals"],
    lines: ["0.5", "1.5", "2.5", "3.5", "4.5", "5.5"],
    hasLines: true,
    popular: true,
    sports: ["soccer"],
  },
  {
    id: "asian-handicap",
    name: "Asian Handicap",
    description: "Team starts with virtual advantage/disadvantage",
    icon: "Scale",
    category: "match",
    // API groups: "asianHandicap", "handicap", "europeanHandicap"
    templates: ["asianHandicap", "handicap", "spread"],
    lines: ["0.0", "0.25", "0.5", "0.75", "1.0", "1.25", "1.5", "1.75", "2.0"],
    hasLines: true,
    popular: true,
    sports: ["soccer", "tennis", "cricket"],
  },
  {
    id: "btts",
    name: "Both Teams to Score",
    description: "Will both teams score?",
    icon: "CheckCircle2",
    category: "goals",
    // API group: "bothTeamsToScore"
    templates: ["bothTeamsToScore", "btts"],
    hasLines: false,
    popular: true,
    sports: ["soccer"],
  },
  {
    id: "correct-score",
    name: "Correct Score",
    description: "Exact final score",
    icon: "Target",
    category: "match",
    // API group: "correctScore"
    templates: ["correctScore", "correct_score"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "ht-ft",
    name: "Half-Time/Full-Time",
    description: "Result at half-time and full-time",
    icon: "Clock",
    category: "match",
    // API group: "ht_ft"
    templates: ["ht_ft", "Halftime/Fulltime"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "first-goalscorer",
    name: "First Goalscorer",
    description: "Player to score first goal",
    icon: "User",
    category: "players",
    // API groups: "playerGoals", "firstScorer", "firstGoal"
    templates: ["playerGoals", "firstScorer", "firstGoal"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "anytime-goalscorer",
    name: "Anytime Goalscorer",
    description: "Player to score anytime",
    icon: "UserCheck",
    category: "players",
    // API groups: "playerProps", "anytimeScorer", "playerToScore"
    templates: ["playerProps", "anytimeScorer", "playerToScore"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "corners-over-under",
    name: "Corners Over/Under",
    description: "Total corners over or under a line",
    icon: "Flag",
    category: "corners",
    // API groups: "corners", "totalCorners", "cornerRace"
    templates: ["corners", "totalCorners", "cornerRace"],
    lines: ["8.5", "9.5", "10.5", "11.5", "12.5", "13.5"],
    hasLines: true,
    popular: true,
    sports: ["soccer"],
  },
  {
    id: "corner-handicap",
    name: "Corner Handicap",
    description: "Corner count with handicap",
    icon: "FlagTriangleRight",
    category: "corners",
    // API group: "cornerHandicap"
    templates: ["cornerHandicap"],
    lines: ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0"],
    hasLines: true,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "cards-over-under",
    name: "Cards Over/Under",
    description: "Total cards over or under a line",
    icon: "Square",
    category: "cards",
    // API groups: "cards", "totalCards", "yellowCard", "redCard"
    templates: ["cards", "totalCards", "yellowCard", "redCard"],
    lines: ["3.5", "4.5", "5.5", "6.5", "7.5"],
    hasLines: true,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "clean-sheet",
    name: "Clean Sheet",
    description: "Team keeps clean sheet",
    icon: "Shield",
    category: "match",
    // API group: "cleanSheet"
    templates: ["cleanSheet"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "win-to-nil",
    name: "Win to Nil",
    description: "Win without conceding",
    icon: "ShieldCheck",
    category: "match",
    // API group: "result" (subset of match result)
    templates: ["win_to_nil"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "double-chance",
    name: "Double Chance",
    description: "Two outcomes in one bet",
    icon: "GitFork",
    category: "match",
    // API group: "doubleChance"
    templates: ["doubleChance"],
    hasLines: false,
    popular: false,
    sports: ["soccer"],
  },
  {
    id: "draw-no-bet",
    name: "Draw No Bet",
    description: "Stake returned if draw",
    icon: "Undo2",
    category: "match",
    // API group: "drawNoBet"
    templates: ["drawNoBet"],
    hasLines: false,
    popular: false,
    sports: ["soccer", "tennis", "cricket"],
  },
];

export function getBetTypesForSport(sport: string): BetTypeConfig[] {
  return BET_TYPES.filter((bt) => !bt.sports || bt.sports.includes(sport));
}

export function getBetTypeById(id: string): BetTypeConfig | undefined {
  return BET_TYPES.find((bt) => bt.id === id);
}

export function getBetTypeByTemplate(templateName: string): BetTypeConfig | undefined {
  const lower = templateName.toLowerCase();
  return BET_TYPES.find((bt) => bt.templates.some((t) => lower.includes(t.toLowerCase())));
}

export function getPopularBetTypes(): BetTypeConfig[] {
  return BET_TYPES.filter((bt) => bt.popular);
}

export function getBetTypesByCategory(category: string): BetTypeConfig[] {
  return BET_TYPES.filter((bt) => bt.category === category);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(BET_TYPES.map((bt) => bt.category)));
}

export function getLinesForBetType(betTypeId: string): string[] {
  const bt = getBetTypeById(betTypeId);
  return bt?.lines ?? [];
}

export function hasLines(betTypeId: string): boolean {
  const bt = getBetTypeById(betTypeId);
  return bt?.hasLines ?? false;
}

export function getGroupForBetType(betTypeId: string): string {
  const bt = getBetTypeById(betTypeId);
  if (!bt) return "main";
  const map: Record<string, string> = { match: "main", goals: "main", corners: "corners", cards: "cards", players: "main", specials: "specials" };
  return map[bt.category] ?? "main";
}

export function extractLine(marketName: string): string | null {
  const match = marketName.match(/(\d+\.\d+)/);
  return match ? match[1] : null;
}

// CATEGORY_ORDER controls display order in BetTypeSelector
export const CATEGORY_ORDER = ["match", "goals", "corners", "cards", "players", "specials"];

export const CATEGORY_LABELS: Record<string, string> = {
  match: "Match",
  goals: "Goals",
  corners: "Corners",
  cards: "Cards",
  players: "Players",
  specials: "Specials",
};
