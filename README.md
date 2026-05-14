# AI Canvas Monorepo

## Startup Modes

```bash
# Development: start Next.js app.
pnpm dev

# Production-style local run:
pnpm build
pnpm server
```

## Runtime Boundary

- `apps/web`: Next.js UI + Node runtime API。它直接读写 SQLite、调用 OpenAI Images API，并返回本地生成图片。

## Notes

- 数据默认存放在 `.data/ai-canvas.sqlite` 与 `.data/generated-images`。
- 所有图像相关路由都运行在 Next.js Node runtime，不能部署到 Edge runtime。
