# DAYFLOW

A gentle, adaptive planning workspace for real days. DAYFLOW helps you choose one next action, shape a realistic schedule, capture distracting thoughts, and restart without losing anything you have already done.

> DAYFLOW is a productivity and planning tool. It is not a medical, diagnostic, or clinical service. It does not make claims about your health or behaviour.

## What is included

### Product philosophy
- **Progress over perfection.** Starting counts. A short version still counts.
- **No punishment.** No streaks to lose, no overdue shame, no automatic bulk rescheduling.
- **User control.** Every schedule, priority, and restart action is previewed or chosen by you.
- **Small actions.** Start Assist suggests the smallest visible next step.
- **Adaptive, not rigid.** Schedules respond to energy, available time, events, and recorded duration history.

### Core features
- **Start Assist** — one tiny first action, with options to start a timer, break a task down, open materials, or save progress.
- **Eisenhower Matrix** — a four-quadrant view of open tasks under “More”; importance and due dates sort tasks, and you can move any task between quadrants.
- **Adaptive Scheduling** — rule-based time blocks with buffers, breaks, events, and human-readable reasons.
- **Brain Dump + Distraction Parking Lot** — capture thoughts first; park distractions during focus; convert thoughts into tasks later.
- **Flexible Routines** — full, short, and minimum versions. Missing a day changes nothing.
- **Appointments and deadlines** — preparation, travel, and reminder buffers, shown in a monthly calendar.
- **Focus Room** — one clock for focus, breaks, estimates, reminders, recent sessions, and distraction parking. Session length can be locked; "Open session · counts up from zero" is a stopwatch with no goal or countdown, and time spent can be logged manually without starting a clock. A finished countdown focus block rolls into a short break and stays open until you finish or pause. Optional background music is off by default. Choose **Direct audio** (three calm, CC-BY 3.0 tracks played without embed limits) or **YouTube** (verified embeddable presets or a pasted link) in Focus or Settings. Playback follows the session's pause/resume and stops when the session closes. Direct audio is the default because some YouTube videos disallow embedding; YouTube videos and ads remain controlled by YouTube.
- **Progress + Insights** — one daily/monthly dashboard with gentle "quests", recorded-only charts for focus time and finished tasks, planned-vs-actual and category patterns from your history, and suggestions built only from what you actually did. The old `/insights` link now opens Progress.
- **Share my stats** — copies or opens a short, recorded-only summary for the period you are viewing. Nothing private is included.
- **Contact & support the owner** — a small panel in Settings to email `sashakolhatkar28@gmail.com` for questions or feedback, or to arrange a donation to the site owner. DAYFLOW does not take payment in the app.
- **Owner traffic dashboard** — the owner account sees a `/owner` page with page views, unique visitors, visits, daily views, pages, devices, referrers and recent views. Non-owners get no navigation item and a 403 from the API. Visitor/session IDs are hashed; no IP address, name, task text or raw user agent is stored.
- **Chibi companions** — four small pastel friends (Pip, Milo, Lumi and Nori) on Progress, the floating Buddy chat and the Restart screen. Pick a character and colour in Settings or Progress, rename your buddy, or leave it blank to keep the default. Buddy uses your account name (or a name you tell it), your recorded DAYFLOW data, and chat notes kept only in this browser to shape gentle replies. It is transparent rule-based learning — no cloud, no mood tracking, no clinical claims — and you can press **Forget** to clear everything it learned. Buddy can be dragged anywhere on screen so it never sits on top of the timer. Progress charts still come only from what you recorded.
- **Small celebrations** — 20 distinct, quick animations for finished tasks, saved sessions, quests, levels, routines, breaks and other recorded milestones. They respect reduced-motion settings and never invent achievements.
- **Google Calendar (optional)** — read-only import of upcoming events from the Calendar page. Nothing is written back to Google.
- **Global Restart Button** — available on every page, including the Focus Room.
- **Sidebar** — the navigation scrolls when it is tall, and its right edge can be dragged to resize it. The width is remembered in this browser.
- **Four themes** — Warm light, Soft dark, Clean White, and Blue Pink (top-bar button or Settings).
- **Simple navigation** — only Today, Tasks, Capture and Focus are shown; everything else sits behind one “More” toggle.

### Restart Button
The Restart Button opens a calming screen: **“It's okay. You can start again.”** It offers four working paths:

1. **Rebuild my day** — preview a realistic plan for the hours you choose, select the blocks you want, then apply only those.
2. **Choose one priority** — rank open tasks with reasons, pick one, and move straight into a tiny first action.
3. **Help me get started** — generate one small action and optionally begin a two-minute session.
4. **Take a breather** — start a five-minute quiet break with no achievement goal.

Nothing is deleted. Unfinished tasks are not moved automatically. The rest of your plan stays exactly as it was.

## Architecture

