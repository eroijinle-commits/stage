/**
 * Comprehensive list of Stake.com market group names.
 * Passed to the `groups` parameter of `slugFixture` to fetch all available markets.
 *
 * The Stake API filters results to only include groups whose `name` matches
 * one of the strings in this list. Groups that don't exist for a fixture are
 * simply omitted from the response — passing extra names is safe.
 *
 * @module lib/stake-api/stake-groups
 */

/** All known Stake market group identifiers, grouped by category. */
export const STAKE_MARKET_GROUPS: string[] = [
  // ── Match result / outcome ──
  "main",
  "result",
  "doubleChance",
  "drawNoBet",
  "threeWayHandicap",

  // ── Goals / scoring ──
  "goals",
  "totalGoals",
  "totalGoalsOddEven",
  "bothTeamsToScore",
  "cleanSheet",
  "teamTotalGoals",
  "firstGoal",
  "lastGoal",
  "goalScorer",
  "correctScore",
  "scorecast",
  "winningMargin",
  "highestScoringQuarter",
  "halfWithMostGoals",

  // ── Handicap / spread ──
  "handicap",
  "asianHandicap",
  "europeanHandicap",

  // ── Corners ──
  "corners",
  "totalCorners",
  "cornerHandicap",
  "cornerRace",
  "firstCorner",
  "lastCorner",

  // ── Cards ──
  "cards",
  "totalCards",
  "cardHandicap",
  "firstCard",
  "lastCard",
  "redCard",
  "yellowCard",

  // ── Half / period ──
  "halfTime",
  "halfTimeResult",
  "halfTimeScore",
  "halfTimeHandicap",
  "halfTimeTotalGoals",
  "secondHalf",
  "firstHalfGoals",
  "secondHalfGoals",
  "ht_ft",
  "period",

  // ── Player props ──
  "playerProps",
  "playerGoals",
  "playerAssists",
  "playerCards",
  "playerCorners",
  "playerShots",
  "playerOnTarget",
  "playerTackles",
  "playerToScore",
  "playerToBeBooked",
  "anytimeScorer",
  "firstScorer",
  "lastScorer",

  // ── Team props ──
  "teamProps",
  "teamToScore",
  "teamTotalGoals",
  "teamCorners",
  "teamCards",
  "teamShots",
  "teamToScoreFirst",
  "teamCleanSheet",
  "teamWinsBothHalves",
  "teamToScoreInBothHalves",

  // ── Shots / xG ──
  "shots",
  "totalShots",
  "shotsOnTarget",
  "shotsOffTarget",
  "shotsOnTargetHandicap",

  // ── Throw-ins / offsides / fouls ──
  "throwIns",
  "offsides",
  "fouls",
  "freeKicks",

  // ── Penalties ──
  "penalty",
  "penaltyShootout",

  // ── Match events ──
  "ownGoal",
  "overtime",
  "extraTime",
  "penalty shootout",

  // ── Outright / tournament ──
  "outright",
  "tournamentWinner",
  "topScorer",
  "toQualify",
  "groupWinner",
  "stageOfElimination",

  // ── Esports specific ──
  "mapWinner",
  "roundWinner",
  "totalRounds",
  "firstBlood",
  "firstTower",
  "firstDragon",
  "handicapMaps",
  "totalMaps",
  "mapHandicap",

  // ── Basketball specific ──
  "pointSpread",
  "totalPoints",
  "moneyline",
  "quarterWinner",
  "halfWinner",
  "teamTotalPoints",

  // ── Tennis specific ──
  "setWinner",
  "totalSets",
  "setHandicap",
  "gameHandicap",
  "totalGames",
  "tieBreak",
  "firstSetWinner",

  // ── Cricket specific ──
  "innings",
  "runs",
  "wickets",
  "playerRuns",
  "manOfTheMatch",

  // ── MMA / Boxing ──
  "methodOfVictory",
  "roundGroup",
  "goTheDistance",
  "knockout",

  // ── US Sports ──
  "runLine",
  "puckLine",
  "totals",
  "futures",
  "playerRebounds",
  "playerAssists",
  "playerPoints",
  "teamRebounds",
  "teamAssists",
  "teamSteals",
  "teamBlocks",

  // ── Generic / catch-all ──
  "specials",
  "combos",
  "multiples",
  "boosts",
  "enhanced",
  "matchups",
  "headToHead",
  "performance",
  "raceTo",
];

/**
 * Returns a deduplicated copy of the group list.
 * Use when you want to ensure no duplicates before passing to the API.
 */
export function getUniqueGroups(extra?: string[]): string[] {
  const base = [...STAKE_MARKET_GROUPS];
  if (extra) base.push(...extra);
  return [...new Set(base)];
}
