import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import { themeFor } from '../lib/theme';
import { CATEGORY_ICONS } from '../lib/categories';
import { formatEventDateShort, isPastEvent } from '../lib/dates';

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const theme = themeFor(event.theme);
  const Icon = CATEGORY_ICONS[event.category] || CATEGORY_ICONS.Other;
  const isPast = isPastEvent(event.dateTime);

  return (
    <button
      onClick={() => navigate(`/events/${event._id}`)}
      className={`group relative w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5 cursor-pointer ${theme.glow}`}
    >
      {/* Poster-style banner — a large watermark icon standing in for cover art */}
      <div className={`h-32 bg-gradient-to-br ${theme.banner} relative overflow-hidden`}>
        <Icon
          className="absolute -right-3 -bottom-5 w-28 h-28 text-white/[0.07] group-hover:text-white/[0.1] group-hover:scale-105 transition-all duration-500"
          strokeWidth={1.25}
        />
        <span
          className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${theme.badge}`}
        >
          <Icon className="w-3 h-3" />
          {event.category}
        </span>
        {isPast && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/10 border border-white/10 text-gray-400">
            Past
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold tracking-tight text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300 group-hover:from-white group-hover:to-gray-300">
          {event.name}
        </h3>

        <div className="space-y-1.5 mb-4">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatEventDateShort(event.dateTime)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            {event.venue}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-300">
            ₹{event.priceRange.min}
            {event.priceRange.max !== event.priceRange.min && (
              <span className="text-gray-500"> – ₹{event.priceRange.max}</span>
            )}
          </p>
          <span
            className={`flex items-center gap-1 text-xs font-medium bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}
          >
            View seats <ArrowRight className="w-3 h-3 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  );
}
