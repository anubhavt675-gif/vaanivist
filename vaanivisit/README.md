# Clario — Evidence-Backed Multilingual Patient Intake AI

Production web application built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **React Router v7**, and **Supabase Realtime**.

---

## Architecture Overview

- **Frontend Client (`src/`)**: Pure React 19 SPA running on Vite with route-based code-splitting and Suspense.
- **Backend API Server (`server/`)**: Express API with Google Gemini 3.5 Flash Lite clinical extraction, SHA-256 evidence validation, and Supabase database CRUD operations.
- **Database & Realtime (`supabase/`)**: Live PostgreSQL database on Supabase with 6 clinical migrations and real-time WebSocket state synchronization.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Run the backend server and Vite frontend concurrently (or in two terminal tabs):

**Terminal 1 — Backend API:**
```bash
npm run server
```
*(Runs on `http://localhost:3001`)*

**Terminal 2 — Vite Dev Server:**
```bash
npm run dev
```
*(Runs on `http://localhost:3000` with automatic `/api` proxying to backend)*

---

### 3. Build & Run for Production
```bash
npm run build
npm start
```
*(Compiles optimized client bundles to `dist/` and serves both the static SPA and `/api` routes on port `3001`)*

---

## Verifying Real-Time & Backend Functionality

To run the automated verification suite testing live Supabase queries, Gemini extraction, reviewer approvals, and export gating:

```bash
node server/test_e2e.mjs
```
