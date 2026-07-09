import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Plus, Pencil, Trash2, MapPin, CalendarDays } from 'lucide-react';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../lib/api';
import { themeFor } from '../lib/theme';
import { formatEventDateShort } from '../lib/dates';
import socket from '../lib/socket';
import EventFormModal from './EventFormModal';

export default function EventManager({ eventOccupancy = [], notify, onChanged }) {
  const { getToken } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState(undefined); // undefined = closed, null = create, object = edit
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => notify('error', 'Failed to load events.'))
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    load();
    socket.on('events:changed', load);
    return () => socket.off('events:changed', load);
  }, [load]);

  function bookedCountFor(eventId) {
    return eventOccupancy.find((e) => String(e.eventId) === String(eventId))?.seats?.booked || 0;
  }

  function seatSummaryFor(eventId) {
    const seats = eventOccupancy.find((e) => String(e.eventId) === String(eventId))?.seats;
    if (!seats) return null;
    return { ...seats, total: seats.available + seats.locked + seats.booked };
  }

  async function handleSubmit(payload) {
    setSaving(true);
    try {
      const token = await getToken();
      if (modalEvent && modalEvent._id) {
        await updateEvent(modalEvent._id, payload, token);
        notify('success', 'Event updated.');
      } else {
        await createEvent(payload, token);
        notify('success', 'Event created.');
      }
      setModalEvent(undefined);
      load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event) {
    const booked = bookedCountFor(event._id);
    if (booked > 0) {
      notify('error', `Can't delete "${event.name}" — ${booked} seat(s) are already booked.`);
      return;
    }
    if (!window.confirm(`Delete "${event.name}"? This permanently removes its seat map. This cannot be undone.`)) {
      return;
    }

    setDeletingId(event._id);
    try {
      const token = await getToken();
      await deleteEvent(event._id, token);
      notify('success', 'Event deleted.');
      load();
      onChanged?.();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Manage events
        </h2>
        <button
          onClick={() => setModalEvent(null)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> New event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-14 text-center text-sm text-gray-500">
          No events yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event) => {
            const theme = themeFor(event.theme);
            const summary = seatSummaryFor(event._id);
            return (
              <div
                key={event._id}
                className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{event.name}</p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${theme.badge}`}
                    >
                      {event.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> {formatEventDateShort(event.dateTime)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {event.venue}
                    </span>
                  </div>
                </div>

                {summary && (
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {summary.booked}/{summary.total} booked
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {event.rows.length} rows × {event.cols}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setModalEvent(event)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 transition-colors cursor-pointer"
                    aria-label={`Edit ${event.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deletingId === event._id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                    aria-label={`Delete ${event.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalEvent !== undefined && (
        <EventFormModal
          event={modalEvent}
          bookedCount={modalEvent ? bookedCountFor(modalEvent._id) : 0}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => setModalEvent(undefined)}
        />
      )}
    </section>
  );
}
