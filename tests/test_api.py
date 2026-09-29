import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module
from config import Config
from providers.history import HistoryItem, HistoryProvider, HistoryProviderError
from services.analytics_store import AnalyticsStore


class FakeHistory(HistoryProvider):
    def __init__(self, recalled=None, healthy=True):
        self.recalled = recalled or []
        self.healthy = healthy
        self.retained = []
        self.deleted = []

    async def recall(self, customer_id: str, query: str):
        return list(self.recalled)

    async def retain(self, customer_id: str, content: str, *, context: str = "customer_support"):
        self.retained.append((customer_id, content, context))

    async def delete(self, customer_id: str) -> int:
        self.deleted.append(customer_id)
        return 2

    async def healthcheck(self) -> bool:
        return self.healthy

    async def analytics_summary(self):
        return {"bank_count": 2, "fact_count": 5}


class FailingHistory(FakeHistory):
    async def recall(self, customer_id: str, query: str):
        raise HistoryProviderError("provider down")


class FakeLLM:
    def is_configured(self):
        return True

    def complete(self, system_prompt, user_prompt):
        return "Support response"


class FailingLLM(FakeLLM):
    def complete(self, system_prompt, user_prompt):
        from providers.llm import LLMProviderError
        raise LLMProviderError("llm provider down")


def install_test_dependencies(tmp_path: Path, history=None, llm=None):
    app_module.history_provider = history or FakeHistory()
    app_module.llm_provider = llm or FakeLLM()
    app_module.agent.history_provider = app_module.history_provider
    app_module.agent.llm_provider = app_module.llm_provider
    app_module.analytics_store = AnalyticsStore(str(tmp_path / "analytics.sqlite3"))
    return TestClient(app_module.app)


def test_health_endpoint(tmp_path, monkeypatch):
    client = install_test_dependencies(tmp_path)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["hindsight"] == "connected"
    assert data["llm"] == "configured"


def test_health_degraded_when_hindsight_unavailable(tmp_path):
    client = install_test_dependencies(tmp_path, history=FakeHistory(healthy=False))
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["hindsight"] == "unavailable"


def test_system_status_endpoint(tmp_path):
    client = install_test_dependencies(tmp_path)
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"


def test_customers_endpoint(tmp_path):
    client = install_test_dependencies(tmp_path)
    response = client.get("/api/customers")
    assert response.status_code == 200
    data = response.json()
    assert "customers" in data
    alex = next(c for c in data["customers"] if c["id"] == "alex_chen")
    assert alex["name"] == "Alex Chen"


def test_chat_validation_missing_customer_id(tmp_path):
    client = install_test_dependencies(tmp_path)
    response = client.post("/api/chat", json={"customer_id": "", "message": "Hello"})
    assert response.status_code == 400


def test_customer_id_path_validation(tmp_path):
    client = install_test_dependencies(tmp_path)
    response = client.get("/api/history/../../secrets")
    assert response.status_code in (400, 404)


def test_chat_records_real_telemetry(tmp_path):
    history = FakeHistory(recalled=[HistoryItem(text="Envoy timeout is 60s")])
    client = install_test_dependencies(tmp_path, history=history)
    response = client.post(
        "/api/chat",
        json={"customer_id": "alex_chen", "message": "Why are we seeing 504s?", "conversation_id": "thread-1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["recalled_history"] == ["Envoy timeout is 60s"]
    assert body["history_retained"] is True

    analytics = client.get("/api/analytics").json()
    assert analytics["totalTurns"] == 1
    assert analytics["totalCustomers"] == 1
    assert analytics["responsesUsingRecalledContextPercent"] == 100.0
    assert analytics["memoriesStored"] == 5


def test_llm_unavailable_returns_stable_error(tmp_path):
    client = install_test_dependencies(tmp_path, llm=FailingLLM())
    response = client.post("/api/chat", json={"customer_id": "alex_chen", "message": "Hello"})
    assert response.status_code == 502
    assert response.json()["error"] == "LLM Provider Unavailable"
    assert "llm provider down" not in response.text


def test_hindsight_unavailable_does_not_leak_raw_error(tmp_path):
    client = install_test_dependencies(tmp_path, history=FailingHistory())
    response = client.post("/api/chat", json={"customer_id": "alex_chen", "message": "Hello"})
    assert response.status_code == 502
    assert response.json()["error"] == "History Provider Unavailable"
    assert "provider down" not in response.text


def test_feedback_requires_field(tmp_path):
    client = install_test_dependencies(tmp_path)
    response = client.post("/api/feedback", json={"customer_id": "alex_chen"})
    assert response.status_code == 400


def test_feedback_persists_to_hindsight_and_analytics(tmp_path):
    history = FakeHistory()
    client = install_test_dependencies(tmp_path, history=history)
    response = client.post(
        "/api/feedback",
        json={"customer_id": "alex_chen", "rating": 5, "useful": True, "outcome": "Resolved"},
    )
    assert response.status_code == 200
    assert response.json()["hindsight_retained"] is True
    assert len(history.retained) == 1
    analytics = client.get("/api/analytics").json()
    assert analytics["csatScore"] == 5.0


def test_delete_requires_admin_key_when_configured(tmp_path, monkeypatch):
    client = install_test_dependencies(tmp_path)
    monkeypatch.setattr(app_module, "config", Config(**{**app_module.config.__dict__, "admin_api_key": "secret"}))
    response = client.delete("/api/history/alex_chen")
    assert response.status_code == 401
    response = client.delete("/api/history/alex_chen", headers={"X-Admin-API-Key": "secret"})
    assert response.status_code == 200
    assert app_module.history_provider.deleted == ["alex_chen"]


def test_analytics_empty_state(tmp_path):
    client = install_test_dependencies(tmp_path)
    analytics = client.get("/api/analytics").json()
    assert analytics["totalTurns"] == 0
    assert analytics["csatScore"] is None
    assert analytics["responsesUsingRecalledContextPercent"] is None
    assert analytics["trendData"] == []
