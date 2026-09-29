import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator

from config import load_config
from core.agent import SupportAgent, ValidationError
from providers.factory import get_history_provider, get_llm_provider
from providers.history import HistoryProviderError
from providers.llm import LLMProviderError
from services.analytics_store import AnalyticsStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("app")

config = load_config()
llm_provider = get_llm_provider(config)
history_provider = get_history_provider(config)
agent = SupportAgent(config=config, llm_provider=llm_provider, history_provider=history_provider)
analytics_store = AnalyticsStore(config.analytics_db_path)

app = FastAPI(
    title="Contextual Support Agent API",
    description="Backend API for context-aware AI customer support with persistent Hindsight memory, telemetry, feedback, and memory erasure.",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

CUSTOMER_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


class ChatRequest(BaseModel):
    customer_id: str = Field(..., min_length=1, max_length=64)
    message: str = Field(..., min_length=1, max_length=12000)
    memory_enabled: bool = True
    conversation_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("customer_id")
    @classmethod
    def validate_customer_id(cls, value: str) -> str:
        clean = value.strip()
        if not CUSTOMER_ID_PATTERN.fullmatch(clean):
            raise ValueError("Invalid customer identifier.")
        return clean

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("Message cannot be empty or solely whitespace.")
        return clean


class ChatResponse(BaseModel):
    response: str
    recalled_history: list[str] = Field(default_factory=list)
    customer_id: str
    history_retained: bool
    memory_enabled: bool = True
    recall_source: str = "hindsight"


class FeedbackRequest(BaseModel):
    customer_id: str = Field(..., min_length=1, max_length=64)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    useful: Optional[bool] = None
    outcome: Optional[str] = Field(default=None, max_length=200)
    corrected_resolution: Optional[str] = Field(default=None, max_length=4000)
    message_id: Optional[str] = Field(default=None, max_length=128)
    conversation_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("customer_id")
    @classmethod
    def validate_customer_id(cls, value: str) -> str:
        clean = value.strip()
        if not CUSTOMER_ID_PATTERN.fullmatch(clean):
            raise ValueError("Invalid customer identifier.")
        return clean


class CustomerProfile(BaseModel):
    id: str
    name: str
    role: str
    type: str
    summary: str


class SystemHealthResponse(BaseModel):
    status: str
    timestamp: str
    agent_name: str
    llm_provider: str
    llm_model: str
    history_provider: str
    hindsight_base_url: str
    hindsight: str
    llm: str


PRESET_CUSTOMERS = [
    {"id": "alex_chen", "name": "Alex Chen", "role": "Infrastructure Lead", "type": "Returning Customer", "summary": "Gateway timeouts, Envoy proxy 60s timeout, VPC peering inquiry"},
    {"id": "priya_patel", "name": "Priya Patel", "role": "E-Commerce Tech Lead", "type": "Returning Customer", "summary": "Shopify order cancellation webhooks & payload schema fix"},
    {"id": "marcus_vance", "name": "Marcus Vance", "role": "Security Operations", "type": "Returning Customer", "summary": "Okta SAML 2.0 cert rotation & JIT user provisioning"},
    {"id": "new_customer_01", "name": "Jordan Miller", "role": "First-Time Inquirer", "type": "New Customer", "summary": "No prior interactions on record"},
]


def _validate_customer_id(customer_id: str) -> str:
    clean = (customer_id or "").strip()
    if not CUSTOMER_ID_PATTERN.fullmatch(clean):
        raise HTTPException(status_code=400, detail="Invalid customer identifier.")
    return clean


def _detect_language(text: str) -> str:
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    return "en"


def _classify_category(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ("okta", "saml", "oauth", "certificate", "authentication", "mfa", "sso")):
        return "Security & Authentication"
    if any(k in lowered for k in ("shopify", "webhook", "hmac", "integration", "payload", "api")):
        return "API Webhooks & Integration"
    if any(k in lowered for k in ("postgres", "mysql", "database", "sql", "query", "latency", "slow")):
        return "Database & Performance"
    if any(k in lowered for k in ("envoy", "gateway", "timeout", "vpc", "network", "dns", "kubernetes", "eks")):
        return "Infrastructure & Networking"
    return "Other"


def _classify_sentiment(text: str) -> str:
    lowered = text.lower()
    negative = ("error", "failed", "failure", "broken", "down", "outage", "unable", "urgent", "angry", "issue", "problem")
    positive = ("thanks", "thank you", "great", "resolved", "working", "fixed", "appreciate", "excellent")
    neg_hits = sum(lowered.count(k) for k in negative)
    pos_hits = sum(lowered.count(k) for k in positive)
    if neg_hits > pos_hits:
        return "negative"
    if pos_hits > neg_hits:
        return "positive"
    return "neutral"


def _authorized_admin(value: Optional[str]) -> bool:
    return bool(config.admin_api_key and value and value == config.admin_api_key)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Validation Error", "detail": "Customer identifier, message, and supplied fields must be valid."},
    )


