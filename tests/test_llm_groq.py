from types import SimpleNamespace

from providers.llm import LLMProviderError
from providers.llm_groq import GroqLLMProvider


def test_gpt_oss_uses_groq_compatible_payload():
    provider = GroqLLMProvider(api_key="key", model="openai/gpt-oss-120b")
    messages = provider._messages("Be helpful.", "Hello")
    payload = provider._payload(messages)

    assert messages == [{
        "role": "user",
        "content": "SYSTEM INSTRUCTIONS:\nBe helpful.\n\nUSER REQUEST:\nHello",
    }]
    assert payload["model"] == "openai/gpt-oss-120b"
    assert payload["reasoning_effort"] == "medium"
    assert payload["include_reasoning"] is False
    assert payload["max_completion_tokens"] == 1024
    assert payload["temperature"] == 0.6


def test_gpt_oss_response_parsing():
    provider = GroqLLMProvider(api_key="key", model="openai/gpt-oss-120b")
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="  Hello from Groq.  "))]
    )
    assert provider._parse_response(response) == "Hello from Groq."


def test_groq_model_404_is_model_unavailable(monkeypatch):
    class FakeResponse:
        status_code = 404
        text = "model not found"

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("httpx.Client", FakeClient)
    provider = GroqLLMProvider(api_key="key", model="openai/gpt-oss-120b")
    provider._client = None

    try:
        provider.complete("system", "hello")
    except LLMProviderError as exc:
        assert exc.code == "model_unavailable"
        assert exc.retryable is False
    else:
        raise AssertionError("Expected model_unavailable")
