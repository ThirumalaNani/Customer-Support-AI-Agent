# Installation & Fresh-Machine Runbook

See the root `Start.md` for the complete copy-pasteable Windows/Linux/macOS runbook.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes when `LLM_PROVIDER=gemini` | Google AI Studio API key for the support agent |
| `LLM_MODEL` | Optional | Support-agent model; defaults to the current configured default |
| `LLM_PROVIDER` | Optional | `gemini` by default; `groq` remains supported |
| `GEMINI_BASE_URL` | Optional | Gemini API base URL |
| `GROQ_API_KEY` | Only when using Groq | Groq API key |
| `GROQ_MODEL` | Legacy fallback | Used only when `LLM_MODEL` is not set and kept for existing environments |
| `HINDSIGHT_BASE_URL` | Yes | Backend-to-Hindsight URL |
| `HINDSIGHT_API_KEY` | Cloud only | Bearer key for Hindsight Cloud/private Hindsight |
| `ADMIN_API_KEY` | Required for backend erase endpoint | Protects destructive Hindsight deletion |
| `HISTORY_PROVIDER` | Optional | `hindsight` |
| `AGENT_NAME` | Optional | Agent display name |
| `AGENT_PERSONA` | Optional | Support-agent system persona |
| `REQUEST_TIMEOUT_SECONDS` | Optional | Backend provider timeout |
| `MAX_RETRIES` | Optional | Provider retry count |
| `ANALYTICS_DB_PATH` | Optional | SQLite telemetry database path |
| `APP_ENV` | Optional | Environment label |
| `HINDSIGHT_API_LLM_PROVIDER` | Optional | Provider used by the supplied Hindsight service |
| `HINDSIGHT_API_LLM_MODEL` | Optional | Model used by the supplied Hindsight service |

The shipped LLM default is Gemini. Provider and model changes are controlled by environment variables; no frontend code change is required.
