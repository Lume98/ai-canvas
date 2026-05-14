import { CoordinateOverlay } from "./coordinate-overlay"
import type { ViewportTransform } from "./types"

export function CanvasSurfaceBackdrop({
  viewport,
}: {
  viewport: ViewportTransform
}) {
  return (
    <>
      <div
        className={[
          "absolute inset-0 bg-[oklch(0.992_0.003_245)]",
          "bg-[radial-gradient(circle,oklch(0.78_0.018_245)_1px,transparent_1.25px)]",
          "bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)]",
          "bg-[length:var(--canvas-grid-size)_var(--canvas-grid-size)]",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0 opacity-75",
          "bg-[linear-gradient(to_right,oklch(0.73_0.018_245/0.26)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.73_0.018_245/0.26)_1px,transparent_1px)]",
          "bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)]",
          "bg-[length:var(--canvas-major-grid-size)_var(--canvas-major-grid-size)]",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0_42%,oklch(0.94_0.006_245/0.84)_100%)]"
      />
      <CoordinateOverlay viewport={viewport} />
    </>
  )
}
