import logging
import time
from typing import Optional

import httpx

from providers.llm import LLMProvider, LLMProviderError

logger = logging.getLogger(__name__)


class GeminiLLMProvider(LLMProvider):
    """Adapter for Google's Gemini API using the stable REST interface."""

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: int = 30,
        max_retries: int = 2,
    ):
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = float(timeout_seconds)
        self._max_retries = max(0, max_retries)

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_key.strip() and self._model and self._model.strip())

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        if not self._api_key or not self._api_key.strip():
            raise LLMProviderError(
                "Gemini API key is missing or not configured.",
                code="not_configured",
                retryable=False,
            )
        if not self._model or not self._model.strip():
            raise LLMProviderError(
                "Gemini model is missing or not configured.",
                code="not_configured",
                retryable=False,
            )

        url = f"{self._base_url}/models/{self._model}:generateContent"
        headers = {
            "x-goog-api-key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1024,
            },
        }

        last_error: Optional[Exception] = None
        attempts = 1 + self._max_retries

        for attempt in range(1, attempts + 1):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    response = client.post(url, headers=headers, json=payload)

                if response.status_code in (401, 403):
                    raise LLMProviderError(
                        "Gemini authentication failed.",
                        code="authentication",
                        retryable=False,
                    )
                if response.status_code == 404:
                    raise LLMProviderError(
                        "The configured Gemini model is unavailable.",
                        code="model_unavailable",
                        retryable=False,
                    )
                if response.status_code == 429:
                    raise LLMProviderError(
                        "Gemini rate limit or quota was reached.",
                        code="rate_limited",
                        retryable=True,
                    )
                if response.status_code >= 500:
                    raise LLMProviderError(
                        "Gemini service is temporarily unavailable.",
                        code="upstream_unavailable",
                        retryable=True,
                    )
                if response.status_code >= 400:
                    raise LLMProviderError(
                        "Gemini rejected the completion request.",
                        code="request_rejected",
                        retryable=False,
                    )

                data = response.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    prompt_feedback = data.get("promptFeedback") or {}
                    block_reason = prompt_feedback.get("blockReason")
                    detail = "Gemini returned no response candidates."
                    if block_reason:
                        detail = f"Gemini blocked the request ({block_reason})."
                    raise LLMProviderError(detail, code="empty_response", retryable=False)

                parts = (candidates[0].get("content") or {}).get("parts") or []
                content = "\n".join(
                    str(part.get("text", "")).strip()
                    for part in parts
                    if isinstance(part, dict) and part.get("text")
                ).strip()
                if not content:
                    finish_reason = candidates[0].get("finishReason")
                    raise LLMProviderError(
                        "Gemini returned an empty completion response."
                        + (f" Finish reason: {finish_reason}." if finish_reason else ""),
                        code="empty_response",
                        retryable=False,
                    )
                return content

            except LLMProviderError as exc:
                last_error = exc
                logger.warning(
                    "Gemini completion attempt %d/%d failed: %s",
                    attempt,
                    attempts,
                    str(exc),
                )
                if not exc.retryable:
                    raise
            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning("Gemini timeout on attempt %d/%d", attempt, attempts)
                if attempt == attempts:
                    raise LLMProviderError(
                        "Gemini request timed out.",
                        code="timeout",
                        retryable=True,
                    ) from exc
            except (httpx.NetworkError, httpx.RemoteProtocolError) as exc:
                last_error = exc
                logger.warning("Gemini network error on attempt %d/%d: %s", attempt, attempts, str(exc))
                if attempt == attempts:
                    raise LLMProviderError(
                        "Gemini network request failed.",
                        code="network_error",
                        retryable=True,
                    ) from exc
            except (ValueError, TypeError) as exc:
                last_error = exc
                logger.warning("Gemini response parsing failed: %s", str(exc))
                raise LLMProviderError(
                    "Gemini returned an invalid response.",
                    code="invalid_response",
                    retryable=False,
                ) from exc
            except Exception as exc:
                last_error = exc
                logger.warning("Unexpected Gemini error on attempt %d/%d: %s", attempt, attempts, str(exc))
                if attempt == attempts:
                    raise LLMProviderError(
                        "Gemini provider request failed.",
                        code="provider_error",
                        retryable=True,
                    ) from exc

            if attempt < attempts:
                time.sleep(0.5 * attempt)

        raise LLMProviderError(
            f"Gemini provider request failed after {attempts} attempts.",
            code=getattr(last_error, "code", "provider_error"),
            retryable=True,
        )
