from config import Config
from providers.llm import LLMProvider
from providers.llm_gemini import GeminiLLMProvider
from providers.llm_groq import GroqLLMProvider
from providers.history import HistoryProvider
from providers.history_hindsight import HindsightHistoryProvider


def get_llm_provider(config: Config) -> LLMProvider:
    provider = config.llm_provider.lower()
    if provider == "gemini":
        return GeminiLLMProvider(
            api_key=config.gemini_api_key,
            model=config.llm_model,
            base_url=config.gemini_base_url,
            timeout_seconds=config.request_timeout_seconds,
            max_retries=config.max_retries,
        )
    if provider == "groq":
        return GroqLLMProvider(
            api_key=config.groq_api_key,
            model=config.llm_model,
            timeout_seconds=config.request_timeout_seconds,
            max_retries=config.max_retries,
        )
    raise ValueError(f"Unknown LLM provider: {config.llm_provider}")


def get_history_provider(config: Config) -> HistoryProvider:
    if config.history_provider.lower() == "hindsight":
        return HindsightHistoryProvider(
            base_url=config.hindsight_base_url,
            api_key=config.hindsight_api_key,
            timeout_seconds=config.request_timeout_seconds,
            max_retries=config.max_retries,
        )
    raise ValueError(f"Unknown history provider: {config.history_provider}")
