from config import Config
from providers.factory import get_llm_provider
from providers.llm import LLMProviderError
from providers.llm_gemini import GeminiLLMProvider


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def post(self, url, headers, json):
        self.calls.append((url, headers, json))
        return self.response


def test_gemini_missing_key_is_stable_error():
    provider = GeminiLLMProvider(
        api_key="",
        model="gemini-3.8-flash",
        base_url="https://generativelanguage.googleapis.com/v1beta",
    )
    assert provider.is_configured() is False
    try:
        provider.complete("system", "hello")
    except LLMProviderError as exc:
        assert exc.code == "not_configured"
        assert exc.retryable is False
    else:
        raise AssertionError("Expected LLMProviderError")


def test_gemini_response_parsing(monkeypatch):
    response = FakeResponse(
        payload={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Hello"},
                            {"text": "from Gemini."},
                        ]
                    }
                }
            ]
        }
    )
    fake_client = FakeClient(response)
    monkeypatch.setattr("providers.llm_gemini.httpx.Client", lambda *args, **kwargs: fake_client)

    provider = GeminiLLMProvider(
        api_key="key",
        model="gemini-3.8-flash",
        base_url="https://generativelanguage.googleapis.com/v1beta",
    )
    result = provider.complete("system", "hello")

    assert result == "Hello\nfrom Gemini."
    assert fake_client.calls[0][0].endswith("/models/gemini-3.8-flash:generateContent")
    assert fake_client.calls[0][1]["x-goog-api-key"] == "key"


def test_factory_selects_gemini_adapter():
    config = Config(
        llm_provider="gemini",
        llm_model="gemini-3.8-flash",
        gemini_api_key="key",
        gemini_base_url="https://generativelanguage.googleapis.com/v1beta",
        groq_api_key="",
        history_provider="hindsight",
        hindsight_base_url="https://api.hindsight.vectorize.io",
        hindsight_api_key="key",
        agent_name="Support Assistant",
        agent_persona="Helpful support agent.",
        request_timeout_seconds=30,
        max_retries=2,
        analytics_db_path="data/analytics.sqlite3",
        admin_api_key="admin",
        app_env="test",
    )
    provider = get_llm_provider(config)
    assert isinstance(provider, GeminiLLMProvider)
