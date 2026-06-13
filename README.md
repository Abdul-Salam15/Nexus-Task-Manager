# Nexus Task Manager

Nexus is a task manager with auto-scheduling, productivity analytics, and AI-powered recommendations. It started as a Claude Design prototype (see `project/` and `chats/` for the original design handoff and iteration history) and has been implemented as a full-stack app.

## Stack

- **Frontend** — React 18 + TypeScript + Vite + Tailwind CSS + Zustand (`frontend/`)
- **Backend** — Express + better-sqlite3 + JWT auth (`backend/`)

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:3001` and stores data in `backend/data/nexus.db` (created automatically).

Optional: set `GEMINI_API_KEY` in `.env` to enable AI-generated recommendations (`/api/recommendations/generate`). Without it, the endpoint falls back to built-in heuristics.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on Vite's default port and proxies `/api` to `http://localhost:3001`.

### Demo account

- Email: `demo@nexus.io`
- Password: `Demo!2026`

New signups are seeded with the default categories (Work, Personal, Academic) and a starter set of sample tasks, so the app isn't empty on first login.

## Project layout

```
backend/    Express API (auth, tasks, categories, notifications, activity, recommendations)
frontend/   React app
chats/      Original Claude Design conversation transcripts (historical reference)
project/    Original HTML prototype + design handoff notes (historical reference)
```
