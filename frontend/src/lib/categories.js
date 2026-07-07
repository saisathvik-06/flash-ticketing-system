import { Clapperboard, Music2, Mic2, Trophy, Sparkles } from 'lucide-react';

// Order here drives the filter pill order on the events page.
export const CATEGORIES = ['All', 'Movie', 'Concert', 'Comedy', 'Sports', 'Other'];

// Indexed directly (not via a function call) so JSX usage like
// `<CATEGORY_ICONS[cat] />` is a statically-analyzable component reference.
export const CATEGORY_ICONS = {
  Movie: Clapperboard,
  Concert: Music2,
  Comedy: Mic2,
  Sports: Trophy,
  Other: Sparkles,
};
