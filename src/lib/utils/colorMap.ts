/**
 * Deterministic fixture-to-color mapping for cross-slip visual grouping.
 * Same fixtureId always produces the same color class.
 * @module lib/utils/colorMap
 */

const LEG_COLORS = [
    "border-l-blue-400 bg-blue-500/5",
    "border-l-emerald-400 bg-emerald-500/5",
    "border-l-amber-400 bg-amber-500/5",
    "border-l-purple-400 bg-purple-500/5",
    "border-l-rose-400 bg-rose-500/5",
    "border-l-cyan-400 bg-cyan-500/5",
    "border-l-orange-400 bg-orange-500/5",
    "border-l-teal-400 bg-teal-500/5",
    "border-l-pink-400 bg-pink-500/5",
    "border-l-lime-400 bg-lime-500/5",
];

const TEXT_COLORS = [
    "text-blue-400",
    "text-emerald-400",
    "text-amber-400",
    "text-purple-400",
    "text-rose-400",
    "text-cyan-400",
    "text-orange-400",
    "text-teal-400",
    "text-pink-400",
    "text-lime-400",
];

const DOT_COLORS = [
    "bg-blue-400",
    "bg-emerald-400",
    "bg-amber-400",
    "bg-purple-400",
    "bg-rose-400",
    "bg-cyan-400",
    "bg-orange-400",
    "bg-teal-400",
    "bg-pink-400",
    "bg-lime-400",
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/** Returns a Tailwind border-left + bg class for a fixture's leg rows. */
export function getFixtureColor(fixtureId: string): string {
    return LEG_COLORS[hashString(fixtureId) % LEG_COLORS.length];
}

/** Returns a Tailwind text color class for a fixture's label. */
export function getFixtureTextColor(fixtureId: string): string {
    return TEXT_COLORS[hashString(fixtureId) % TEXT_COLORS.length];
}

/** Returns a small colored dot class for a fixture indicator. */
export function getFixtureDot(fixtureId: string): string {
    return DOT_COLORS[hashString(fixtureId) % DOT_COLORS.length];
}
