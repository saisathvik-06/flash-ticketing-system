# Flash Tickets

A real-time, multi-event seat booking platform built to demonstrate handling
concurrency correctly under contention — the kind of problem BookMyShow,
Ticketmaster, or an airline seat map actually has to solve.

When hundreds of people try to grab the same seat at the same time, exactly
one should win. This project solves that with a distributed lock (Redis
`SET NX EX`) backing a MongoDB transaction, verified by a load test that fires
concurrent requests at the same seat and asserts only one succeeds.

## Features

- **Multi-event catalog** — browse events (concerts, movies, comedy, sports),
  each with its own seat map, pricing tiers, and venue/date details.
- **Real-time seat map** — Socket.IO pushes seat status changes (available /
  locked / booked) to everyone viewing an event, scoped per-event via socket
  rooms.
- **Distributed seat locking** — a seat lock is a short-lived Redis key
  (`SET NX EX`, 60s TTL); a background worker reconciles MongoDB if a lock
  silently expires (tab closed, crash, etc.).
- **Multi-seat cart & checkout** — hold several seats at once, see a shared
  countdown, and check out in a single atomic transaction (all seats booked
  and one `Booking` document created, or nothing happens).
- **Tiered pricing** — VIP / Premium / Standard rows, each with its own price
  and seat map color.
- **My Bookings** — booking history with a QR-coded ticket per booking, and
  self-service cancellation (releases the seats back to the pool).
- **Admin dashboard** — revenue, bookings, and per-event occupancy, gated by a
  Clerk-verified JWT and an admin allow-list, with a live refresh over a
  Socket.IO admin room whenever a booking is made or cancelled.
- **Auth boundary that matches the stakes** — placing a seat hold is cheap and
  stays trust-the-client (like the original seat-lock demo); actually paying,
  viewing your own bookings, cancelling, and the admin API all require a
  Clerk session token verified server-side with `@clerk/backend`.

## Architecture

```
frontend/   React 19 + Vite + Tailwind v4, Clerk auth, Socket.IO client
backend/    Express 5, MongoDB (Mongoose transactions), Upstash Redis (REST),
            Socket.IO server, Clerk backend SDK for JWT verification
```

- **Why Redis for locking, not just Mongo?** A `SET seat:lock NX EX 60` is a
  single atomic operation with a built-in expiry — no polling, no cron job to
  clean up abandoned holds under normal operation, and no risk of two
  requests both reading "available" and both writing "locked" (the classic
  check-then-act race). Mongo still owns the source of truth for seat state
  and bookings; Redis only owns the transient "who's currently holding this
  seat" lease.
- **Why a Mongo transaction for checkout?** Booking N seats has to be
  all-or-nothing — if seat 7 of 8 turns out to already be booked, the first 7
  must not be charged. `session.withTransaction` rolls the whole batch back.
- **Expiration worker**: every 10s, sweeps seats marked `locked` in Mongo
  whose Redis key has already expired (or was never renewed) and releases
  them, broadcasting the change over the event's socket room.

## Setup

Requires a MongoDB **replica set** (transactions need it — a free Atlas
cluster already is one), an [Upstash](https://upstash.com) Redis database,
and a [Clerk](https://clerk.com) application.

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in Mongo/Redis/Clerk credentials
npm run seed            # seeds 4 events with A1–J10 seat maps
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env    # fill in Clerk publishable key + backend URL
npm run dev
```

To see the admin dashboard, put your Clerk account's email in **both**
`backend/.env`'s `ADMIN_EMAILS` (enforced) and `frontend/.env`'s
`VITE_ADMIN_EMAILS` (just shows the nav link). From there, **Admin → Manage
Events** lets you create/edit/delete events — title, category, venue,
description, date, theme, and the full seat grid (rows, seats per row, and
per-row pricing tiers).

## Deploying live

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a step-by-step guide to putting this
on the internet (MongoDB Atlas, Upstash Redis, Clerk, Render, Vercel) so it's
reachable from any device via a real URL, not just `localhost`.

## Concurrency test

`test-concurrency.js` at the repo root fires 5 simultaneous lock requests at
the same seat and asserts exactly 1 succeeds and 4 get `409 Conflict`:

```bash
node test-concurrency.js   # with the backend running and seeded
```
