CREATE TABLE "conversations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "text" TEXT,
  "status" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "draw_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversation_id" TEXT,
  "request_message_id" TEXT,
  "reply_message_id" TEXT,
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
  "finished_at" DATETIME
);

CREATE TABLE "image_assets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "task_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "image_assets_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "draw_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "image_assets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "image_assets_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "provider_config" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "api_key" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_messages_conversation_created_at" ON "messages" ("conversation_id", "sort_order", "created_at");
CREATE INDEX "idx_draw_tasks_status_created_at" ON "draw_tasks" ("status", "created_at");
CREATE INDEX "idx_draw_tasks_conversation_created_at" ON "draw_tasks" ("conversation_id", "created_at");
CREATE INDEX "idx_draw_tasks_reply_message_id" ON "draw_tasks" ("reply_message_id");
CREATE INDEX "idx_image_assets_message_sort_order" ON "image_assets" ("message_id", "sort_order");
