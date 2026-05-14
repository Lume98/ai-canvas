import type { ViewportTransform } from "./types"
import { describePendingPlaceholderSummary } from "./placeholder-utils"
import type { PendingImagePlaceholder } from "./placeholder-utils"

export function CanvasZoomBadge({ viewport }: { viewport: ViewportTransform }) {
  return (
    <div className="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-2 rounded-md border border-[oklch(0.82_0.025_245)] bg-white/90 px-2.5 py-1 text-xs font-medium text-[oklch(0.35_0.025_245)] shadow-sm backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.14_168)]" />
      {Math.round(viewport.scale * 100)}%
    </div>
  )
}

export function CanvasGenerationStatus({
  isGenerating,
  pendingPlaceholders,
}: {
  isGenerating: boolean
  pendingPlaceholders: PendingImagePlaceholder[]
}) {
  if (!isGenerating) return null

  return (
    <div className="pointer-events-none absolute inset-x-6 bottom-8 z-30 flex justify-center">
      <div className="rounded-full border border-[oklch(0.8_0.022_75)] bg-white/90 px-3 py-1.5 text-xs font-medium text-[oklch(0.34_0.025_245)] shadow-sm backdrop-blur">
        {describePendingPlaceholderSummary(pendingPlaceholders)}
      </div>
    </div>
  )
}
