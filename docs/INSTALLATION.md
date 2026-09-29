# Installation & Fresh-Machine Runbook

See the root `Start.md` for the complete copy-pasteable Windows/Linux/macOS runbook.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LLM_PROVIDER` | **Yes** | `gemini` or `groq`; no default, startup fails if unset |
| `LLM_MODEL` | **Yes** | Model id served by the chosen provider; no default |
| `GEMINI_API_KEY` | When `LLM_PROVIDER=gemini` | Google AI Studio API key |
| `GEMINI_BASE_URL` | Optional | Gemini API base URL |
| `GROQ_API_KEY` | When `LLM_PROVIDER=groq` | Groq API key |
| `GROQ_MODEL` | Legacy fallback | Used only when `LLM_MODEL` is not set and kept for existing environments |
| `HINDSIGHT_BASE_URL` | **Yes** | Hindsight Cloud URL (`https://api.hindsight.vectorize.io`); no default |
| `HINDSIGHT_API_KEY` | Yes for Hindsight Cloud | Bearer key |
| `ADMIN_API_KEY` | Required for backend erase endpoint | Protects destructive Hindsight deletion |
| `HISTORY_PROVIDER` | Optional | `hindsight` |
| `AGENT_NAME` | Optional | Agent display name |
| `AGENT_PERSONA` | Optional | Support-agent system persona |
| `REQUEST_TIMEOUT_SECONDS` | Optional | Backend provider timeout |
| `MAX_RETRIES` | Optional | Provider retry count |
| `ANALYTICS_DB_PATH` | Optional | SQLite telemetry database path |
| `APP_ENV` | Optional | Environment label |

Providers are swappable: provider and model are controlled entirely by environment variables, and no frontend code change is required.
