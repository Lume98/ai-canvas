import sqlite3
from pathlib import Path
from typing import Any

from ai_canvas_worker.task import DrawTask, DrawTaskStatus
from ai_canvas_worker.validation import DEFAULT_OPENAI_BASE_URL, ProviderConfigInput


class SQLiteDrawTaskStore:
    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        self._database_path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA busy_timeout = 5000")
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def init_schema(self) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS draw_tasks (
                  id TEXT PRIMARY KEY,
                  prompt TEXT NOT NULL,
                  model TEXT NOT NULL,
                  size TEXT NOT NULL,
                  quality TEXT NOT NULL,
                  status TEXT NOT NULL,
                  progress INTEGER NOT NULL DEFAULT 0,
                  result_url TEXT,
                  error_message TEXT,
                  attempts INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  started_at TEXT,
                  finished_at TEXT
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_draw_tasks_status_created_at
                ON draw_tasks(status, created_at)
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS provider_config (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  api_key TEXT NOT NULL,
                  base_url TEXT NOT NULL,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def create_task(self, task: DrawTask) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO draw_tasks (id, prompt, model, size, quality, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.prompt,
                    task.model,
                    task.size,
                    task.quality,
                    DrawTaskStatus.QUEUED.value,
                ),
            )

    def list_tasks(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM draw_tasks
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [self._serialize_row(row) for row in rows]

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM draw_tasks
                WHERE id = ?
                """,
                (task_id,),
            ).fetchone()

        return self._serialize_row(row) if row else None

    def claim_next_task(self) -> DrawTask | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                UPDATE draw_tasks
                SET status = ?,
                    attempts = attempts + 1,
                    started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = (
                  SELECT id
                  FROM draw_tasks
                  WHERE status = ?
                  ORDER BY created_at ASC
                  LIMIT 1
                )
                RETURNING id, prompt, model, size, quality, attempts
                """,
                (DrawTaskStatus.RUNNING.value, DrawTaskStatus.QUEUED.value),
            ).fetchone()

        if row is None:
            return None

        return DrawTask(
            id=row["id"],
            prompt=row["prompt"],
            model=row["model"],
            size=row["size"],
            quality=row["quality"],
            attempts=row["attempts"],
        )

    def mark_succeeded(self, task_id: str, result_url: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE draw_tasks
                SET status = ?,
                    progress = 100,
                    result_url = ?,
                    error_message = NULL,
                    finished_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (DrawTaskStatus.SUCCEEDED.value, result_url, task_id),
            )

    def mark_failed(self, task_id: str, error_message: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE draw_tasks
                SET status = ?,
                    error_message = ?,
                    finished_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (DrawTaskStatus.FAILED.value, error_message, task_id),
            )

    def get_provider_config(self) -> dict[str, Any]:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT api_key, base_url, updated_at
                FROM provider_config
                WHERE id = 1
                """
            ).fetchone()

        if row is None:
            return {
                "apiKey": "",
                "baseUrl": DEFAULT_OPENAI_BASE_URL,
                "hasApiKey": False,
                "updatedAt": None,
            }

        api_key = row["api_key"]

        return {
            "apiKey": api_key,
            "baseUrl": row["base_url"],
            "hasApiKey": bool(api_key),
            "updatedAt": row["updated_at"],
        }

    def save_provider_config(self, config: ProviderConfigInput) -> dict[str, Any]:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO provider_config (id, api_key, base_url, updated_at)
                VALUES (1, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                  api_key = excluded.api_key,
                  base_url = excluded.base_url,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (config.api_key, config.base_url),
            )

        return self.get_provider_config()

    def clear_provider_config(self) -> dict[str, Any]:
        with self.connect() as connection:
            connection.execute("DELETE FROM provider_config WHERE id = 1")

        return self.get_provider_config()

    def _serialize_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "prompt": row["prompt"],
            "model": row["model"],
            "size": row["size"],
            "quality": row["quality"],
            "status": row["status"],
            "progress": row["progress"],
            "resultUrl": row["result_url"],
            "errorMessage": row["error_message"],
            "attempts": row["attempts"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "startedAt": row["started_at"],
            "finishedAt": row["finished_at"],
        }
