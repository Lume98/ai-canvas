import { CanvasHistory } from "@/components/canvas/canvas-history"
import { GeneratedImageDisplayFieldOverrides } from "@/components/generated-image/generated-image-display-presets"
import { GeneratedImageDisplayPresetKey } from "@/components/generated-image/generated-image-display-presets"
import { HistoryResult } from "@/components/generated-image/generated-image-types"

export function HistoryPanelContent({
  imageDisplayFields,
  imageDisplayPreset,
  results,
  onResultSelect,
}: {
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  results: HistoryResult[]
  onResultSelect: (result: HistoryResult) => void
}) {
  return (
    <div className="rounded-[22px] border border-[oklch(0.9_0.007_245)] bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="h-[min(450px,calc(100svh-156px))] overflow-hidden rounded-[18px] bg-[oklch(0.985_0.003_245)]">
        <CanvasHistory
          imageDisplayFields={imageDisplayFields}
          imageDisplayPreset={imageDisplayPreset}
          results={results}
          onSelectResult={onResultSelect}
        />
      </div>
    </div>
  )
}
