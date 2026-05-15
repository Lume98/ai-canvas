PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_draw_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "request_message_id" TEXT NOT NULL,
  "reply_message_id" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "quality" TEXT NOT NULL,
  "output_count" INTEGER NOT NULL DEFAULT 1,
  "branch_mode" TEXT,
  "parent_asset_id" TEXT,
  "status" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "result_filename" TEXT,
  "error_message" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" DATETIME,
  "finished_at" DATETIME,
  CONSTRAINT "draw_tasks_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "draw_tasks_request_message_id_fkey" FOREIGN KEY ("request_message_id") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "draw_tasks_reply_message_id_fkey" FOREIGN KEY ("reply_message_id") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "draw_tasks_parent_asset_id_fkey" FOREIGN KEY ("parent_asset_id") REFERENCES "image_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_draw_tasks" (
  "id",
  "conversation_id",
  "request_message_id",
  "reply_message_id",
  "prompt",
  "model",
  "size",
  "quality",
  "output_count",
  "branch_mode",
  "parent_asset_id",
  "status",
  "progress",
  "result_filename",
  "error_message",
  "attempts",
  "created_at",
  "updated_at",
  "started_at",
  "finished_at"
)
SELECT
  "id",
  "conversation_id",
  "request_message_id",
  "reply_message_id",
  "prompt",
  "model",
  "size",
  "quality",
  "output_count",
  "branch_mode",
  "parent_asset_id",
  "status",
  "progress",
  "result_filename",
  "error_message",
  "attempts",
  "created_at",
  "updated_at",
  "started_at",
  "finished_at"
FROM "draw_tasks";

DROP TABLE "draw_tasks";
ALTER TABLE "new_draw_tasks" RENAME TO "draw_tasks";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "draw_tasks_request_message_id_key" ON "draw_tasks" ("request_message_id");
CREATE UNIQUE INDEX "draw_tasks_reply_message_id_key" ON "draw_tasks" ("reply_message_id");
CREATE INDEX "idx_draw_tasks_status_created_at" ON "draw_tasks" ("status", "created_at");
CREATE INDEX "idx_draw_tasks_conversation_created_at" ON "draw_tasks" ("conversation_id", "created_at");
CREATE INDEX "idx_image_assets_task_sort_order" ON "image_assets" ("task_id", "sort_order");
