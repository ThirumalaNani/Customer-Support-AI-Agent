from dataclasses import dataclass
import os
from dotenv import load_dotenv


# — Constants
# WHY: Only a transport endpoint has a built-in fallback. No provider or model
# is assumed anywhere in code: providers are swappable and chosen purely by
# environment. Do not reintroduce a default provider/model without asking.
DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

load_dotenv()


# — ConfigError
class ConfigError(RuntimeError):
    """Raised at startup when a required setting is missing."""


# — Config
@dataclass
class Config:
    llm_provider: str
    llm_model: str
    gemini_api_key: str
    gemini_base_url: str
    groq_api_key: str
    history_provider: str
    hindsight_base_url: str
    hindsight_api_key: str
    agent_name: str
    agent_persona: str
    request_timeout_seconds: int
    max_retries: int
    analytics_db_path: str
    admin_api_key: str
    app_env: str


# — load_config
def load_config() -> Config:
    """Load backend configuration from environment variables."""
    load_dotenv(override=True)

    # — Required settings (fail fast)
    # WHY: Provider, model and Hindsight URL used to silently fall back to
    # hard-coded values, which hid misconfiguration (e.g. talking to a local
    # Hindsight or a model nobody chose). Missing values now stop startup with
    # a clear message. GROQ_MODEL stays as a legacy fallback for LLM_MODEL.
    llm_provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    llm_model = (os.getenv("LLM_MODEL") or os.getenv("GROQ_MODEL") or "").strip()
    hindsight_base_url = os.getenv("HINDSIGHT_BASE_URL", "").strip().rstrip("/")

    missing = [
        name
        for name, value in (
            ("LLM_PROVIDER", llm_provider),
            ("LLM_MODEL", llm_model),
            ("HINDSIGHT_BASE_URL", hindsight_base_url),
        )
        if not value
    ]
    if missing:
        raise ConfigError(
            "Missing required environment variable(s): "
            + ", ".join(missing)
            + ". Set them in .env (see .env.example)."
        )

    # — Optional settings
    # WHY: API keys are deliberately NOT required at load time. A missing key
    # must surface through /health and /api/status as "degraded"/"not_configured"
    # so the frontend recovery UI can guide the user. Do not turn these into
    # startup errors without checking that flow first.
    return Config(
        llm_provider=llm_provider,
        llm_model=llm_model,
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_base_url=os.getenv("GEMINI_BASE_URL", DEFAULT_GEMINI_BASE_URL).strip().rstrip("/"),
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        history_provider=os.getenv("HISTORY_PROVIDER", "hindsight").strip().lower(),
        hindsight_base_url=hindsight_base_url,
        hindsight_api_key=os.getenv("HINDSIGHT_API_KEY", "").strip(),
        agent_name=os.getenv("AGENT_NAME", "Support Assistant").strip(),
        agent_persona=os.getenv(
            "AGENT_PERSONA",
            "You are a helpful, concise customer support agent.",
        ).strip(),
        request_timeout_seconds=max(1, int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30").strip())),
        max_retries=max(0, int(os.getenv("MAX_RETRIES", "2").strip())),
        analytics_db_path=os.getenv("ANALYTICS_DB_PATH", "data/analytics.sqlite3").strip(),
        admin_api_key=os.getenv("ADMIN_API_KEY", "").strip(),
        app_env=os.getenv("APP_ENV", "development").strip().lower(),
    )
