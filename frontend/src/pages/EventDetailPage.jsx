import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { CalendarDays, MapPin, ArrowLeft } from 'lucide-react';
import socket, { joinEventRoom, leaveEventRoom } from '../lib/socket';
import { fetchEvent, fetchSeats, lockSeat, unlockSeat, checkout } from '../lib/api';
import { useNotify } from '../context/notification-store';
import { themeFor } from '../lib/theme';
import { formatEventDate } from '../lib/dates';
import SeatGrid from '../components/SeatGrid';
import CartBar from '../components/CartBar';
import CheckoutPanel from '../components/CheckoutPanel';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartSeats, setCartSeats] = useState([]); // { seatNumber, tier, price, expiresAt }
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busySeat, setBusySeat] = useState(null);

  const cartSeatNumbers = useMemo(
    () => new Set(cartSeats.map((s) => s.seatNumber)),
    [cartSeats]
  );

  // ── Load event + seats, join socket room ──
  useEffect(() => {
    Promise.all([fetchEvent(eventId), fetchSeats(eventId)])
      .then(([eventData, seatData]) => {
        setEvent(eventData);
        setSeats(seatData);
      })
      .catch(() => notify('error', 'Failed to load this event.'))
      .finally(() => setLoading(false));

    joinEventRoom(eventId);
    return () => leaveEventRoom(eventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // ── Live event edits from the admin dashboard ──
  useEffect(() => {
    const handler = ({ eventId: changedId }) => {
      if (changedId && changedId !== eventId) return;

      Promise.all([fetchEvent(eventId), fetchSeats(eventId)])
        .then(([eventData, seatData]) => {
          setEvent(eventData);
          setSeats(seatData);
          notify('info', 'This event was just updated by an admin.');
        })
        .catch(() => {
          notify('warning', 'This event is no longer available.');
          navigate('/');
        });
    };

    socket.on('events:changed', handler);
    return () => socket.off('events:changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // ── Real-time seat updates ──
  useEffect(() => {
    const handler = ({ seatNumber, status }) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.seatNumber === seatNumber
            ? { ...s, status, lockedBy: status === 'available' ? null : s.lockedBy }
            : s
        )
      );

      // If a seat we're holding got released elsewhere (expired), drop it from the cart
      setCartSeats((prev) => {
        if (status !== 'available') return prev;
        if (!prev.some((s) => s.seatNumber === seatNumber)) return prev;
        notify('warning', `Seat ${seatNumber} hold expired and was released.`);
        const next = prev.filter((s) => s.seatNumber !== seatNumber);
        if (next.length === 0) setCheckoutOpen(false);
        return next;
      });
    };

    socket.on('seat:status-changed', handler);
    return () => socket.off('seat:status-changed', handler);
  }, [notify]);

  const handleSeatClick = useCallback(
    async (seatNumber) => {
      if (!isSignedIn) {
        notify('info', 'Sign in to select a seat.');
        return;
      }
      if (busySeat) return;

      const seat = seats.find((s) => s.seatNumber === seatNumber);
      const alreadyInCart = cartSeatNumbers.has(seatNumber);

      setBusySeat(seatNumber);
      try {
        if (alreadyInCart) {
          await unlockSeat(eventId, seatNumber, user.id);
          setCartSeats((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
        } else {
          const result = await lockSeat(eventId, seatNumber, user.id);
          setCartSeats((prev) => [
            ...prev,
            {
              seatNumber,
              tier: seat?.tier,
              price: seat?.price,
              expiresAt: result.expiresAt,
            },
          ]);
        }
      } catch (err) {
        notify('error', err.message);
      } finally {
        setBusySeat(null);
      }
    },
    [isSignedIn, user, busySeat, seats, cartSeatNumbers, eventId, notify]
  );

  const handleRemoveSeat = useCallback(
    async (seatNumber) => {
      if (!user) return;
      try {
        await unlockSeat(eventId, seatNumber, user.id);
      } catch (err) {
        console.error('Failed to unlock seat:', err);
      }
      setCartSeats((prev) => {
        const next = prev.filter((s) => s.seatNumber !== seatNumber);
        if (next.length === 0) setCheckoutOpen(false);
        return next;
      });
    },
    [eventId, user]
  );

  const handlePayment = useCallback(async () => {
    if (cartSeats.length === 0 || paying) return;
    setPaying(true);
    try {
      const token = await getToken();
      await checkout(eventId, cartSeats.map((s) => s.seatNumber), token);
      setCartSeats([]);
      setCheckoutOpen(false);
      notify('success', '🎉 Booking confirmed! Find your tickets under My Bookings.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setPaying(false);
    }
  }, [cartSeats, paying, getToken, eventId, notify]);

  const handleTimerExpired = useCallback(() => {
    setCartSeats([]);
    setCheckoutOpen(false);
    notify('warning', "⏰ Time's up! Your reservation has expired.");
  }, [notify]);

  const handleCancelCheckout = useCallback(async () => {
    if (user) {
      await Promise.all(
        cartSeats.map((s) =>
          unlockSeat(eventId, s.seatNumber, user.id).catch((err) =>
            console.error('Failed to unlock seat on cancel:', err)
          )
        )
      );
    }
    setCartSeats([]);
    setCheckoutOpen(false);
  }, [cartSeats, eventId, user]);

  const totalAmount = cartSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const theme = event ? themeFor(event.theme) : themeFor('violet');

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All events
        </button>

        {event && (
          <div className="text-center mb-10 sm:mb-14">
            <span
              className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border mb-3 ${theme.badge}`}
            >
              {event.category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> {formatEventDate(event.dateTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {event.venue}
              </span>
            </div>
          </div>
        )}

        <SeatGrid
          seats={seats}
          rows={event?.rows || []}
          cols={event?.cols || 0}
          cartSeatNumbers={cartSeatNumbers}
          userId={user?.id}
          onSeatClick={handleSeatClick}
          loading={loading}
        />
      </main>

      {!checkoutOpen && (
        <CartBar cartSeats={cartSeats} totalAmount={totalAmount} onCheckout={() => setCheckoutOpen(true)} />
      )}

      {checkoutOpen && cartSeats.length > 0 && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={paying ? undefined : () => setCheckoutOpen(false)}
          />
          <CheckoutPanel
            cartSeats={cartSeats}
            onRemoveSeat={handleRemoveSeat}
            onPay={handlePayment}
            onCancel={handleCancelCheckout}
            onExpired={handleTimerExpired}
            paying={paying}
          />
        </>
      )}
    </>
  );
}
