// Static class-name lookup so Tailwind's scanner can see every literal class.
// Keyed by the `theme` field on an Event document.
export const THEMES = {
  violet: {
    gradient: 'from-violet-400 to-fuchsia-400',
    banner: 'from-violet-600/30 via-fuchsia-600/10 to-transparent',
    badge: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    glow: 'group-hover:shadow-[0_0_28px_rgba(139,92,246,0.25)]',
    ring: 'ring-violet-500/40',
    dot: 'bg-violet-500',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-400',
    banner: 'from-rose-600/30 via-pink-600/10 to-transparent',
    badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    glow: 'group-hover:shadow-[0_0_28px_rgba(244,63,94,0.25)]',
    ring: 'ring-rose-500/40',
    dot: 'bg-rose-500',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-400',
    banner: 'from-amber-600/30 via-orange-600/10 to-transparent',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    glow: 'group-hover:shadow-[0_0_28px_rgba(245,158,11,0.25)]',
    ring: 'ring-amber-500/40',
    dot: 'bg-amber-500',
  },
  emerald: {
    gradient: 'from-emerald-400 to-teal-400',
    banner: 'from-emerald-600/30 via-teal-600/10 to-transparent',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    glow: 'group-hover:shadow-[0_0_28px_rgba(16,185,129,0.25)]',
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-500',
  },
  cyan: {
    gradient: 'from-cyan-400 to-blue-400',
    banner: 'from-cyan-600/30 via-blue-600/10 to-transparent',
    badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    glow: 'group-hover:shadow-[0_0_28px_rgba(34,211,238,0.25)]',
    ring: 'ring-cyan-500/40',
    dot: 'bg-cyan-500',
  },
};

export function themeFor(theme) {
  return THEMES[theme] || THEMES.violet;
}

// Seat-tier fill colors (available state only — locked/booked stay neutral).
export const TIER_STYLES = {
  VIP: {
    base: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400/80',
    hover:
      'hover:bg-fuchsia-500/25 hover:border-fuchsia-400/70 hover:text-fuchsia-300 hover:shadow-[0_0_14px_rgba(217,70,239,0.3)]',
    dot: 'bg-fuchsia-500/50',
  },
  Premium: {
    base: 'bg-violet-500/10 border-violet-500/30 text-violet-400/80',
    hover:
      'hover:bg-violet-500/25 hover:border-violet-400/70 hover:text-violet-300 hover:shadow-[0_0_14px_rgba(139,92,246,0.3)]',
    dot: 'bg-violet-500/50',
  },
  Standard: {
    base: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400/80',
    hover:
      'hover:bg-emerald-500/25 hover:border-emerald-400/70 hover:text-emerald-300 hover:shadow-[0_0_14px_rgba(16,185,129,0.3)]',
    dot: 'bg-emerald-500/50',
  },
};

export function tierStyleFor(tier) {
  return TIER_STYLES[tier] || TIER_STYLES.Standard;
}
