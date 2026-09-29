from dataclasses import dataclass
import os
from dotenv import load_dotenv


# Current production-safe default for the Gemini adapter. Override with LLM_MODEL.
DEFAULT_LLM_PROVIDER = "gemini"
DEFAULT_LLM_MODEL = "gemini-3.8-flash"
DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

load_dotenv()


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


def load_config() -> Config:
    """Load backend configuration from environment variables."""
    load_dotenv(override=True)
    return Config(
        llm_provider=os.getenv("LLM_PROVIDER", DEFAULT_LLM_PROVIDER).strip().lower(),
        llm_model=os.getenv("LLM_MODEL", os.getenv("GROQ_MODEL", DEFAULT_LLM_MODEL)).strip(),
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_base_url=os.getenv("GEMINI_BASE_URL", DEFAULT_GEMINI_BASE_URL).strip().rstrip("/"),
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        history_provider=os.getenv("HISTORY_PROVIDER", "hindsight").strip().lower(),
        hindsight_base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888").strip().rstrip("/"),
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