```
dayflow/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, tasks, capture, planning, focus, insights)
│   │   ├── services/     # scheduler, start assist, ML/duration prediction
│   │   ├── config.py     # environment-driven settings
│   │   ├── db.py         # SQLAlchemy engine/session
│   │   ├── models.py     # relational data models
│   │   ├── schemas.py    # Pydantic request/response schemas
│   │   ├── seed.py       # clearly labelled demo workspace
│   │   └── main.py       # app, CORS, router registration, /api/health
│   ├── tests/smoke.py    # end-to-end API smoke test
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/   # layout, restart overlay, task UI, schedule panels
    │   ├── context/      # global state, theme, focus timer, actions
    │   ├── lib/          # API client, localStorage fallback, utilities
    │   ├── pages/        # dashboard and feature pages
    │   ├── styles/       # pastel design system and responsive layout
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

### Backend
- FastAPI + Uvicorn
- SQLAlchemy 2.x
- Pydantic v2 / pydantic-settings
- JWT auth (PyJWT + bcrypt)
- SQLite by default; set `DATABASE_URL` for PostgreSQL in production
- Pandas + NumPy + scikit-learn for local duration modelling

### Frontend
- React 18 + Vite 6
- React Router
- Custom CSS design system (no utility framework)
- Lucide React icons
- Recharts charts
- Real `localStorage` fallback when the API is unavailable

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

The API is now at `http://127.0.0.1:8010`. Interactive docs are at `/docs`; health is at `/api/health`.

DAYFLOW uses port **8010** so it does not collide with other local services that commonly occupy port 8000. If you need a different port, set `VITE_API_TARGET` in `frontend/.env` to match.

On startup, a clearly labelled demo workspace is created if it does not exist:
- Email: `demo@dayflow.local`
- Password: `demo1234`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5174`. The Vite dev server proxies `/api` to the backend. Port 5174 is used because 5173 is often occupied by another service; use `127.0.0.1` so `localhost` cannot resolve to a different IPv6 listener.

If the backend is not running, the frontend works **offline** and automatically switches to **Local workspace · saved on this device** using a complete `localStorage` implementation. All tasks, scheduling, focus sessions, and Restart actions remain functional. Demo content is labelled in both modes.

### Production build

```bash
cd frontend
npm run build
npm run preview
```

Serve the backend separately and set `VITE_API_BASE` to its absolute API URL if you are not using the dev proxy.

## Deploy (Vercel + Render)

The React app is a static Vite build on Vercel; the FastAPI service runs on Render. Each reads its settings from environment variables.

### 1. Push the project to GitHub

The project is already pushed to `https://github.com/SashaKolhatkar/dayflow` (public, branch `main`). To get it on another machine:

```bash
git clone https://github.com/SashaKolhatkar/dayflow.git
cd dayflow
```

To point a different local copy at your own repo instead, use `git remote set-url origin <your-url>` and `git push -u origin main`.

`.gitignore` excludes `.env` files, the SQLite database, trained models, `node_modules`, `dist`, and local `tools/`. Never commit real secrets.

### 2. Render (API + database)

1. **New → Blueprint** and select the repo. `render.yaml` creates the API service and a free PostgreSQL database.
2. In the service **Environment** tab, set `CORS_ORIGINS` and `FRONTEND_URL` to your real Vercel URL, e.g. `https://dayflow-abc123.vercel.app`. `ALLOWED_HOSTS` defaults to `dayflow-api.onrender.com`; Render's own `RENDER_EXTERNAL_HOSTNAME` is also allowed automatically.
3. Reveal `SECRET_KEY`, `TRAFFIC_SALT`, and `OWNER_SETUP_TOKEN` from the dashboard and store them safely. `OWNER_SETUP_TOKEN` is needed once to create the reserved owner account. The normal Settings form intentionally has no owner-token field; create the owner account once with the API:
   ```bash
   curl -X POST https://<your-service>.onrender.com/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"name":"Owner","email":"sashakolhatkar28@gmail.com","password":"<a strong password>","owner_setup_token":"<the revealed token>"}'
   ```
4. Confirm `https://<your-service>.onrender.com/api/health` returns `{"status":"ok","app":"DAYFLOW"}`.

Render supplies `DATABASE_URL` as `postgres://...`; the backend normalises it to `postgresql+psycopg://`. The free plan sleeps idle services, so the first request after a pause may take a few seconds.

### 3. Vercel (frontend)

1. **Add New → Project** and import the same repo.
2. Set **Root Directory** to `frontend` — the repo contains both apps.
3. Framework preset **Vite**, build command `npm run build`, output directory `dist`.
4. Add the build-time variable `VITE_API_BASE = https://<your-service>.onrender.com/api`.
5. Deploy. `frontend/vercel.json` rewrites client routes to `index.html`, so refreshing `/focus` or `/progress` works.

