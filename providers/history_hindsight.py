import asyncio
import logging
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

from providers.history import HistoryProvider, HistoryItem, HistoryProviderError

logger = logging.getLogger(__name__)


class HindsightHistoryProvider(HistoryProvider):
    """Async REST adapter for Hindsight.

    The Hindsight Python convenience methods are synchronous; calling them from
    FastAPI can trigger event-loop errors. This adapter uses Hindsight's HTTP API
    directly with AsyncClient, so every network operation remains inside the
    request task and no nested event loop is created.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str = "",
        timeout_seconds: int = 30,
        max_retries: int = 2,
    ):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = float(timeout_seconds)
        self._max_retries = max(0, max_retries)

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    @staticmethod
    def _bank_path(customer_id: str) -> str:
        # Path-segment encoding prevents customer IDs from altering API paths.
        return quote(customer_id.strip(), safe="")

    async def _request(self, method: str, path: str, *, json: Optional[Dict[str, Any]] = None) -> httpx.Response:
        attempts = 1 + self._max_retries
        last_error: Optional[Exception] = None
        for attempt in range(1, attempts + 1):
            try:
                async with httpx.AsyncClient(
                    base_url=self._base_url,
                    headers=self._headers(),
                    timeout=self._timeout,
                    follow_redirects=False,
                ) as client:
                    response = await client.request(method, path, json=json)
                if response.status_code == 429 or 500 <= response.status_code < 600:
                    if attempt < attempts:
                        logger.warning(
                            "Hindsight %s attempt %d/%d returned HTTP %d",
                            method, attempt, attempts, response.status_code,
                        )
                        await asyncio.sleep(0.5 * attempt)
                        continue
                return response
            except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as exc:
                last_error = exc
                logger.warning("Hindsight %s attempt %d/%d failed: %s", method, attempt, attempts, exc)
                if attempt < attempts:
                    await asyncio.sleep(0.5 * attempt)
            except Exception as exc:
                last_error = exc
                logger.warning("Hindsight %s unexpected attempt %d/%d failed: %s", method, attempt, attempts, exc)
                if attempt < attempts:
                    await asyncio.sleep(0.5 * attempt)
        raise HistoryProviderError("Hindsight memory service is unavailable.") from last_error

    @staticmethod
    def _parse_recall(data: Any) -> List[HistoryItem]:
        raw_results = data.get("results", []) if isinstance(data, dict) else []
        items: List[HistoryItem] = []
        for item in raw_results:
            if not isinstance(item, dict):
                if isinstance(item, str) and item.strip():
                    items.append(HistoryItem(text=item.strip()))
                continue
            text = item.get("text") or item.get("content")
            if not text or not str(text).strip():
                continue
            scores = item.get("scores") if isinstance(item.get("scores"), dict) else {}
            items.append(
                HistoryItem(
                    text=str(text).strip(),
                    memory_id=str(item.get("id")) if item.get("id") else None,
                    fact_type=str(item.get("type")) if item.get("type") else None,
                    context=str(item.get("context")) if item.get("context") else None,
                    scores=scores,
                )
            )
        return items

    async def recall(self, customer_id: str, query: str) -> List[HistoryItem]:
        if not customer_id or not customer_id.strip():
            raise HistoryProviderError("Customer ID must be provided to recall history.")
        if not query or not query.strip():
            raise HistoryProviderError("Recall query must not be empty.")

        path = f"/v1/default/banks/{self._bank_path(customer_id)}/memories/recall"
        response = await self._request("POST", path, json={"query": query.strip()})
        if response.status_code == 404:
            return []
        if response.status_code >= 400:
            logger.error("Hindsight recall failed: status=%s body=%s", response.status_code, response.text[:500])
            raise HistoryProviderError("Hindsight memory service rejected the recall request.")
        try:
            return self._parse_recall(response.json())
        except ValueError as exc:
            logger.error("Hindsight recall returned invalid JSON: %s", exc)
            raise HistoryProviderError("Hindsight memory service returned an invalid response.") from exc

    async def retain(self, customer_id: str, content: str, *, context: str = "customer_support") -> None:
        if not customer_id or not customer_id.strip():
            raise HistoryProviderError("Customer ID must be provided to retain history.")
        if not content or not content.strip():
            return

        path = f"/v1/default/banks/{self._bank_path(customer_id)}/memories"
        payload = {
            "async": False,
            "items": [
                {
                    "content": content.strip(),
                    "context": context,
                    "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                }
            ],
        }
        response = await self._request("POST", path, json=payload)
        if response.status_code >= 400:
            logger.error("Hindsight retain failed: status=%s body=%s", response.status_code, response.text[:500])
            raise HistoryProviderError("Hindsight memory service rejected the retention request.")

    async def delete(self, customer_id: str) -> int:
        if not customer_id or not customer_id.strip():
            raise HistoryProviderError("Customer ID must be provided to delete history.")

        path = f"/v1/default/banks/{self._bank_path(customer_id)}/memories"
        response = await self._request("DELETE", path)
        if response.status_code == 404:
            return 0
        if response.status_code >= 400:
            logger.error("Hindsight deletion failed: status=%s body=%s", response.status_code, response.text[:500])
            raise HistoryProviderError("Hindsight memory service rejected the deletion request.")
        try:
            body = response.json()
        except ValueError:
            return 0
        return int(body.get("deleted_count") or 0) if isinstance(body, dict) else 0

    async def healthcheck(self) -> bool:
        try:
            async with httpx.AsyncClient(
                base_url=self._base_url,
                headers=self._headers(),
                timeout=min(self._timeout, 5.0),
                follow_redirects=False,
            ) as client:
                response = await client.get("/health/ready")
            return 200 <= response.status_code < 300
        except Exception as exc:
            logger.warning("Hindsight healthcheck failed: %s", exc)
            return False

    async def analytics_summary(self) -> Dict[str, Any]:
        """Return real Hindsight bank/fact counts and ingestion series."""
        banks: List[Dict[str, Any]] = []
        limit = 100
        offset = 0
        try:
            while True:
                response = await self._request(
                    "GET",
                    f"/v1/default/banks?limit={limit}&offset={offset}",
                )
                if response.status_code >= 400:
                    raise HistoryProviderError("Hindsight memory service rejected the analytics request.")
                data = response.json()
                page = data.get("banks", []) if isinstance(data, dict) else []
                banks.extend(page)
                total = int(data.get("total", len(banks))) if isinstance(data, dict) else len(banks)
                if not page or len(banks) >= total:
                    break
                offset += limit

            fact_count = sum(int(bank.get("fact_count") or 0) for bank in banks if isinstance(bank, dict))
            buckets_by_day: Dict[str, Dict[str, int]] = {}
            for bank in banks:
                bank_id = bank.get("bank_id") if isinstance(bank, dict) else None
                if not bank_id:
                    continue
                series_response = await self._request(
                    "GET",
                    f"/v1/default/banks/{self._bank_path(str(bank_id))}/stats/memories-timeseries?period=7d&time_field=created_at",
                )
                if series_response.status_code == 404:
                    continue
                if series_response.status_code >= 400:
                    raise HistoryProviderError("Hindsight memory service rejected the memory growth request.")
                series = series_response.json()
                for bucket in series.get("buckets", []) if isinstance(series, dict) else []:
                    day = str(bucket.get("time", ""))[:10]
                    if not day:
                        continue
                    target = buckets_by_day.setdefault(day, {"world": 0, "experience": 0, "observation": 0})
                    target["world"] += int(bucket.get("world") or 0)
                    target["experience"] += int(bucket.get("experience") or 0)
                    target["observation"] += int(bucket.get("observation") or 0)

            cumulative = 0
            memory_growth = []
            for day in sorted(buckets_by_day):
                bucket = buckets_by_day[day]
                new_retained = bucket["world"] + bucket["experience"] + bucket["observation"]
                cumulative += new_retained
                memory_growth.append({
                    "day": day,
                    "cumulative": cumulative,
                    "newRetained": new_retained,
                })

            return {
                "bank_count": len(banks),
                "fact_count": fact_count,
                "memory_growth_data": memory_growth,
            }
        except (ValueError, TypeError) as exc:
            logger.error("Hindsight analytics response parsing failed: %s", exc)
            raise HistoryProviderError("Hindsight memory service returned invalid analytics data.") from exc
