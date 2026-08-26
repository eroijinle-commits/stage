export interface StakeSport { id: string; name: string; slug: string; }
export interface StakeCategory { id: string; name: string; slug: string; countryCode?: string; sport: StakeSport; }
export interface StakeTournament { id: string; name: string; slug: string; category: StakeCategory; fixtureCount?: number; }
export interface StakeFixtureCompetitor { name: string; defaultName: string; extId: string; countryCode?: string; abbreviation?: string; iconPath?: string; country?: string; }
export interface StakeFixtureDataMatch { __typename: "SportFixtureDataMatch"; startTime: string; isOutright: boolean; competitors: StakeFixtureCompetitor[]; teams?: Array<{ extId: string; name: string; qualifier: string }>; }
export interface StakeFixtureDataOutright { __typename: "SportFixtureDataOutright"; name: string; startTime: string; endTime?: string; isOutright: boolean; }
export type StakeFixtureData = StakeFixtureDataMatch | StakeFixtureDataOutright;
export interface StakeFixtureEventStatus { matchStatus: string; homeScore?: number; awayScore?: number; homeGameScore?: number; awayGameScore?: number; clock?: { matchTime: string; remainingTime?: string; stopped: boolean }; periodScores?: Array<{ homeScore: number; awayScore: number; matchStatus: string }>; statistic?: { corners?: { home: number; away: number }; yellowCards?: { home: number; away: number }; redCards?: { home: number; away: number } }; currentTeamServing?: string; }
export interface StakeFixture { id: string; name: string; slug: string; status: string; provider: string; stakeFixtureId?: string; extId?: string; marketCount?: number; liveWidgetUrl?: string; widgetUrl?: string; streamExists?: boolean; customBetAvailable?: boolean; data: StakeFixtureData; tournament: StakeTournament; eventStatus?: StakeFixtureEventStatus; }
export interface StakeSportGroup { name: string; translation: string; rank: number; }
export interface StakeSportGroupTemplate { id: string; extId: string; rank: number; name: string; }
export interface StakeMarketOutcome { __typename: "SportMarketOutcome"; id: string; active: boolean; odds: number; name: string; customBetAvailable?: boolean; extId?: string; }
export interface StakeMarket { id: string; name: string; status: "active" | "suspended" | "deactivated" | string; extId: string; specifiers?: string; customBetAvailable?: boolean; provider: string; templateExtId?: string; outcomes: StakeMarketOutcome[]; }
export interface StakeGroupWithMarkets extends StakeSportGroup { templates: Array<StakeSportGroupTemplate & { markets: StakeMarket[] }>; }
