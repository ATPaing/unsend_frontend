# Unsend Frontend

Web client for **Unsend** — an end-to-end encrypted journal app. Encryption, PIN unlock, and private-key handling happen in the browser. The API never sees plaintext journals, PINs, or private keys.

## Stack

- React 19
- Vite 8
- React Router 7
- Tailwind CSS 4
- Web Crypto API (RSA-OAEP + AES-GCM)
- Argon2id via `@noble/hashes` (PIN → key derivation)
- Server-Sent Events for friends, notifications, and sharing updates

## Requirements

- Node.js 20+
- npm
- Running Unsend backend (default `http://localhost:3000`)

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

### Environment

| Variable | Required | Example | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | yes | `http://localhost:3000/api` | Backend API base (includes `/api`) |

Example `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |

## Features

- Auth (signup / login / session cookie)
- Vault unlock with 6-digit PIN (private key in memory only)
- Encrypted journals and time capsules
- Journal sharing (per-recipient AES key wraps)
- Friends + notifications + SSE realtime
- Settings: password, PIN re-wrap, auto-lock, theme, toast prefs, delete account

## Security notes

- PIN, derived keys, and private keys are never written to `localStorage` / `sessionStorage`.
- Local preferences (`unsend.preferences`) store only non-sensitive UI settings (theme, auto-lock, toast toggles).
- Changing PIN **re-encrypts the same private key**; the public key does not change.
- Time-capsule countdowns sync to server time; unlock is decided by the backend (`isUnlocked`).
- Locking the vault clears in-memory private key + decrypted caches; the session stays authenticated.

## Main routes

| Path | Page |
|---|---|
| `/` | Home |
| `/journals` | My Journals |
| `/journals/:journalId` | Journal / capsule detail |
| `/shared` | Shared With Me |
| `/time-capsules` | Time Capsules |
| `/friends` | Friends |
| `/notifications` | Notifications |
| `/settings` | Settings |
| `/login` | Login |
| `/register` | Register |

## Project layout

```text
frontend/
├── public/
├── src/
│   ├── components/
│   ├── features/          # auth, vault, journals, friends, notifications, preferences, realtime, settings
│   ├── pages/
│   ├── services/          # apiRequest helper
│   ├── styles/
│   ├── utils/crypto/      # key wrap, journal encrypt/decrypt, PIN derive
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── .gitignore
```

## Development notes

- All authenticated API calls use `credentials: "include"`.
- CORS on the backend must allow this origin (default `http://localhost:5173`).
- Crypto details: see `docs/CRYPTO.md`. API contract: see `docs/API.md`.

## License
