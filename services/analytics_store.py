"""Small SQLite telemetry store for backend-owned, non-fabricated analytics."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional


class AnalyticsStore:
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        if not self.db_path.is_absolute():
            self.db_path = Path.cwd() / self.db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    occurred_at TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    conversation_id TEXT,
                    memory_enabled INTEGER NOT NULL,
                    recall_count INTEGER NOT NULL,
                    retained INTEGER NOT NULL,
                    response_time_ms REAL NOT NULL,
                    language TEXT NOT NULL,
                    category TEXT NOT NULL,
                    sentiment TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_turns_occurred_at ON turns(occurred_at);
                CREATE INDEX IF NOT EXISTS idx_turns_customer_id ON turns(customer_id);

                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    occurred_at TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    conversation_id TEXT,
                    message_id TEXT,
                    rating INTEGER,
                    useful INTEGER,
                    outcome TEXT,
                    corrected_resolution TEXT,
                    hindsight_retained INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_feedback_occurred_at ON feedback(occurred_at);
                """
            )

    def record_turn(
        self,
        *,
        customer_id: str,
        conversation_id: Optional[str],
        memory_enabled: bool,
        recall_count: int,
        retained: bool,
        response_time_ms: float,
        language: str,
        category: str,
        sentiment: str,
    ) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO turns (
                    occurred_at, customer_id, conversation_id, memory_enabled,
                    recall_count, retained, response_time_ms, language, category, sentiment
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    customer_id,
                    conversation_id,
                    int(memory_enabled),
                    int(recall_count),
                    int(retained),
                    float(response_time_ms),
                    language,
                    category,
                    sentiment,
                ),
            )

    def record_feedback(
        self,
        *,
        customer_id: str,
        conversation_id: Optional[str],
        message_id: Optional[str],
        rating: Optional[int],
        useful: Optional[bool],
        outcome: Optional[str],
        corrected_resolution: Optional[str],
        hindsight_retained: bool,
    ) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO feedback (
                    occurred_at, customer_id, conversation_id, message_id, rating,
                    useful, outcome, corrected_resolution, hindsight_retained
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    customer_id,
                    conversation_id,
                    message_id,
                    rating,
                    None if useful is None else int(useful),
                    outcome,
                    corrected_resolution,
                    int(hindsight_retained),
                ),
            )

    def summary(self, *, days: int = 7) -> Dict[str, Any]:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        with self._lock, self._connect() as conn:
            total_turns = conn.execute("SELECT COUNT(*) FROM turns").fetchone()[0]
            total_customers = conn.execute("SELECT COUNT(DISTINCT customer_id) FROM turns").fetchone()[0]
            conversation_count = conn.execute("SELECT COUNT(DISTINCT conversation_id) FROM turns WHERE conversation_id IS NOT NULL AND conversation_id != ''").fetchone()[0]
            active_customers = conn.execute(
                "SELECT COUNT(DISTINCT customer_id) FROM turns WHERE occurred_at >= ?", (since,)
            ).fetchone()[0]
            avg = conn.execute("SELECT AVG(response_time_ms) FROM turns").fetchone()[0]
            recalled = conn.execute("SELECT COUNT(*) FROM turns WHERE recall_count > 0 AND memory_enabled = 1").fetchone()[0]
            memory_turns = conn.execute("SELECT COUNT(*) FROM turns WHERE memory_enabled = 1").fetchone()[0]
            retained = conn.execute("SELECT COUNT(*) FROM turns WHERE retained = 1").fetchone()[0]
            csat = conn.execute("SELECT AVG(rating) FROM feedback WHERE rating IS NOT NULL").fetchone()[0]

            sentiments = {r[0]: r[1] for r in conn.execute("SELECT sentiment, COUNT(*) FROM turns GROUP BY sentiment").fetchall()}
            total_sentiment = sum(sentiments.values()) or 0
            sentiment_distribution = {
                "positive": round(sentiments.get("positive", 0) * 100 / total_sentiment, 2) if total_sentiment else None,
                "neutral": round(sentiments.get("neutral", 0) * 100 / total_sentiment, 2) if total_sentiment else None,
                "negative": round(sentiments.get("negative", 0) * 100 / total_sentiment, 2) if total_sentiment else None,
            }

            languages = {r[0]: r[1] for r in conn.execute("SELECT language, COUNT(*) FROM turns GROUP BY language").fetchall()}
            categories = {r[0]: r[1] for r in conn.execute("SELECT category, COUNT(*) FROM turns GROUP BY category").fetchall()}

            trend_rows = conn.execute(
                """
                SELECT substr(occurred_at, 1, 10) AS day,
                       COUNT(*) AS count,
                       SUM(CASE WHEN recall_count > 0 AND memory_enabled = 1 THEN recall_count ELSE 0 END) AS memories_recalled,
                       AVG(response_time_ms) AS avg_latency
                FROM turns
                WHERE occurred_at >= ?
                GROUP BY day
                ORDER BY day
                """,
                (since,),
            ).fetchall()

            retained_rows = conn.execute(
                """
                SELECT substr(occurred_at, 1, 10) AS day, COUNT(*) AS new_retained
                FROM turns
                WHERE retained = 1 AND occurred_at >= ?
                GROUP BY day
                ORDER BY day
                """,
                (since,),
            ).fetchall()

            cumulative = 0
            memory_growth = []
            for row in retained_rows:
                cumulative += int(row[1])
                memory_growth.append({
                    "day": row[0],
                    "cumulative": cumulative,
                    "newRetained": int(row[1]),
                })

            return {
                "totalConversations": int(conversation_count) if conversation_count else None,
                "totalTurns": int(total_turns),
                "conversationIdsProvided": int(conversation_count),
                "totalCustomers": int(total_customers),
                "activeCustomers": int(active_customers),
                "memoriesStored": None,
                "avgResponseTimeMs": round(avg, 2) if avg is not None else None,
                "csatScore": round(csat, 2) if csat is not None else None,
                "responsesUsingRecalledContextPercent": round(recalled * 100 / memory_turns, 2) if memory_turns else None,
                "recallHitRatePercent": round(recalled * 100 / memory_turns, 2) if memory_turns else None,
                "retentionSuccessPercent": round(retained * 100 / memory_turns, 2) if memory_turns else None,
                "sentimentDistribution": sentiment_distribution,
                "languageUsageData": [
                    {"lang": lang, "count": count, "percentage": round(count * 100 / total_turns, 2) if total_turns else None}
                    for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True)
                ],
                "categoryBreakdown": [
                    {"category": category, "count": count, "percentage": round(count * 100 / total_turns, 2) if total_turns else None}
                    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)
                ],
                "trendData": [
                    {
                        "day": row[0],
                        "count": int(row[1]),
                        "memoriesRecalled": int(row[2] or 0),
                        "avgLatency": round(float(row[3]), 2) if row[3] is not None else None,
                    }
                    for row in trend_rows
                ],
                "memoryGrowthData": memory_growth,
                "feedbackCount": int(conn.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]),
            }

    def export_rows(self) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            turns = [dict(r) for r in conn.execute("SELECT * FROM turns ORDER BY occurred_at").fetchall()]
            feedback = [dict(r) for r in conn.execute("SELECT * FROM feedback ORDER BY occurred_at").fetchall()]
        return {"turns": turns, "feedback": feedback}
