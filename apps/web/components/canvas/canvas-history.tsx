import { HistoryResult } from "@/components/generated-image/generated-image-types"
import { GeneratedImagePresetCard } from "@/components/generated-image/generated-image-card"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

type CanvasHistoryProps = {
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  results: HistoryResult[]
  onSelectResult: (result: HistoryResult) => void
}

export function CanvasHistory({
  imageDisplayFields,
  imageDisplayPreset,
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
              className="group rounded-md text-left transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.14_168/0.28)] focus-visible:outline-none"
              key={item.id}
              type="button"
              onClick={() => onSelectResult(item)}
            >
              <div className="relative aspect-square">
                <GeneratedImagePresetCard
                  fieldOverrides={imageDisplayFields}
                  image={item}
                  preset={imageDisplayPreset}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