@app.get("/health", response_model=SystemHealthResponse, tags=["System Health & Telemetry"])
async def health_check():
    hindsight_ok = await history_provider.healthcheck()
    llm_ok = bool(llm_provider.is_configured())
    overall = "healthy" if hindsight_ok and llm_ok else "degraded"
    return SystemHealthResponse(
        status=overall,
        timestamp=datetime.now(timezone.utc).isoformat(),
        agent_name=config.agent_name,
        llm_provider=config.llm_provider,
        llm_model=config.llm_model,
        history_provider=config.history_provider,
        hindsight_base_url=config.hindsight_base_url,
        hindsight="connected" if hindsight_ok else "unavailable",
        llm="configured" if llm_ok else "not_configured",
    )


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat & Memory Turn"])
async def chat_endpoint(request: ChatRequest):
    started = time.perf_counter()
    try:
        agent_response = await agent.process_turn(
            customer_id=request.customer_id,
            user_message=request.message,
            memory_enabled=request.memory_enabled,
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
        clean_message = SupportAgent._clean_memory_input(request.message)
        analytics_store.record_turn(
            customer_id=agent_response.customer_id,
            conversation_id=request.conversation_id,
            memory_enabled=agent_response.memory_enabled,
            recall_count=len(agent_response.recalled_history),
            retained=agent_response.history_retained,
            response_time_ms=elapsed_ms,
            language=_detect_language(clean_message),
            category=_classify_category(clean_message),
            sentiment=_classify_sentiment(clean_message),
        )
        return ChatResponse(
            response=agent_response.response,
            recalled_history=agent_response.recalled_history,
            customer_id=agent_response.customer_id,
            history_retained=agent_response.history_retained,
            memory_enabled=agent_response.memory_enabled,
            recall_source=agent_response.recall_source,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LLMProviderError as exc:
        logger.error("LLM provider error during chat: %s", exc)
        provider_label = config.llm_provider.upper()
        if exc.code == "not_configured":
            detail = f"{provider_label} is not configured. Set the {provider_label}_API_KEY environment variable and restart the backend."
        elif exc.code == "authentication":
            detail = f"{provider_label} authentication failed. Check the configured API key."
        elif exc.code == "model_unavailable":
            detail = f"The configured {provider_label} model is unavailable. Check LLM_MODEL and the provider's current model list."
        elif exc.code == "rate_limited":
            detail = f"{provider_label} rate limit or quota was reached. Please retry in a moment."
        elif exc.code in {"timeout", "network_error", "upstream_unavailable"}:
            detail = f"{provider_label} is temporarily unavailable. Please retry."
        elif exc.code == "request_rejected":
            detail = f"{provider_label} rejected the request. Check the configured model and request settings."
        else:
            detail = "The language model is currently unavailable. Please retry."
        return JSONResponse(
            status_code=502,
            content={
                "error": "LLM Provider Unavailable",
                "code": exc.code,
                "detail": detail,
                "retryable": exc.retryable,
            },
        )
    except HistoryProviderError as exc:
        logger.error("Hindsight provider error during chat: %s", exc)
        return JSONResponse(status_code=502, content={"error": "History Provider Unavailable", "detail": "Persistent customer memory is currently unavailable."})
    except Exception:
        logger.exception("Unexpected error in chat endpoint")
        return JSONResponse(status_code=500, content={"error": "Internal Processing Error", "detail": "An unexpected error occurred while processing the request."})


@app.get("/api/history/{customer_id}", tags=["Customer History"])
async def get_customer_history(customer_id: str):
    clean_id = _validate_customer_id(customer_id)
    try:
        items = await history_provider.recall(customer_id=clean_id, query="general customer history interactions")
        return {
            "customer_id": clean_id,
            "history": [item.text for item in items if item.text],
            "source": "hindsight",
        }
    except HistoryProviderError as exc:
        logger.error("Failed to retrieve Hindsight history: %s", exc)
        return JSONResponse(status_code=502, content={"error": "History Provider Unavailable", "detail": "Persistent customer memory is currently unavailable."})
    except Exception:
        logger.exception("Failed to retrieve history")
        return JSONResponse(status_code=500, content={"error": "Internal Error", "detail": "Unable to retrieve customer history."})


@app.delete("/api/history/{customer_id}", tags=["Customer History"])
async def delete_customer_history(customer_id: str, x_admin_api_key: Optional[str] = Header(default=None)):
    clean_id = _validate_customer_id(customer_id)
    if not config.admin_api_key:
        raise HTTPException(status_code=503, detail="Admin deletion is not configured. Set ADMIN_API_KEY on the backend.")
    if not _authorized_admin(x_admin_api_key):
        raise HTTPException(status_code=401, detail="Admin authorization required.")
    try:
        deleted_count = await history_provider.delete(clean_id)
        return {"customer_id": clean_id, "deleted_count": deleted_count, "source": "hindsight", "deleted": True}
    except HistoryProviderError as exc:
        logger.error("Failed to delete Hindsight history: %s", exc)
        return JSONResponse(status_code=502, content={"error": "History Provider Unavailable", "detail": "Persistent customer memory could not be erased."})
    except Exception:
        logger.exception("Unexpected history deletion error")
        return JSONResponse(status_code=500, content={"error": "Internal Error", "detail": "Unable to erase customer history."})


@app.post("/api/feedback", tags=["Chat & Memory Turn"])
async def submit_feedback(request: FeedbackRequest):
    if request.rating is None and request.useful is None and not request.outcome and not request.corrected_resolution:
        raise HTTPException(status_code=400, detail="At least one feedback field is required.")

    learning_parts = ["Customer support feedback outcome."]
    if request.rating is not None:
        learning_parts.append(f"Customer rated the support response {request.rating} out of 5.")
    if request.useful is not None:
        learning_parts.append(f"Customer indicated the response was {'useful' if request.useful else 'not useful'}.")
    if request.outcome:
        learning_parts.append(f"Customer-reported outcome: {request.outcome.strip()}")
    if request.corrected_resolution:
        learning_parts.append(f"Customer-confirmed correction or resolution: {request.corrected_resolution.strip()}")

    hindsight_retained = False
    try:
        await history_provider.retain(
            customer_id=request.customer_id,
            content="\n".join(learning_parts),
            context="customer_feedback_learning",
        )
        hindsight_retained = True
    except HistoryProviderError as exc:
        logger.error("Feedback Hindsight retention failed: %s", exc)
        return JSONResponse(status_code=502, content={"error": "History Provider Unavailable", "detail": "Feedback could not be persisted to customer memory."})

    analytics_store.record_feedback(
        customer_id=request.customer_id,
        conversation_id=request.conversation_id,
        message_id=request.message_id,
        rating=request.rating,
        useful=request.useful,
        outcome=request.outcome.strip() if request.outcome else None,
        corrected_resolution=request.corrected_resolution.strip() if request.corrected_resolution else None,
        hindsight_retained=hindsight_retained,
    )
    return {"recorded": True, "hindsight_retained": hindsight_retained}


@app.get("/api/analytics", tags=["System Health & Telemetry"])
async def get_analytics():
    data = analytics_store.summary(days=7)
    try:
        hindsight_stats = await history_provider.analytics_summary()
        data["memoriesStored"] = hindsight_stats.get("fact_count")
        data["hindsightBankCount"] = hindsight_stats.get("bank_count")
        data["memoryGrowthData"] = hindsight_stats.get("memory_growth_data", [])
    except HistoryProviderError as exc:
        logger.warning("Hindsight analytics unavailable: %s", exc)
        data["memoriesStored"] = None
        data["hindsightBankCount"] = None
        data["memoryGrowthData"] = []
        data["memoryDataStatus"] = "unavailable"
    else:
        data["memoryDataStatus"] = "available"
    data["generatedAt"] = datetime.now(timezone.utc).isoformat()
    data["periodDays"] = 7
    return data


@app.get("/api/analytics/export", tags=["System Health & Telemetry"])
async def export_analytics():
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": analytics_store.summary(days=7),
        "records": analytics_store.export_rows(),
    }
    try:
        payload["hindsight"] = await history_provider.analytics_summary()
    except HistoryProviderError:
        payload["hindsight"] = {"status": "unavailable"}
    return payload


@app.get("/api/customers", tags=["Customer Directory"])
async def list_customers():
    return {"customers": [CustomerProfile(**customer).model_dump() for customer in PRESET_CUSTOMERS]}


@app.get("/api/status", tags=["System Health & Telemetry"])
async def get_system_status():
    llm_configured = bool(llm_provider.is_configured())
    return {
        "agent_name": config.agent_name,
        "llm_provider": config.llm_provider,
        "llm_model": config.llm_model,
        "llm_configured": llm_configured,
        "llm_status": "ready" if llm_configured else "not_configured",
        "history_provider": config.history_provider,
        "hindsight_base_url": config.hindsight_base_url,
        "status": "operational" if llm_configured else "degraded",
    }


static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", include_in_schema=False)
async def serve_root():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(content={"message": "Frontend static files not found."})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
