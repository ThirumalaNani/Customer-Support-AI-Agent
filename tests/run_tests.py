import asyncio
import os
import sys
import unittest
from pathlib import Path

# — Test environment
# WHY: load_config() fails fast without these; placeholders only, providers are stubbed.
os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("LLM_MODEL", "test-model")
os.environ.setdefault("HINDSIGHT_BASE_URL", "https://hindsight.test")

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import load_config
from core.agent import AgentResponse, SupportAgent, ValidationError
from providers.history import HistoryItem, HistoryProvider
from providers.llm import LLMProvider


class MockLLM(LLMProvider):
    def is_configured(self):
        return True

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        return f"Mock response acknowledging prompt: '{user_prompt}'"


class MockHistory(HistoryProvider):
    def __init__(self):
        self.memories = {}

    async def recall(self, customer_id: str, query: str):
        return [
            HistoryItem(text="Customer previously configured Envoy timeout to 60s"),
            HistoryItem(text="Customer runs Kubernetes cluster on AWS"),
        ]

    async def retain(self, customer_id: str, content: str, *, context: str = "customer_support") -> None:
        self.memories.setdefault(customer_id, []).append(content)

    async def delete(self, customer_id: str) -> int:
        return len(self.memories.pop(customer_id, []))

    async def healthcheck(self) -> bool:
        return True


class TestContextualSupportAgent(unittest.TestCase):
    def setUp(self):
        self.agent = SupportAgent(config=load_config(), llm_provider=MockLLM(), history_provider=MockHistory())

    def test_process_turn_success(self):
        res = asyncio.run(self.agent.process_turn(customer_id="alex_chen", user_message="Check timeout configuration"))
        self.assertIsInstance(res, AgentResponse)
        self.assertIn("Mock response acknowledging prompt", res.response)
        self.assertEqual(len(res.recalled_history), 2)
        self.assertTrue(res.history_retained)
        self.assertEqual(res.customer_id, "alex_chen")

    def test_validation_empty_customer(self):
        with self.assertRaises(ValidationError):
            asyncio.run(self.agent.process_turn(customer_id="", user_message="Hello"))

    def test_validation_empty_message(self):
        with self.assertRaises(ValidationError):
            asyncio.run(self.agent.process_turn(customer_id="alex_chen", user_message="   "))


if __name__ == "__main__":
    unittest.main(verbosity=2)
