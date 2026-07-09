import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchEvents } from '../lib/api';
import { isPastEvent } from '../lib/dates';
import { CATEGORIES, CATEGORY_ICONS } from '../lib/categories';
import EventCard from '../components/EventCard';
import socket from '../lib/socket';

function HeroStat({ value, label }) {
  return (
    <div>
      <p className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs text-gray-500">{label}</p>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const load = useCallback(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err) => {
        console.error('Fetch events failed:', err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // An admin created/edited/deleted an event elsewhere — refresh the catalog.
    socket.on('events:changed', load);
    return () => socket.off('events:changed', load);
  }, [load]);

  const categoriesInUse = useMemo(() => {
    const present = new Set(events.map((e) => e.category));
    return ['All', ...CATEGORIES.filter((c) => c !== 'All' && present.has(c))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchesCategory = category === 'All' || e.category === category;
      const matchesQuery =
        !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [events, query, category]);

  const stats = useMemo(() => {
    const liveEvents = events.filter((e) => !isPastEvent(e.dateTime)).length;
    const venues = new Set(events.map((e) => e.venue)).size;
    const seats = events.reduce((sum, e) => sum + (e.rows?.length || 0) * (e.cols || 0), 0);
    const categoriesCount = new Set(events.map((e) => e.category)).size;
    return { liveEvents, venues, seats, categoriesCount };
  }, [events]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* ── Hero ── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
          <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Book Your Next
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Experience
          </span>
        </h1>
        <p className="text-sm sm:text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
          Movies, concerts, comedy & sports — all in one place. Real-time seat selection.
        </p>

        <div className="max-w-md mx-auto relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or venues…"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-colors"
          />
        </div>

        {!loading && events.length > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <HeroStat value={stats.liveEvents} label="Live Events" />
            <HeroStat value={stats.venues} label="Venues" />
            <HeroStat value={stats.seats.toLocaleString()} label="Total Seats" />
            <HeroStat value={stats.categoriesCount} label="Categories" />
          </div>
        )}
      </div>

      {/* ── Category filters ── */}
      {!loading && events.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categoriesInUse.map((cat) => {
            const Icon = cat === 'All' ? null : CATEGORY_ICONS[cat] || CATEGORY_ICONS.Other;
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.16]'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading events…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <p className="text-sm text-gray-500">No events are on sale right now. Check back soon.</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <p className="text-sm text-gray-500">No events match “{query}”{category !== 'All' ? ` in ${category}` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 animate-fade-in">
          {filteredEvents.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
