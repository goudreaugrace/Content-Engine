# Content Creation Agent — POC

Multi-agent orchestration for drafting MyPepsiCo Knowledge Articles and Topic Pages.

## Stack

- React + TypeScript + Vite + Material UI (frontend)
- Express + Anthropic SDK (backend)
- JSON files for storage (POC only)

## Setup

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

npm install
npm run dev
```

Frontend: http://localhost:5173
Backend:  http://localhost:3001

## Current Status (Step 1: Initial UI)

- [x] App shell with MUI theme + sidebar navigation
- [x] New Request page (Guided wizard + Chat panel)
- [x] Placeholder pages (Jobs, Admin > Markets, Admin > Emails)
- [x] Minimal Express server
- [ ] Agent orchestration (Intake → Clarifier → Router → Market → Compliance → Publisher)
- [ ] Market profile editor
- [ ] Stubbed email log

## Architecture

```
User submits → Intake Agent → (Clarifier email if incomplete)
                          ↓
                     Router Agent → Market Agent ─┐
                                                  ├─► Compliance Agent (parallel)
                                                  ↓
                                            Publisher Agent
```

Markets supported in POC: **US** (en-US), **Mexico** (es-MX).