### 4. Google Calendar (optional)

Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` (`https://<your-service>.onrender.com/api/google/callback`) to the Render environment, and register that exact redirect URI with Google. Set `FRONTEND_URL` to your Vercel URL so the callback returns to the app.

### 5. VS Code

Open this folder in VS Code. Use **Terminal → Run Task…**:
- `Dayflow: Dev (both)` — API + frontend locally
- `Dayflow: Build frontend` — production build
- `Dayflow: Smoke test` — API checks against `127.0.0.1:8010`
- `Dayflow: Verify all` — build then smoke

**F5** starts the API under the debugger. VS Code will offer the extensions listed in `.vscode/extensions.json`. The npm tasks use the bundled `tools/node-v26.13.1-win-x64` on this machine.

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust as needed. Copy `frontend/.env.example` to `frontend/.env` for API/proxy overrides.

Important backend settings:
- `DATABASE_URL` — SQLite by default; use a PostgreSQL URL in production.
- `SECRET_KEY` — required and checked for a long random value when `ENVIRONMENT` is not `local`.
- `ACCESS_TOKEN_EXPIRE_MINUTES` — session lifetime (default 720 minutes / 12 hours).
- `CORS_ORIGINS` — comma-separated allowed origins; wildcard is rejected because credentialed requests are enabled.
- `ALLOWED_HOSTS` — comma-separated host names accepted by the API; set this for your deployment domain.
- `DEMO_SEED_ON_STARTUP` — set to `false` to disable automatic demo data.
- `MODEL_PATH` — where a trained duration model is stored.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — optional Google OAuth credentials. With all three set, **Calendar → Google Calendar → Connect** appears. The redirect URI must be registered with Google and default to `http://127.0.0.1:8010/api/google/callback`. Only `calendar.readonly` is requested; imported events are copies in DAYFLOW and your Google Calendar is never modified. Tokens are encrypted in the local database and deleted/revoked with the account; OAuth uses PKCE.
- `FRONTEND_URL` — where the OAuth callback sends you afterwards (default `http://127.0.0.1:5174`).
- `OWNER_EMAIL` — the reserved account email for the owner traffic dashboard (default `sashakolhatkar28@gmail.com`).
- `OWNER_SETUP_TOKEN` — a long random token required to register that reserved email. Set it in the backend environment before creating the owner account; ordinary users cannot claim the owner email.
- `TRAFFIC_SALT` — required and checked for a long random value when `ENVIRONMENT` is not `local`; it hashes visitor/session tokens before storage.
- `TRAFFIC_RETENTION_DAYS` — traffic rows older than this are pruned automatically (default 180).

Accounts can be created or used from **Settings → Account** (Sign in / Create account) when the backend is running. In offline local mode the workspace stays in the browser and the account buttons explain that a backend is required.

## Scheduling and ML

The scheduler is **rule-based first**. It considers importance, pinned/main priority, deadlines, energy fit, estimated duration, events, preparation/travel buffers, and the hours you actually have available. Every block carries a plain-language reason.

A scikit-learn duration model is only trained after **20 recorded personal sessions**. Until then, predictions are explicitly labelled `rule_based`. After training, predictions are labelled `model_prediction` and show the training count and typical error. DAYFLOW never invents behavioural data and never makes clinical predictions.

## Data, privacy, and export

- Each user's data is scoped to their account.
- Settings include notification preferences, theme, session defaults, and reduced motion.
- **Settings → Download my data (JSON)** exports all tasks, events, routines, logs, sessions, brain dumps, and schedule blocks.
- **Settings → Delete my account and data** permanently removes the account and its related records.

## Music credits

Direct-audio presets use [Kevin MacLeod's *Senbazuru*](https://commons.wikimedia.org/wiki/File:Senbazuru_(ISRC_USUAN1100821).mp3), [Antti Luode's *Simple Piano*](https://commons.wikimedia.org/wiki/File:Simple_Piano_(Antti_Luode).mp3), and [Caden Currie's *Lofi*](https://commons.wikimedia.org/wiki/File:Lofi_by_Caden_Currie.mp3), each under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Attribution is also shown in the music picker and player.

## Verification

With the backend running:

```bash
cd backend
python tests/smoke.py
```

The smoke test checks health, demo login, traffic beacon acceptance, owner-dashboard denial for non-owners, tasks, Start Assist, schedule preview/apply, restart priority/rebuild, insights, duration prediction, and data export. It targets `http://127.0.0.1:8010` by default; override with `DAYFLOW_API_BASE` if you run the backend on a different port.

Frontend build check:

```bash
cd frontend
npm run build
```

## Notes for this workspace

`tools/` contains a portable Node.js runtime used because Node was not initially on `PATH`. It is a local convenience, not an application dependency. If Node is installed normally, use your system `node`/`npm` instead.
