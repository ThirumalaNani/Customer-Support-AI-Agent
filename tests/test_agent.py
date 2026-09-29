import asyncio
import pytest

from config import load_config
from core.agent import AgentResponse, SupportAgent, ValidationError
from providers.history import HistoryItem, HistoryProvider, HistoryProviderError
from providers.llm import LLMProvider


class MockLLM(LLMProvider):
    def is_configured(self) -> bool:
        return True

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        return f"Mock response acknowledging prompt: '{user_prompt}'"


class MockHistory(HistoryProvider):
    def __init__(self, recalled=None, fail_recall=False, fail_retain=False):
        self.memories = {}
        self.recalled = recalled if recalled is not None else [
            HistoryItem(text="Customer previously configured Envoy timeout to 60s"),
            HistoryItem(text="Customer runs Kubernetes cluster on AWS"),
        ]
        self.fail_recall = fail_recall
        self.fail_retain = fail_retain

    async def recall(self, customer_id: str, query: str):
        if self.fail_recall:
            raise HistoryProviderError("unavailable")
        return list(self.recalled)

    async def retain(self, customer_id: str, content: str, *, context: str = "customer_support") -> None:
        if self.fail_retain:
            raise RuntimeError("retain failed")
        self.memories.setdefault(customer_id, []).append(content)

    async def delete(self, customer_id: str) -> int:
        return len(self.memories.pop(customer_id, []))

    async def healthcheck(self) -> bool:
        return True


def test_agent_process_turn_success():
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=MockHistory())
    res = asyncio.run(agent.process_turn(customer_id="alex_chen", user_message="Check timeout configuration"))
    assert isinstance(res, AgentResponse)
    assert "Mock response acknowledging prompt" in res.response
    assert len(res.recalled_history) == 2
    assert res.history_retained is True
    assert res.customer_id == "alex_chen"


def test_agent_memory_off_skips_recall_and_retain():
    hist = MockHistory()
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=hist)
    res = asyncio.run(agent.process_turn(customer_id="alex_chen", user_message="Check timeout configuration", memory_enabled=False))
    assert res.memory_enabled is False
    assert res.recall_source == "disabled"
    assert res.recalled_history == []
    assert res.history_retained is False
    assert hist.memories == {}


def test_agent_retention_is_not_raw_assistant_answer():
    hist = MockHistory()
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=hist)
    asyncio.run(agent.process_turn(customer_id="alex_chen", user_message="[File: error.pdf (10 KB)] We need help."))
    retained = hist.memories["alex_chen"][0]
    assert "Agent replied:" not in retained
    assert "[File:" not in retained
    assert "We need help." in retained


def test_agent_validation_empty_customer():
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=MockHistory())
    with pytest.raises(ValidationError):
        asyncio.run(agent.process_turn(customer_id="", user_message="Hello"))


def test_agent_validation_empty_message():
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=MockHistory())
    with pytest.raises(ValidationError):
        asyncio.run(agent.process_turn(customer_id="alex_chen", user_message="   "))


def test_empty_history_is_honest():
    agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=MockHistory(recalled=[]))
    res = asyncio.run(agent.process_turn(customer_id="new_customer_01", user_message="Hello"))
    assert res.recalled_history == []
    assert res.history_retained is True
