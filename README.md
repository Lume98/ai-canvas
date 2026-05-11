# AI Canvas Monorepo

## Startup Modes

```bash
# Development: start web(next dev) + worker(uv serve) in parallel.
pnpm dev

# Production-style local run:
# 1) build web
# 2) start worker
# 3) wait until worker /v1/health is ready
# 4) start web(next start)
pnpm build
pnpm server
```

## Runtime Boundary

- `apps/web`: Next.js UI + BFF API proxy (`/api/*` -> worker `/v1/*`).
- `apps/worker`: Python worker (FastAPI + background task loop).

## Notes

- Worker default health URL: `http://127.0.0.1:8766/v1/health`.
- `pnpm server` uses a startup gate script at `scripts/wait-worker-ready.mjs`.
- Worker data defaults to `.data/ai-canvas.sqlite` and `.data/generated-images`.
