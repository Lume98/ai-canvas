import sqlite3
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .task import DrawTask, DrawTaskStatus, GeneratedImage
from .validation import DEFAULT_OPENAI_BASE_URL, ProviderConfigInput


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
                CREATE TABLE IF NOT EXISTS conversations (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                  id TEXT PRIMARY KEY,
                  conversation_id TEXT NOT NULL,
                  role TEXT NOT NULL,
                  type TEXT NOT NULL,
                  text TEXT,
                  status TEXT NOT NULL,
                  sort_order INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                )
                """
            )
            self._migrate_message_columns(connection)
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS draw_tasks (
                  id TEXT PRIMARY KEY,
                  conversation_id TEXT,
                  request_message_id TEXT,
                  reply_message_id TEXT,
                  prompt TEXT NOT NULL,
                  model TEXT NOT NULL,
                  size TEXT NOT NULL,
                  quality TEXT NOT NULL,
                  output_count INTEGER NOT NULL DEFAULT 1,
                  parent_asset_id TEXT,
                  status TEXT NOT NULL,
                  progress INTEGER NOT NULL DEFAULT 0,
                  result_filename TEXT,
                  error_message TEXT,
                  attempts INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  started_at TEXT,
                  finished_at TEXT
                )
                """
            )
            self._migrate_draw_task_columns(connection)
            self._migrate_result_filename_column(connection)
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS image_assets (
                  id TEXT PRIMARY KEY,
                  task_id TEXT NOT NULL,
                  conversation_id TEXT NOT NULL,
                  message_id TEXT NOT NULL,
                  filename TEXT NOT NULL,
                  width INTEGER NOT NULL,
                  height INTEGER NOT NULL,
                  sort_order INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(task_id) REFERENCES draw_tasks(id) ON DELETE CASCADE,
                  FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                  FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
                ON messages(conversation_id, sort_order, created_at)
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
                CREATE INDEX IF NOT EXISTS idx_draw_tasks_conversation_created_at
                ON draw_tasks(conversation_id, created_at)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_draw_tasks_reply_message_id
                ON draw_tasks(reply_message_id)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_image_assets_message_sort_order
                ON image_assets(message_id, sort_order)
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

    def create_conversation(self, conversation_id: str, title: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO conversations (id, title)
                VALUES (?, ?)
                """,
                (conversation_id, title),
            )

    def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM conversations
                WHERE id = ?
                """,
                (conversation_id,),
            ).fetchone()

        return self._serialize_conversation_row(row) if row else None

    def create_task_turn(self, task: DrawTask) -> None:
        with self.connect() as connection:
            next_sort_order = self._next_message_sort_order(
                connection,
                task.conversation_id,
            )
            connection.execute(
                """
                INSERT INTO messages (
                  id,
                  conversation_id,
                  role,
                  type,
                  text,
                  status,
                  sort_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.request_message_id,
                    task.conversation_id,
                    "user",
                    "prompt",
                    task.prompt,
                    "succeeded",
                    next_sort_order,
                ),
            )
            connection.execute(
                """
                INSERT INTO messages (
                  id,
                  conversation_id,
                  role,
                  type,
                  text,
                  status,
                  sort_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.reply_message_id,
                    task.conversation_id,
                    "assistant",
                    "image_result",
                    None,
                    "pending",
                    next_sort_order + 1,
                ),
            )
            connection.execute(
                """
                INSERT INTO draw_tasks (
                  id,
                  conversation_id,
                  request_message_id,
                  reply_message_id,
                  prompt,
                  model,
                  size,
                  quality,
                  output_count,
                  parent_asset_id,
                  status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.conversation_id,
                    task.request_message_id,
                    task.reply_message_id,
                    task.prompt,
                    task.model,
                    task.size,
                    task.quality,
                    task.output_count,
                    task.parent_asset_id,
                    DrawTaskStatus.QUEUED.value,
                ),
            )
            connection.execute(
                """
                UPDATE conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (task.conversation_id,),
            )

    def list_conversation_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            message_rows = connection.execute(
                """
                SELECT *
                FROM messages
                WHERE conversation_id = ?
                ORDER BY sort_order ASC, created_at ASC, id ASC
                """,
                (conversation_id,),
            ).fetchall()

            messages = [self._serialize_message_row(row) for row in message_rows]
            message_ids = [message["id"] for message in messages]
            reply_tasks = self._list_tasks_by_reply_message_ids(connection, message_ids)
            assets_by_message_id = self._list_assets_by_message_ids(connection, message_ids)

        for message in messages:
            message["assets"] = assets_by_message_id.get(message["id"], [])
            message["task"] = reply_tasks.get(message["id"])

        return messages

    def list_tasks(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM draw_tasks
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

            tasks = [self._serialize_task_row(row) for row in rows]
            task_ids = [task["id"] for task in tasks]
            assets_by_task_id = self._list_assets_by_task_ids(connection, task_ids)

        for task in tasks:
            task["assets"] = assets_by_task_id.get(task["id"], [])

        return tasks

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

            if row is None:
                return None

            task = self._serialize_task_row(row)
            task["assets"] = self._list_assets_by_task_ids(connection, [task_id]).get(
                task_id,
                [],
            )

        return task

    def claim_next_task(self) -> DrawTask | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                UPDATE draw_tasks
                SET status = ?,
                    progress = 10,
                    attempts = attempts + 1,
                    started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = (
                  SELECT id
                  FROM draw_tasks
                  WHERE status = ?
                  ORDER BY created_at ASC, id ASC
                  LIMIT 1
                )
                RETURNING
                  id,
                  conversation_id,
                  request_message_id,
                  reply_message_id,
                  prompt,
                  model,
                  size,
                  quality,
                  output_count,
                  parent_asset_id,
                  attempts
                """,
                (DrawTaskStatus.RUNNING.value, DrawTaskStatus.QUEUED.value),
            ).fetchone()

            if row is None:
                return None

            if row["reply_message_id"]:
                connection.execute(
                    """
                    UPDATE messages
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    ("running", row["reply_message_id"]),
                )

        return DrawTask(
            id=row["id"],
            conversation_id=row["conversation_id"] or "",
            request_message_id=row["request_message_id"] or "",
            reply_message_id=row["reply_message_id"] or "",
            prompt=row["prompt"],
            model=row["model"],
            size=row["size"],
            quality=row["quality"],
            output_count=row["output_count"] or 1,
            parent_asset_id=row["parent_asset_id"],
            attempts=row["attempts"],
        )

    def mark_succeeded(self, task_id: str, images: tuple[GeneratedImage, ...]) -> None:
        with self.connect() as connection:
            task_row = connection.execute(
                """
                SELECT conversation_id, reply_message_id
                FROM draw_tasks
                WHERE id = ?
                """,
                (task_id,),
            ).fetchone()

            if task_row is None:
                return

            first_filename = images[0].filename if images else None

            connection.execute(
                """
                UPDATE draw_tasks
                SET status = ?,
                    progress = 100,
                    result_filename = ?,
                    error_message = NULL,
                    finished_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    DrawTaskStatus.SUCCEEDED.value,
                    first_filename,
                    task_id,
                ),
            )
            if task_row["conversation_id"] and task_row["reply_message_id"]:
                connection.execute(
                    """
                    DELETE FROM image_assets
                    WHERE task_id = ?
                    """,
                    (task_id,),
                )

                for sort_order, image in enumerate(images):
                    connection.execute(
                        """
                        INSERT INTO image_assets (
                          id,
                          task_id,
                          conversation_id,
                          message_id,
                          filename,
                          width,
                          height,
                          sort_order
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            self._build_prefixed_id("asset"),
                            task_id,
                            task_row["conversation_id"],
                            task_row["reply_message_id"],
                            image.filename,
                            image.width,
                            image.height,
                            sort_order,
                        ),
                    )

            if task_row["reply_message_id"]:
                connection.execute(
                    """
                    UPDATE messages
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    ("succeeded", task_row["reply_message_id"]),
                )

            if task_row["conversation_id"]:
                connection.execute(
                    """
                    UPDATE conversations
                    SET updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (task_row["conversation_id"],),
                )

    def mark_failed(self, task_id: str, error_message: str) -> None:
        with self.connect() as connection:
            task_row = connection.execute(
                """
                SELECT conversation_id, reply_message_id
                FROM draw_tasks
                WHERE id = ?
                """,
                (task_id,),
            ).fetchone()

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

            if task_row and task_row["reply_message_id"]:
                connection.execute(
                    """
                    UPDATE messages
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    ("failed", task_row["reply_message_id"]),
                )

            if task_row and task_row["conversation_id"]:
                connection.execute(
                    """
                    UPDATE conversations
                    SET updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (task_row["conversation_id"],),
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

    def _list_tasks_by_reply_message_ids(
        self,
        connection: sqlite3.Connection,
        reply_message_ids: list[str],
    ) -> dict[str, dict[str, Any]]:
        if not reply_message_ids:
            return {}

        rows = connection.execute(
            f"""
            SELECT *
            FROM draw_tasks
            WHERE reply_message_id IN ({placeholders(len(reply_message_ids))})
            """,
            reply_message_ids,
        ).fetchall()

        tasks = [self._serialize_task_row(row) for row in rows]
        assets_by_task_id = self._list_assets_by_task_ids(
            connection,
            [task["id"] for task in tasks],
        )

        mapped_tasks: dict[str, dict[str, Any]] = {}

        for task in tasks:
            task["assets"] = assets_by_task_id.get(task["id"], [])
            reply_message_id = task.get("replyMessageId")

            if isinstance(reply_message_id, str) and reply_message_id:
                mapped_tasks[reply_message_id] = task

        return mapped_tasks

    def _list_assets_by_task_ids(
        self,
        connection: sqlite3.Connection,
        task_ids: list[str],
    ) -> dict[str, list[dict[str, Any]]]:
        if not task_ids:
            return {}

        rows = connection.execute(
            f"""
            SELECT *
            FROM image_assets
            WHERE task_id IN ({placeholders(len(task_ids))})
            ORDER BY sort_order ASC, created_at ASC, id ASC
            """,
            task_ids,
        ).fetchall()

        assets_by_task_id: dict[str, list[dict[str, Any]]] = {}

        for row in rows:
            asset = self._serialize_image_asset_row(row)
            assets_by_task_id.setdefault(asset["taskId"], []).append(asset)

        return assets_by_task_id

    def _list_assets_by_message_ids(
        self,
        connection: sqlite3.Connection,
        message_ids: list[str],
    ) -> dict[str, list[dict[str, Any]]]:
        if not message_ids:
            return {}

        rows = connection.execute(
            f"""
            SELECT *
            FROM image_assets
            WHERE message_id IN ({placeholders(len(message_ids))})
            ORDER BY sort_order ASC, created_at ASC, id ASC
            """,
            message_ids,
        ).fetchall()

        assets_by_message_id: dict[str, list[dict[str, Any]]] = {}

        for row in rows:
            asset = self._serialize_image_asset_row(row)
            assets_by_message_id.setdefault(asset["messageId"], []).append(asset)

        return assets_by_message_id

    def _serialize_conversation_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "title": row["title"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    def _serialize_message_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "conversationId": row["conversation_id"],
            "role": row["role"],
            "type": row["type"],
            "text": row["text"],
            "status": row["status"],
            "sortOrder": row["sort_order"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    def _migrate_message_columns(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(messages)").fetchall()
        }

        if "sort_order" not in columns:
            connection.execute(
                "ALTER TABLE messages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
            )

    def _next_message_sort_order(
        self,
        connection: sqlite3.Connection,
        conversation_id: str,
    ) -> int:
        row = connection.execute(
            """
            SELECT COALESCE(MAX(sort_order), 0)
            FROM messages
            WHERE conversation_id = ?
            """,
            (conversation_id,),
        ).fetchone()

        current_max = row[0] if row is not None else 0
        return int(current_max) + 1

    def _serialize_task_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "conversationId": row["conversation_id"],
            "requestMessageId": row["request_message_id"],
            "replyMessageId": row["reply_message_id"],
            "prompt": row["prompt"],
            "model": row["model"],
            "size": row["size"],
            "quality": row["quality"],
            "outputCount": row["output_count"],
            "parentAssetId": row["parent_asset_id"],
            "status": row["status"],
            "progress": row["progress"],
            "resultFilename": row["result_filename"],
            "errorMessage": row["error_message"],
            "attempts": row["attempts"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "startedAt": row["started_at"],
            "finishedAt": row["finished_at"],
        }

    def _serialize_image_asset_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "taskId": row["task_id"],
            "conversationId": row["conversation_id"],
            "messageId": row["message_id"],
            "filename": row["filename"],
            "width": row["width"],
            "height": row["height"],
            "sortOrder": row["sort_order"],
            "createdAt": row["created_at"],
        }

    def _migrate_draw_task_columns(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(draw_tasks)").fetchall()
        }

        migrations = {
            "conversation_id": "ALTER TABLE draw_tasks ADD COLUMN conversation_id TEXT",
            "request_message_id": "ALTER TABLE draw_tasks ADD COLUMN request_message_id TEXT",
            "reply_message_id": "ALTER TABLE draw_tasks ADD COLUMN reply_message_id TEXT",
            "output_count": (
                "ALTER TABLE draw_tasks ADD COLUMN output_count INTEGER NOT NULL DEFAULT 1"
            ),
            "parent_asset_id": "ALTER TABLE draw_tasks ADD COLUMN parent_asset_id TEXT",
        }

        for column_name, statement in migrations.items():
            if column_name not in columns:
                connection.execute(statement)

    def _migrate_result_filename_column(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(draw_tasks)").fetchall()
        }

        if "result_filename" not in columns:
            connection.execute("ALTER TABLE draw_tasks ADD COLUMN result_filename TEXT")

        if "result_url" not in columns:
            return

        rows = connection.execute(
            """
            SELECT id, result_url
            FROM draw_tasks
            WHERE result_url IS NOT NULL
              AND result_filename IS NULL
            """
        ).fetchall()

        for row in rows:
            connection.execute(
                """
                UPDATE draw_tasks
                SET result_filename = ?
                WHERE id = ?
                """,
                (extract_result_filename(row["result_url"]), row["id"]),
            )

    def _build_prefixed_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex}"


def extract_result_filename(result_reference: str) -> str:
    parsed_path = urlparse(result_reference).path
    filename = Path(parsed_path).name

    return filename or result_reference


def placeholders(length: int) -> str:
    return ", ".join("?" for _ in range(length))
