import { getOpenApiDocument } from "@/lib/openapi"

const document = getOpenApiDocument()
const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    id: operation.operationId,
    method: method.toUpperCase(),
    path,
    summary: operation.summary,
    tags: operation.tags.join(", "),
    responses: Object.keys(operation.responses).join(", "),
  })),
)

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-700">
            OpenAPI 3.1
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {document.info.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {document.info.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href="/openapi.json"
              className="rounded-full bg-slate-950 px-4 py-2 font-medium text-white"
            >
              查看 /openapi.json
            </a>
            <span className="rounded-full border border-slate-200 px-4 py-2 text-slate-600">
              Version {document.info.version}
            </span>
            <span className="rounded-full border border-slate-200 px-4 py-2 text-slate-600">
              {operations.length} 个操作
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {document.tags.map((tag) => (
            <article
              key={tag.name}
              className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-950">{tag.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{tag.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-950">接口总览</h2>
            <p className="mt-1 text-sm text-slate-600">
              这页是可读视图，正式契约以 `/openapi.json` 为准。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Method</th>
                  <th className="px-6 py-4 font-medium">Path</th>
                  <th className="px-6 py-4 font-medium">Summary</th>
                  <th className="px-6 py-4 font-medium">Tags</th>
                  <th className="px-6 py-4 font-medium">Responses</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => (
                  <tr key={operation.id} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800">
                        {operation.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-slate-800">
                      {operation.path}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{operation.summary}</td>
                    <td className="px-6 py-4 text-slate-500">{operation.tags}</td>
                    <td className="px-6 py-4 text-slate-500">{operation.responses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          <h2 className="text-lg font-semibold">设计约束</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>当前文档源是代码内集中维护的 OpenAPI 对象，不做运行时自动扫描。</li>
            <li>如果业务校验规则变更，必须同步修改 `apps/web/lib/openapi.ts`，否则会发生契约漂移。</li>
            <li>错误响应目前统一为 <code>{"{ error, code? }"}</code>，但不同接口的错误语义还没有完全收敛。</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
