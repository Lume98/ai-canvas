import Image from "next/image"

import { HistoryResult } from "./canvas-types"

type CanvasHistoryProps = {
  results: HistoryResult[]
  onSelectResult: (result: HistoryResult) => void
}

export function CanvasHistory({
  results,
  onSelectResult,
}: CanvasHistoryProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
          History
        </p>
        <h2 className="mt-2 text-lg font-semibold">生成历史</h2>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-[oklch(0.76_0.028_75)] px-3 py-8 text-center text-sm text-[oklch(0.45_0.025_245)]">
            暂无生成记录
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {results.map((item) => (
            <button
              className="group overflow-hidden rounded-md border border-[oklch(0.78_0.028_75)] bg-white text-left shadow-sm transition hover:border-[oklch(0.49_0.12_168)]"
              key={item.id}
              type="button"
              onClick={() => onSelectResult(item)}
            >
              <Image
                className="aspect-square w-full object-cover"
                width={220}
                height={220}
                unoptimized
                src={item.url}
                alt=""
              />
              <div className="px-3 py-2">
                <p className="line-clamp-2 text-xs leading-5 text-[oklch(0.36_0.025_245)]">
                  {item.prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
