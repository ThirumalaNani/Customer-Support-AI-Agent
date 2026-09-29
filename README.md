# Contextual Support Agent

This repository contains the FastAPI backend for a Hindsight-powered customer-support agent. The backend keeps customer memory in Hindsight, recalls it before response generation, records real operational telemetry, accepts feedback learning signals, and supports destructive memory erasure through Hindsight.

## Backend architecture

```text
Client / existing UI
        |
        v
FastAPI (app.py)
   |            |
   v            v
SupportAgent   AnalyticsStore (SQLite)
   |      |
   |      +--> Configured LLM (Gemini by default)
   +---------> Hindsight HTTP API
```

## Hindsight usage

The request path is **Recall → Context → Response → Retain**. A memory-enabled request first calls Hindsight recall for the customer's bank. Only those real results are placed in the prompt. After the answer is generated, the backend retains a concise interaction outcome rather than the raw assistant answer.

Feedback can add a customer-confirmed outcome or correction to the same Hindsight bank. Memory deletion calls Hindsight directly and returns the deletion count.

A customer with no Hindsight history remains an empty memory state. There is no `DEMO_MEMORIES`, fake history fallback, hardcoded recall score, or fake analytics fallback in the backend.

## Environment

Copy `.env.example` to `.env`.

The canonical application model variable is `LLM_MODEL`. The default provider is Gemini with the current stable `gemini-3.8-flash` model; Groq remains available as an alternate provider.

For Hindsight Cloud (the supported deployment in this change set):

```ini
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your-hindsight-cloud-key
```

The backend sends authenticated Recall/Retain/Delete/health requests directly to Hindsight Cloud.

## Local setup

Python 3.11+ and Node.js 20+ are recommended. Docker Desktop is optional when using Hindsight Cloud. The frontend is built from the same repository and surfaces live LLM readiness and actionable retry states.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Windows CMD:

```cmd
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
```

Linux/macOS:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Run with Hindsight Cloud and Docker Compose

Create `.env` from `.env.example` and set `GEMINI_API_KEY`, `LLM_MODEL`, `HINDSIGHT_BASE_URL`, `HINDSIGHT_API_KEY`, and `ADMIN_API_KEY`.

```bash
docker compose up -d --build
```

The Compose file starts **only the FastAPI backend**. Hindsight remains in Hindsight Cloud; there is no local Hindsight container and no `localhost:8888` dependency.

Backend API: `http://127.0.0.1:8000`
API docs: `http://127.0.0.1:8000/docs`
Health: `http://127.0.0.1:8000/health`

## Run the backend

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

API docs: `http://127.0.0.1:8000/docs`

## Seed realistic Hindsight memory

With Hindsight reachable:

```bash
python seed_history.py
```

The records are written into real Hindsight banks (`alex_chen`, `priya_patel`, `marcus_vance`). Nothing is seeded into frontend local storage.

## Analytics

Use:

```text
GET /api/analytics
GET /api/analytics/export
```

Analytics comes from backend telemetry plus live Hindsight fact counts. Missing information is represented by `null`, not demo values.

## Tests

```bash
python -m pytest tests/ -v
```

The test suite covers recall, retain, empty history, provider failure, LLM failure, memory OFF, feedback, deletion, health, validation/security, and analytics empty states.

## Security notes

Customer IDs are restricted to safe path identifiers and are URL-path encoded before Hindsight requests. Backend memory erasure requires `ADMIN_API_KEY`; the key is never sent to the browser. Raw provider failures are logged server-side and replaced with stable customer-safe error messages.

The existing frontend remains untouched in this backend-only change set. Its current local-only feedback, local demo analytics, and local admin PIN behavior therefore remain frontend concerns until a separate frontend patch wires them to these backend endpoints.
