# Deployment Guide

This turns the local dev setup into a live app anyone can open from a phone,
laptop, or any other device — no VPN, port-forwarding, or same-network
requirement. Everything below has a free tier, so you can get a working
public link at no cost.

You're wiring together 5 pieces:

| Piece            | What it's for                                  | Where it runs        |
|-------------------|-------------------------------------------------|-----------------------|
| MongoDB Atlas     | Seats, events, bookings (needs a replica set for transactions) | Cloud (MongoDB) |
| Upstash Redis     | Distributed seat locks (REST API, not a raw TCP connection) | Cloud (Upstash) |
| Clerk             | Auth (sign-in, sessions, admin gating)          | Cloud (Clerk)         |
| Backend (Express + Socket.IO) | API + real-time seat updates       | Render (or Railway/Fly.io) |
| Frontend (React/Vite) | The site people actually visit              | Vercel                |

Do them roughly in this order — each later step needs a value produced by an
earlier one.

---

## 1. MongoDB Atlas (database)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **free M0 cluster** (any region close to where your backend
   will run). M0 clusters are already a replica set, which this app requires
   — bookings and cancellations run inside Mongo transactions.
3. **Database Access** → add a database user with a username/password (not
   your Atlas login). Save the password somewhere — you'll need it in the
   connection string.
4. **Network Access** → add IP address `0.0.0.0/0` (allow from anywhere).
   Render/Railway/Vercel use dynamic IPs, so you can't easily allow-list a
   fixed range; Atlas's own auth (username/password) is what actually
   protects the database.
5. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Add a database name before the `?`, e.g. `.../flash-ticketing?retryWrites=true...`.
   This full string is your `MONGO_URI`.

## 2. Upstash Redis (seat locks)

1. Create a free account at [upstash.com](https://upstash.com).
2. Create a new Redis database (pick a region close to your backend host —
   every seat lock/unlock is a round trip to Redis, so latency matters here).
3. On the database's page, under **REST API**, copy:
   - `UPSTASH_REDIS_REST_URL` → this is your `REDIS_URL`
   - `UPSTASH_REDIS_REST_TOKEN` → this is your `REDIS_TOKEN`

   Use the **REST** credentials, not the `redis://` connection string — this
   app talks to Upstash over HTTPS (`@upstash/redis`), not a raw TCP socket.

## 3. Clerk (auth)

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. **API Keys** → copy the **Publishable key** (`VITE_CLERK_PUBLISHABLE_KEY`)
   and **Secret key** (`CLERK_SECRET_KEY`).
3. Once you have your production frontend URL (step 5), come back to Clerk →
   **Domains** and add it, so Clerk accepts sign-ins from that origin.

## 4. Deploy the backend (Render)

The backend holds a persistent Socket.IO connection, so it needs a long-running
server rather than serverless functions — [Render](https://render.com)'s free
Web Service tier works well.

1. Push this repo to GitHub if it isn't already there.
2. On Render: **New** → **Web Service** → connect the repo.
3. Configure:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Instance type**: Free (or a paid tier — see the note below on cold starts)
4. Add environment variables (Render → your service → **Environment**):
   ```
   MONGO_URI=<from step 1>
   REDIS_URL=<from step 2>
   REDIS_TOKEN=<from step 2>
   CLERK_SECRET_KEY=<from step 3>
   ADMIN_EMAILS=you@example.com
   CLIENT_ORIGIN=http://localhost:5173
   ```
   (`CLIENT_ORIGIN` gets updated to the real frontend URL in step 6 — leave a
   placeholder for now so the first deploy succeeds. `PORT` doesn't need to be
   set; Render injects its own and `server.js` already falls back to it.)
5. Deploy. Once it's live, note the public URL, e.g.
   `https://flash-tickets-api.onrender.com` — you'll need it for the frontend.
6. Seed the database once, from your own machine, pointed at Atlas:
   ```bash
   cd backend
   MONGO_URI="<your Atlas connection string>" npm run seed
   ```

**Free-tier note:** Render's free Web Services spin down after ~15 minutes of
inactivity and take 30–60s to wake back up on the next request — the first
visitor after a quiet spell will see a slow load and a dropped Socket.IO
connection until it reconnects. This is fine for a demo/portfolio link; if you
want it always warm, use Render's cheapest paid instance or Railway instead
(same steps, no spin-down).

## 5. Deploy the frontend (Vercel)

This repo already has a Vercel project linked (`frontend/.vercel/`).

1. From the `frontend` directory:
   ```bash
   cd frontend
   npx vercel        # first deploy — links/confirms the project, deploys a preview
   npx vercel --prod  # promotes to your production URL
   ```
   Or connect the repo in the Vercel dashboard with **root directory** set to
   `frontend` and let it deploy on every push to `main`.
2. In Vercel → your project → **Settings → Environment Variables**, add:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=<from step 3>
   VITE_BACKEND_URL=<your Render backend URL from step 4>
   VITE_ADMIN_EMAILS=you@example.com
   ```
3. Redeploy after adding env vars (Vercel doesn't hot-apply them to an
   existing build).
4. Note the resulting URL, e.g. `https://flash-tickets.vercel.app` — this is
   the live link you can open from any device.

## 6. Close the loop: point the backend at the real frontend

Go back to Render → your backend service → **Environment** and set:
```
CLIENT_ORIGIN=https://flash-tickets.vercel.app
```
(Comma-separate multiple origins if you also want to allow a Vercel preview
URL or a custom domain — `server.js` already splits this on commas.) Redeploy
the backend so CORS and the Socket.IO handshake accept requests from your
real frontend domain.

Also add that same domain in Clerk → **Domains** (step 3) so sign-in works
there.

## 7. Test it

Open the Vercel URL on your phone (over mobile data, not just wifi, to
confirm it's really public) and on a laptop at the same time. Sign in on
both, open the same event, and select a seat on one device — it should show
as locked on the other within a second or two over the Socket.IO connection.

---

## Troubleshooting

- **CORS errors in the browser console** — `CLIENT_ORIGIN` on the backend
  doesn't include your frontend's exact origin (scheme + host, no trailing
  slash). Check it matches exactly and redeploy the backend.
- **Sign-in works locally but not on the deployed site** — add the deployed
  frontend domain in Clerk → Domains.
- **"Missing required env variable(s)"** on backend startup — one of
  `MONGO_URI`, `REDIS_URL`, `REDIS_TOKEN`, `CLERK_SECRET_KEY` isn't set in
  Render's environment tab.
- **Bookings/cancellations fail with a transaction error** — the Mongo
  cluster isn't a replica set. An Atlas M0+ cluster always is one; this only
  happens if you point `MONGO_URI` at a standalone `mongod` instead.
- **Admin dashboard says "Access denied"** — the signed-in email isn't in
  `ADMIN_EMAILS` (backend, enforced) or you're checking the nav link, which
  only depends on `VITE_ADMIN_EMAILS` (frontend, cosmetic) — both need the
  same email, and both are comma-separated lists with no quotes.
- **First request after idle is slow / seat updates stop arriving** — the
  free Render instance spun down; see the free-tier note in step 4.

## Custom domain (optional)

Both Vercel and Render support attaching a custom domain under their
project/service settings (Vercel: **Settings → Domains**; Render: **Settings
→ Custom Domains**) — point your domain's DNS at the target they give you,
then update `CLIENT_ORIGIN` (backend) and `VITE_BACKEND_URL` (frontend) to
match if the domain change affects either origin.
