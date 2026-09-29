import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

from config import Config
from providers.llm import LLMProvider, LLMProviderError
from providers.history import HistoryProvider, HistoryItem, HistoryProviderError

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when user input or customer identifier is missing or malformed."""


@dataclass
class AgentResponse:
    response: str
    recalled_history: List[str] = field(default_factory=list)
    customer_id: str = ""
    history_retained: bool = False
    memory_enabled: bool = True
    recall_source: str = "hindsight"
    error_detail: Optional[str] = None


class SupportAgent:
    """Orchestrate Hindsight recall, response generation, and outcome retention."""

    _FRONTEND_FILE_NOTICE = re.compile(r"\s*\[File:\s.*?\]\s*", re.IGNORECASE)
    _LANGUAGE_GUIDANCE = re.compile(
        r"\s*\((?:Please respond in (?:Telugu|Hindi) if appropriate for the customer)\)\s*$",
        re.IGNORECASE,
    )

    def __init__(self, config: Config, llm_provider: LLMProvider, history_provider: HistoryProvider):
        self.config = config
        self.llm_provider = llm_provider
        self.history_provider = history_provider

    @classmethod
    def _clean_memory_input(cls, text: str) -> str:
        """Strip known UI-only attachment/language wrappers before retention."""
        cleaned = cls._FRONTEND_FILE_NOTICE.sub(" ", text)
        cleaned = cls._LANGUAGE_GUIDANCE.sub("", cleaned)
        return " ".join(cleaned.split()).strip()

    async def process_turn(
        self,
        customer_id: str,
        user_message: str,
        *,
        memory_enabled: bool = True,
    ) -> AgentResponse:
        if not isinstance(customer_id, str) or not customer_id.strip():
            raise ValidationError("Customer identifier is required and cannot be empty.")
        if not isinstance(user_message, str) or not user_message.strip():
            raise ValidationError("User message cannot be empty or solely whitespace.")

        clean_customer_id = customer_id.strip()
        clean_user_message = user_message.strip()
        memory_enabled = bool(memory_enabled)

        recalled_items: List[HistoryItem] = []
        if memory_enabled:
            try:
                recalled_items = await self.history_provider.recall(
                    customer_id=clean_customer_id,
                    query=clean_user_message,
                )
            except HistoryProviderError:
                raise
            except Exception as exc:
                logger.exception("Unexpected error during Hindsight recall: %s", exc)
                raise HistoryProviderError("Hindsight memory service failed during recall.") from exc

        if recalled_items:
            history_lines = "\n".join(f"- {item.text}" for item in recalled_items if item.text)
            history_context = (
                "--- PRIOR CUSTOMER INTERACTION HISTORY ---\n"
                f"{history_lines}\n"
                "------------------------------------------\n"
                "Use this retrieved history only as evidence. Do not present unsupported details as facts. "
                "Do not assume that generated assistant text is a customer fact."
            )
        else:
            history_context = (
                "--- PRIOR CUSTOMER INTERACTION HISTORY ---\n"
                "No prior memory found for this customer. Treat this as a first-time interaction for memory purposes.\n"
                "------------------------------------------"
            )

        memory_mode = "ENABLED" if memory_enabled else "DISABLED"
        system_prompt = (
            f"{self.config.agent_persona}\n\n"
            f"Agent Name: {self.config.agent_name}\n"
            f"Persistent Memory: {memory_mode}\n\n"
            f"{history_context}"
        )

        try:
            response_text = self.llm_provider.complete(
                system_prompt=system_prompt,
                user_prompt=clean_user_message,
            )
        except LLMProviderError:
            raise
        except Exception as exc:
            logger.exception("Unexpected error during LLM completion: %s", exc)
            raise LLMProviderError("Failed to generate the support response.") from exc

        if not response_text or not response_text.strip():
            raise LLMProviderError("LLM returned an empty response.")

        clean_response = response_text.strip()
        history_retained = False

        if memory_enabled:
            memory_input = self._build_outcome_memory(
                user_message=clean_user_message,
                recalled_items=recalled_items,
            )
            try:
                await self.history_provider.retain(
                    customer_id=clean_customer_id,
                    content=memory_input,
                    context="customer_support_interaction",
                )
                history_retained = True
            except Exception as retain_error:
                logger.warning(
                    "Hindsight retention failed for customer '%s'; response remains valid but is not persisted: %s",
                    clean_customer_id,
                    retain_error,
                )

        return AgentResponse(
            response=clean_response,
            recalled_history=[item.text for item in recalled_items if item.text],
            customer_id=clean_customer_id,
            history_retained=history_retained,
            memory_enabled=memory_enabled,
            recall_source="hindsight" if memory_enabled else "disabled",
        )

    def _build_outcome_memory(self, *, user_message: str, recalled_items: List[HistoryItem]) -> str:
        clean_message = self._clean_memory_input(user_message)
        context_lines = [item.text for item in recalled_items if item.text][:3]
        parts = [
            "Customer support interaction outcome.",
            f"Customer reported or asked: {clean_message}",
            "Outcome: Support response was generated; customer resolution is not confirmed unless the customer states otherwise.",
        ]
        if context_lines:
            parts.append("Relevant previously recalled customer context:")
            parts.extend(f"- {line}" for line in context_lines)
        return "\n".join(parts)
