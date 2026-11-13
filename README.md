# ResourceSync

Offline-first resource tracker for the Zetech Forge Software Development Challenge B.

## Technology

- React + Vite
- IndexedDB for durable browser-side records and pending operations
- Service Worker for caching the application shell
- Node.js + Express REST API
- MongoDB for shared remote records, operation receipts and conflict history

## Important deployment condition

The hackathon requires an **organizer-approved persistent remote store**. PrimeCloud's published quickstart lists managed MongoDB, but the event guide says allocated services and permissions must be confirmed with the Technical Lead. Do not provision paid resources or assume an entitlement. Configure `MONGODB_URI` using the approved secret-binding mechanism.

MongoDB transactions are used to atomically apply a resource mutation and persist its operation receipt. The selected MongoDB deployment must support transactions (normally a replica set or sharded cluster).

## Requirements

- Node.js 20 or later
- npm 10 or later
- A MongoDB instance for the backend
- A modern browser with IndexedDB and Service Worker support

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to a MongoDB instance you are authorized to use.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start frontend and backend:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`.

The Vite development server proxies `/api` requests to Express on port 4000.

## Production build

```bash
npm run build
npm start
```

The Express server serves the built React application and API from one origin. It listens on `0.0.0.0:$PORT` for PrimeCloud compatibility.

## API

- `GET /healthz` — process health
- `GET /readyz` — database readiness
- `GET /api/resources` — remote resource records, including tombstones
- `GET /api/conflicts` — recent conflict decisions
- `POST /api/sync` — apply one queued operation

## Synchronization guarantees and limitations

- Each browser operation receives a stable UUID before it is queued.
- IndexedDB stores records and pending operations durably.
- The client processes the durable queue in FIFO order.
- A failed or unacknowledged operation remains queued with the same operation ID.
- The server stores an operation receipt and resource mutation in one MongoDB transaction.
- Repeated operation IDs return the original receipt instead of applying the mutation twice.
- The server detects concurrent edits using `baseVersion`, then applies last-write-wins ordered by `(clientTimestamp, deviceId)`. Both winning and losing concurrent updates are recorded in a visible conflict log.
- Deletes are represented by tombstones so stale copies do not resurrect deleted resources.

Last-write-wins relies on client timestamps. Significant device clock skew can affect which update wins; the device ID provides a deterministic tie-breaker, not clock synchronization. This is a deliberate, documented limitation for the hackathon scope.

## Current implementation status

This repository is the first working vertical slice. Before submission, complete and verify the full acceptance matrix in `docs/ACCEPTANCE.md`, especially two independent offline sessions, reload persistence, failed requests, lost acknowledgments, deletion and remote persistence after a permitted restart.
