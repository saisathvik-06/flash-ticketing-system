const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function fetchEvents() {
  return request('/api/events');
}

export function fetchEvent(eventId) {
  return request(`/api/events/${eventId}`);
}

export function fetchSeats(eventId) {
  return request(`/api/events/${eventId}/seats`);
}

export function lockSeat(eventId, seatNumber, userId) {
  return request('/api/seats/lock', {
    method: 'POST',
    body: { eventId, seatNumber, userId },
  });
}

export function unlockSeat(eventId, seatNumber, userId) {
  return request('/api/seats/unlock', {
    method: 'POST',
    body: { eventId, seatNumber, userId },
  });
}

export function checkout(eventId, seatNumbers, token) {
  return request('/api/bookings/checkout', {
    method: 'POST',
    body: { eventId, seatNumbers },
    token,
  });
}

export function fetchMyBookings(token) {
  return request('/api/bookings/mine', { token });
}

export function cancelBooking(bookingId, token) {
  return request(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    token,
  });
}

export function fetchAdminStats(token) {
  return request('/api/admin/stats', { token });
}

export function fetchAdminBookings(token) {
  return request('/api/admin/bookings', { token });
}

export function createEvent(payload, token) {
  return request('/api/admin/events', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function updateEvent(eventId, payload, token) {
  return request(`/api/admin/events/${eventId}`, {
    method: 'PUT',
    body: payload,
    token,
  });
}

export function deleteEvent(eventId, token) {
  return request(`/api/admin/events/${eventId}`, {
    method: 'DELETE',
    token,
  });
}
