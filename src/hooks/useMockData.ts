import { useMemo } from "react";
import { BetHistoryRow } from "@/lib/contracts/ui.contract";
import { BetStatus } from "@/lib/contracts/db.contract";

const TEAMS = [
  ["Arsenal", "Chelsea"],
  ["Man City", "Liverpool"],
  ["Barcelona", "Real Madrid"],
  ["PSG", "Lyon"],
  ["Bayern Munich", "Borussia Dortmund"],
  ["Juventus", "AC Milan"],
  ["Ajax", "PSV"],
  ["Porto", "Benfica"],
  ["Napoli", "Inter Milan"],
  ["Atletico Madrid", "Sevilla"],
  ["Tottenham", "West Ham"],
  ["Rangers", "Celtic"],
  ["Fenerbahce", "Galatasaray"],
  ["Boca Juniors", "River Plate"],
  ["Flamengo", "Palmeiras"],
];

const TOURNAMENTS = [
  { name: "Premier League", category: { name: "England" } },
  { name: "La Liga", category: { name: "Spain" } },
  { name: "Bundesliga", category: { name: "Germany" } },
  { name: "Serie A", category: { name: "Italy" } },
  { name: "Ligue 1", category: { name: "France" } },
  { name: "Champions League", category: { name: "Europe" } },
];

const MARKETS = ["1X2", "Both Teams to Score", "Over/Under 2.5", "Asian Handicap", "Double Chance"];

function randomOdds(min = 1.3, max = 4.5) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 14) + 9, Math.floor(Math.random() * 4) * 15);
  return d.toISOString();
}

function buildRawFixtures() {
  return Array.from({ length: 40 }, (_, i) => {
    const [home, away] = TEAMS[i % TEAMS.length];
    const tournament = TOURNAMENTS[i % TOURNAMENTS.length];
    const isLive = i < 4;
    const slug = `${home.toLowerCase().replace(/\s/g, "-")}-vs-${away.toLowerCase().replace(/\s/g, "-")}-${i}`;
    return {
      id: `fixture-${i}`,
      name: `${home} vs ${away}`,
      slug,
      startTime: randomDate(isLive ? 0 : -3),
      status: isLive ? "live" : "upcoming",
      isLive,
      homeScore: isLive ? Math.floor(Math.random() * 3) : undefined,
      awayScore: isLive ? Math.floor(Math.random() * 3) : undefined,
      tournament,
      competitors: [{ name: home }, { name: away }],
      previewMarkets: [
        {
          name: "1X2",
          outcomes: [
            { name: "1", odds: randomOdds(1.4, 3.5), active: true },
            { name: "X", odds: randomOdds(2.8, 4.2), active: true },
            { name: "2", odds: randomOdds(1.4, 3.5), active: true },
          ],
        },
        {
          name: "BTTS",
          outcomes: [
            { name: "Yes", odds: randomOdds(1.6, 2.2), active: true },
            { name: "No", odds: randomOdds(1.6, 2.2), active: true },
          ],
        },
      ],
    };
  });
}

export function useMockFixturesRaw() {
  return useMemo(() => buildRawFixtures(), []);
}

export function useMockFixtures() {
  return useMockFixturesRaw();
}

const STATUSES: BetStatus[] = ["won", "lost", "pending", "cancelled", "won", "won", "lost"];

export function useMockBetHistory(): BetHistoryRow[] {
  return useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => {
      const [home, away] = TEAMS[i % TEAMS.length];
      const status = STATUSES[i % STATUSES.length];
      const odds = randomOdds(1.5, 5.5);
      const stake = [500, 1000, 2000, 5000, 10000][i % 5];
      const profit =
        status === "won" ? Math.round(stake * (odds - 1)) : status === "lost" ? -stake : null;
      return {
        id: `bet-${i}`,
        date: randomDate(60),
        matches: [`${home} vs ${away}`],
        market: MARKETS[i % MARKETS.length],
        stake,
        totalOdds: odds,
        status,
        return: status === "won" ? Math.round(stake * odds) : null,
        profit,
        currency: "NGN",
      };
    });
  }, []);
}

export function useMockChartData() {
  return useMemo(() => {
    let cumulative = 0;
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const daily = (Math.random() - 0.45) * 8000;
      cumulative += daily;
      return {
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        value: Math.round(cumulative),
        secondaryValue: Math.round(daily),
        date: d.toISOString(),
      };
    });
  }, []);
}
