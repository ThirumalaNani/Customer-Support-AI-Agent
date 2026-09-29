from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


class HistoryProviderError(Exception):
    """Raised when a persistent memory provider fails."""


@dataclass(frozen=True)
class HistoryItem:
    text: str
    memory_id: Optional[str] = None
    fact_type: Optional[str] = None
    context: Optional[str] = None
    scores: Dict[str, Any] = field(default_factory=dict)


class HistoryProvider(ABC):
    @abstractmethod
    async def recall(self, customer_id: str, query: str) -> List[HistoryItem]:
        pass

    @abstractmethod
    async def retain(self, customer_id: str, content: str, *, context: str = "customer_support") -> None:
        pass

    @abstractmethod
    async def delete(self, customer_id: str) -> int:
        pass

    @abstractmethod
    async def healthcheck(self) -> bool:
        pass

    async def analytics_summary(self) -> Dict[str, Any]:
        return {}
