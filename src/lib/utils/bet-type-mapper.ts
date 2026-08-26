import { BetTypeConfig } from "@/lib/contracts/ui.contract";

export const BET_TYPES: BetTypeConfig[] = [
  {
    id: "match-winner",
    name: "Match Winner",
    description: "Home win, Draw, or Away win",
    icon: "Trophy",
    category: "match",
    templates: ["1x2", "winner", "match_winner", "moneyline", "3way"],
    hasLines: false,
    popular: true,
  },
  {
    id: "over-under-goals",
    name: "Over/Under Goals",
    description: "Total goals over or under a line",
    icon: "Goal",
    category: "goals",
    templates: ["Asian Total", "total_goals", "over_under", "totals"],
    lines: ["0.5", "1.5", "2.5", "3.5", "4.5", "5.5"],
    hasLines: true,
    popular: true,
  },
  {
    id: "asian-handicap",
    name: "Asian Handicap",
    description: "Team starts with virtual advantage/disadvantage",
    icon: "Scale",
    category: "match",
    templates: ["Asian Handicap", "handicap", "spread", "ah"],
    lines: ["0.0", "0.25", "0.5", "0.75", "1.0", "1.25", "1.5", "1.75", "2.0"],
    hasLines: true,
    popular: true,
  },
  {
    id: "btts",
    name: "Both Teams to Score",
    description: "Will both teams score?",
    icon: "CheckCircle2",
    category: "goals",
    templates: ["Both Teams to Score", "btts", "both_teams_score"],
    hasLines: false,
    popular: true,
  },
  {
    id: "correct-score",
    name: "Correct Score",
    description: "Exact final score",
    icon: "Target",
    category: "match",
    templates: ["Correct Score", "correct_score", "cs"],
    hasLines: false,
    popular: false,
  },
  {
    id: "ht-ft",
    name: "Half-Time/Full-Time",
    description: "Result at half-time and full-time",
    icon: "Clock",
    category: "match",
    templates: ["Halftime/Fulltime", "ht_ft", "half_time_full_time"],
    hasLines: false,
    popular: false,
  },
  {
    id: "first-goalscorer",
    name: "First Goalscorer",
    description: "Player to score first goal",
    icon: "User",
    category: "players",
    templates: ["First Goalscorer", "first_scorer", "fg"],
    hasLines: false,
    popular: false,
  },
  {
    id: "anytime-goalscorer",
    name: "Anytime Goalscorer",
    description: "Player to score anytime",
    icon: "UserCheck",
    category: "players",
    templates: ["Anytime Goalscorer", "anytime_scorer", "ags"],
    hasLines: false,
    popular: false,
  },
  {
    id: "corners-over-under",
    name: "Corners Over/Under",
    description: "Total corners over or under a line",
    icon: "Flag",
    category: "corners",
    templates: ["Corner Total", "corners", "asian_corner", "corner_ou", "total_corners"],
    lines: ["8.5", "9.5", "10.5", "11.5", "12.5", "13.5"],
    hasLines: true,
    popular: true,
  },
  {
    id: "corner-handicap",
    name: "Corner Handicap",
    description: "Corner count with handicap",
    icon: "FlagTriangleRight",
    category: "corners",
    templates: ["Corner Handicap", "corner_handicap", "corner_spread"],
    lines: ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0"],
    hasLines: true,
    popular: false,
  },
  {
    id: "cards-over-under",
    name: "Cards Over/Under",
    description: "Total cards over or under a line",
    icon: "Square",
    category: "cards",
    templates: ["Card Total", "cards", "booking_points", "total_cards", "card_ou"],
    lines: ["3.5", "4.5", "5.5", "6.5", "7.5"],
    hasLines: true,
    popular: false,
  },
  {
    id: "clean-sheet",
    name: "Clean Sheet",
    description: "Team keeps clean sheet",
    icon: "Shield",
    category: "match",
    templates: ["Clean Sheet", "clean_sheet", "to_keep_clean_sheet"],
    hasLines: false,
    popular: false,
  },
  {
    id: "win-to-nil",
    name: "Win to Nil",
    description: "Win without conceding",
    icon: "ShieldCheck",
    category: "match",
    templates: ["Win to Nil", "win_to_nil", "win_without_conceding"],
    hasLines: false,
    popular: false,
  },
  {
    id: "double-chance",
    name: "Double Chance",
    description: "Two outcomes in one bet",
    icon: "GitFork",
    category: "match",
    templates: ["Double Chance", "double_chance", "dc"],
    hasLines: false,
    popular: false,
  },
  {
    id: "draw-no-bet",
    name: "Draw No Bet",
    description: "Stake returned if draw",
    icon: "Undo2",
    category: "match",
    templates: ["Draw No Bet", "draw_no_bet", "dnb"],
    hasLines: false,
    popular: false,
  },
];

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
