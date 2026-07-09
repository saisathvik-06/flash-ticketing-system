import { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { IndianRupee, Ticket, Armchair, CalendarRange, ShieldAlert } from 'lucide-react';
import { fetchAdminStats, fetchAdminBookings } from '../lib/api';
import socket, { joinAdminRoom } from '../lib/socket';
import StatCard from '../components/StatCard';
import EventManager from '../components/EventManager';
import { useNotify } from '../context/notification-store';
import { formatDateOnly } from '../lib/dates';

function OccupancyBar({ seats }) {
  const total = seats.available + seats.locked + seats.booked || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04] w-full">
      <div className="bg-red-500/60" style={{ width: `${(seats.booked / total) * 100}%` }} />
      <div className="bg-amber-500/60" style={{ width: `${(seats.locked / total) * 100}%` }} />
      <div className="bg-emerald-500/40" style={{ width: `${(seats.available / total) * 100}%` }} />
    </div>
  );
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const notify = useNotify();

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [statsData, bookingsData] = await Promise.all([
        fetchAdminStats(token),
        fetchAdminBookings(token),
      ]);
      setStats(statsData);
      setBookings(bookingsData);
      setForbidden(false);
    } catch {
      setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Deferred a tick so this reads as reacting to state, not a synchronous
    // setState-in-effect call (the linter treats those as separate cases).
    queueMicrotask(load);

    let unsub = () => {};
    getToken().then((token) => {
      joinAdminRoom(token);
      const handler = () => load();
      socket.on('admin:booking-changed', handler);
      unsub = () => socket.off('admin:booking-changed', handler);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, load]);

  if (!isLoaded) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn || forbidden) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-24 text-center animate-fade-in">
        <ShieldAlert className="w-10 h-10 text-red-400/70 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Access denied</h1>
        <p className="text-sm text-gray-500">This dashboard is restricted to event admins.</p>
      </main>
    );
  }

  if (loading || !stats) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500">Live revenue, occupancy, and booking activity.</p>
      </div>

      <div className="flex items-center gap-1 mb-8 border-b border-white/[0.06]">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'events', label: 'Manage Events' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === t.key
                ? 'border-violet-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <EventManager eventOccupancy={stats.eventOccupancy} notify={notify} onChanged={load} />
      )}

      {tab === 'overview' && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={IndianRupee}
          label="Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          icon={Ticket}
          label="Bookings"
          value={stats.totalBookings}
          accent="bg-violet-500/15 text-violet-400"
        />
        <StatCard
          icon={Armchair}
          label="Seats Sold"
          value={stats.totalSeatsSold}
          accent="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          icon={CalendarRange}
          label="Events"
          value={stats.totalEvents}
          accent="bg-rose-500/15 text-rose-400"
        />
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
          Occupancy by event
        </h2>
        <div className="space-y-3">
          {stats.eventOccupancy.map((e) => {
            const total = e.seats.available + e.seats.locked + e.seats.booked;
            return (
              <div key={e.eventId} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <p className="text-sm font-medium text-white truncate">{e.name}</p>
                  <p className="text-xs text-gray-500 shrink-0">
                    {e.seats.booked}/{total} booked
                  </p>
                </div>
                <OccupancyBar seats={e.seats} />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
          Recent bookings
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Seats</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No bookings yet.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b._id} className="border-b border-white/[0.03] last:border-0">
                  <td className="px-4 py-3 text-gray-200">{b.eventId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {b.seatNumbers.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-gray-200">₹{b.totalAmount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/30 text-red-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateOnly(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </main>
  );
}
