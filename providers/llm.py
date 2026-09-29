from abc import ABC, abstractmethod
from typing import Optional


class LLMProviderError(Exception):
    """Raised when an LLM provider encounters a provider-side failure."""

    def __init__(self, message: str, *, code: str = "provider_error", retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a completion response given a system prompt and user prompt."""
        raise NotImplementedError

    @abstractmethod
    def is_configured(self) -> bool:
        """Return whether required local configuration is present."""
        raise NotImplementedError
