import time
import logging
from typing import Optional
from providers.llm import LLMProvider, LLMProviderError

logger = logging.getLogger(__name__)

class GroqLLMProvider(LLMProvider):
    """Adapter for Groq LLM API."""

    def __init__(self, api_key: str, model: str, timeout_seconds: int = 30, max_retries: int = 2):
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_seconds
        self._max_retries = max_retries
        self._client = None
        
        if self._api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self._api_key, timeout=float(self._timeout))
            except Exception as e:
                logger.debug("Groq SDK client not initialized, using HTTP fallback: %s", str(e))
                self._client = None

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        if not self._api_key or not self._api_key.strip():
            raise LLMProviderError(
                "Groq API key is missing or not configured.",
                code="not_configured",
                retryable=False,
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        last_error: Optional[Exception] = None
        attempts = 1 + max(0, self._max_retries)

        for attempt in range(1, attempts + 1):
            try:
                # Primary method: Groq SDK
                if self._client is not None:
                    response = self._client.chat.completions.create(
                        model=self._model,
                        messages=messages,
                        temperature=0.3,
                        max_tokens=1024,
                    )
                    
                    if not response or not hasattr(response, "choices") or not response.choices:
                        raise LLMProviderError("Empty or malformed response returned by Groq LLM.")
                    
                    choice = response.choices[0]
                    if not hasattr(choice, "message") or not choice.message:
                        raise LLMProviderError("Response choice missing message field from Groq LLM.")
                    
                    content = getattr(choice.message, "content", None)
                    if content is None:
                        raise LLMProviderError("No message content found in Groq LLM response.")
                    
                    return content.strip()

                # Fallback method: Direct HTTP via httpx
                import httpx
                headers = {
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": self._model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1024,
                }
                with httpx.Client(timeout=self._timeout) as client:
                    resp = client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json=payload,
                        headers=headers,
                    )
                    if resp.status_code == 401:
                        raise LLMProviderError("Groq authentication failed.", code="authentication", retryable=False)
                    if resp.status_code == 429:
                        raise LLMProviderError("Groq rate limit exceeded.", code="rate_limited", retryable=True)
                    if resp.status_code >= 400:
                        raise LLMProviderError(f"Groq API error ({resp.status_code}): {resp.text}")

                    data = resp.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise LLMProviderError("Groq API returned an empty choices list.")
                    message_obj = choices[0].get("message", {})
                    content = message_obj.get("content", "")
                    return content.strip()

            except LLMProviderError as e:
                # Don't retry on client auth errors
                if "authentication failed" in str(e).lower() or "missing or not configured" in str(e).lower():
                    raise e
                last_error = e
                logger.warning("Groq completion attempt %d/%d failed: %s", attempt, attempts, str(e))
            except Exception as e:
                last_error = e
                logger.warning("Groq network/unexpected attempt %d/%d failed: %s", attempt, attempts, str(e))

            if attempt < attempts:
                time.sleep(0.5 * attempt)

        raise LLMProviderError(
            f"Groq provider request failed after {attempts} attempts. Error: {str(last_error)}"
        )
