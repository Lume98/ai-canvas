# AI Canvas Worker

Python background worker managed by `uv`.

## Documentation

See [docs/worker.md](docs/worker.md) for the worker architecture, HTTP API, task lifecycle, storage model, and known design risks.

## Commands

```bash
pnpm --filter worker dev
pnpm --filter worker build
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite UV_CACHE_DIR=.uv-cache uv run ai-canvas-worker init-db
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite UV_CACHE_DIR=.uv-cache uv run ai-canvas-worker enqueue --prompt "A quiet product photo"
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite UV_CACHE_DIR=.uv-cache uv run ai-canvas-worker work --once
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite UV_CACHE_DIR=.uv-cache uv run ai-canvas-worker serve
```

The HTTP server defaults to `http://127.0.0.1:8766`.

The worker is intentionally adapter-based:

- Next.js creates and queries drawing tasks.
- The worker executes drawing tasks outside the browser request lifecycle.
- The worker stores provider configuration and calls OpenAI-compatible APIs.
- Generated images are saved under `.data/generated-images` by default and served by the worker.
- Queue, database, and object storage adapters can be added without changing the app boundary.

## Storage

```bash
AI_CANVAS_GENERATED_IMAGES_DIR=../../.data/generated-images
```

If `AI_CANVAS_GENERATED_IMAGES_DIR` is not set, images are stored next to the SQLite database in `generated-images/`.

## HTTP API

```txt
GET    /provider-config
POST   /provider-config
DELETE /provider-config
POST   /images/generate
GET    /generated-images/:filename
GET    /draw-tasks
POST   /draw-tasks
GET    /draw-tasks/:taskId
```
