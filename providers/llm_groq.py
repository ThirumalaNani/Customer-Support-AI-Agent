import logging
import time
from typing import Optional

from providers.llm import LLMProvider, LLMProviderError

logger = logging.getLogger(__name__)


class GroqLLMProvider(LLMProvider):
    """Adapter for Groq Chat Completions, including GPT-OSS models."""

    _GPT_OSS_MODELS = {
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
    }

    def __init__(self, api_key: str, model: str, timeout_seconds: int = 30, max_retries: int = 2):
        self._api_key = api_key
        self._model = model.strip()
        self._timeout = timeout_seconds
        self._max_retries = max(0, max_retries)
        self._client = None

        if self._api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self._api_key, timeout=float(self._timeout))
            except Exception as exc:
                logger.debug("Groq SDK client not initialized, using HTTP fallback: %s", str(exc))
                self._client = None

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    @property
    def _is_gpt_oss(self) -> bool:
        return self._model.lower() in self._GPT_OSS_MODELS

    def _messages(self, system_prompt: str, user_prompt: str):
        # Groq recommends putting instructions in the user message for GPT-OSS.
        # Keeping the two sections explicit preserves the existing agent persona
        # and Hindsight context without relying on a system-role message.
        if self._is_gpt_oss:
            combined = (
                "SYSTEM INSTRUCTIONS:\n"
                f"{system_prompt.strip()}\n\n"
                "USER REQUEST:\n"
                f"{user_prompt.strip()}"
            )
            return [{"role": "user", "content": combined}]
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _payload(self, messages):
        payload = {
            "model": self._model,
            "messages": messages,
            "max_completion_tokens": 1024,
        }
        if self._is_gpt_oss:
            # GPT-OSS supports tunable reasoning and returns reasoning separately.
            # We only need the final support answer in this application.
            payload.update({
                "reasoning_effort": "medium",
                "include_reasoning": False,
                "temperature": 0.6,
            })
        else:
            payload["temperature"] = 0.3
        return payload

    @staticmethod
    def _sdk_error(exc: Exception) -> LLMProviderError:
        status = getattr(exc, "status_code", None)
        if status == 401:
            return LLMProviderError("Groq authentication failed.", code="authentication", retryable=False)
        if status == 404:
            return LLMProviderError("Groq model is unavailable.", code="model_unavailable", retryable=False)
        if status == 429:
            return LLMProviderError("Groq rate limit exceeded.", code="rate_limited", retryable=True)
        if status == 400:
            return LLMProviderError(
                f"Groq rejected the request: {str(exc)}",
                code="request_rejected",
                retryable=False,
            )
        return LLMProviderError(f"Groq API request failed: {str(exc)}", retryable=True)

    def _parse_response(self, response) -> str:
        if not response or not getattr(response, "choices", None):
            raise LLMProviderError("Empty or malformed response returned by Groq LLM.")

        choice = response.choices[0]
        message = getattr(choice, "message", None)
        if not message:
            raise LLMProviderError("Response choice missing message field from Groq LLM.")

        content = getattr(message, "content", None)
        if content is None or not str(content).strip():
            raise LLMProviderError("No final message content found in Groq LLM response.")
        return str(content).strip()

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        if not self._api_key or not self._api_key.strip():
            raise LLMProviderError(
                "Groq API key is missing or not configured.",
                code="not_configured",
                retryable=False,
            )

        messages = self._messages(system_prompt, user_prompt)
        payload = self._payload(messages)
        last_error: Optional[Exception] = None
        attempts = 1 + self._max_retries

        for attempt in range(1, attempts + 1):
            try:
                if self._client is not None:
                    try:
                        response = self._client.chat.completions.create(**payload)
                        return self._parse_response(response)
                    except Exception as exc:
                        # A stale Groq SDK may not know newer GPT-OSS request fields.
                        # Fall through to the direct OpenAI-compatible HTTP API once.
                        if self._is_gpt_oss:
                            logger.warning(
                                "Groq SDK request failed for %s; trying HTTP compatibility path: %s",
                                self._model,
                                str(exc),
                            )
                        else:
                            raise self._sdk_error(exc) from exc

                import httpx
                headers = {
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                }
                with httpx.Client(timeout=self._timeout) as client:
                    resp = client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json=payload,
                        headers=headers,
                    )

                if resp.status_code == 401:
                    raise LLMProviderError("Groq authentication failed.", code="authentication", retryable=False)
                if resp.status_code == 404:
                    raise LLMProviderError("Groq model is unavailable.", code="model_unavailable", retryable=False)
                if resp.status_code == 429:
                    raise LLMProviderError("Groq rate limit exceeded.", code="rate_limited", retryable=True)
                if resp.status_code == 400:
                    detail = resp.text[:500]
                    raise LLMProviderError(
                        f"Groq rejected the request: {detail}",
                        code="request_rejected",
                        retryable=False,
                    )
                if resp.status_code >= 500:
                    raise LLMProviderError(
                        f"Groq service error ({resp.status_code}).",
                        code="upstream_unavailable",
                        retryable=True,
                    )
                if resp.status_code >= 400:
                    raise LLMProviderError(f"Groq API error ({resp.status_code}).", retryable=False)

                data = resp.json()
                choices = data.get("choices", [])
                if not choices:
                    raise LLMProviderError("Groq API returned an empty choices list.")
                message_obj = choices[0].get("message", {})
                content = message_obj.get("content", "")
                if not str(content).strip():
                    raise LLMProviderError("Groq API returned no final message content.")
                return str(content).strip()

            except LLMProviderError as exc:
                if not exc.retryable:
                    raise
                last_error = exc
                logger.warning("Groq completion attempt %d/%d failed: %s", attempt, attempts, str(exc))
            except Exception as exc:
                last_error = exc
                logger.warning("Groq network/unexpected attempt %d/%d failed: %s", attempt, attempts, str(exc))

            if attempt < attempts:
                time.sleep(0.5 * attempt)

        raise LLMProviderError(
            f"Groq provider request failed after {attempts} attempts. Error: {str(last_error)}"
        )
