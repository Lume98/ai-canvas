import { AXIS_STEP, AXIS_VISIBLE_RADIUS } from "./constants"
import type { ViewportTransform } from "./types"

export function CoordinateOverlay({ viewport }: { viewport: ViewportTransform }) {
  const worldCenter = {
    x: -viewport.pan.x / viewport.scale,
    y: -viewport.pan.y / viewport.scale,
  }
  const visibleWorldRadius = AXIS_VISIBLE_RADIUS / viewport.scale
  const xTicks = createAxisTicks(
    worldCenter.x - visibleWorldRadius,
    worldCenter.x + visibleWorldRadius
  ).filter((value) => value !== 0)
  const yTicks = createAxisTicks(
    worldCenter.y - visibleWorldRadius,
    worldCenter.y + visibleWorldRadius
  ).filter((value) => value !== 0)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden text-[10px] font-medium text-[oklch(0.38_0.03_245)]">
      <div
        className="absolute h-px bg-[oklch(0.42_0.08_245/0.48)] shadow-[0_0_0_1px_oklch(1_0_0/0.64)]"
        style={{
          left: 0,
          right: 0,
          top: `calc(50% + ${viewport.pan.y}px)`,
        }}
      />
      <div
        className="absolute w-px bg-[oklch(0.42_0.08_245/0.48)] shadow-[0_0_0_1px_oklch(1_0_0/0.64)]"
        style={{
          bottom: 0,
          left: `calc(50% + ${viewport.pan.x}px)`,
          top: 0,
        }}
      />
      <OriginMarker viewport={viewport} />
      {xTicks.map((value) => (
        <AxisTick
          axis="x"
          key={`x-${value}`}
          scale={viewport.scale}
          value={value}
          viewport={viewport}
        />
      ))}
      {yTicks.map((value) => (
        <AxisTick
          axis="y"
          key={`y-${value}`}
          scale={viewport.scale}
          value={value}
          viewport={viewport}
        />
      ))}
    </div>
  )
}

function AxisTick({
  axis,
  scale,
  value,
  viewport,
}: {
  axis: "x" | "y"
  scale: number
  value: number
  viewport: ViewportTransform
}) {
  if (axis === "x") {
    return (
      <div
        className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
        style={{
          left: `calc(50% + ${viewport.pan.x + value * scale}px)`,
          top: `calc(50% + ${viewport.pan.y}px)`,
        }}
      >
        <span className="h-2.5 w-px bg-[oklch(0.42_0.08_245/0.46)]" />
        <span className="rounded-[4px] border border-[oklch(0.86_0.016_245)] bg-white/78 px-1.5 py-0.5 shadow-sm backdrop-blur">
          {value}
        </span>
      </div>
    )
  }

  return (
    <div
      className="absolute flex -translate-y-1/2 items-center gap-1"
      style={{
        left: `calc(50% + ${viewport.pan.x}px)`,
        top: `calc(50% + ${viewport.pan.y + value * scale}px)`,
      }}
    >
      <span className="rounded-[4px] border border-[oklch(0.86_0.016_245)] bg-white/78 px-1.5 py-0.5 text-right shadow-sm backdrop-blur">
        {value}
      </span>
      <span className="h-px w-2.5 bg-[oklch(0.42_0.08_245/0.46)]" />
    </div>
  )
}

function OriginMarker({ viewport }: { viewport: ViewportTransform }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `calc(50% + ${viewport.pan.x}px)`,
        top: `calc(50% + ${viewport.pan.y}px)`,
      }}
    >
      <span className="block size-2.5 rounded-full border border-white bg-[oklch(0.52_0.13_168)] shadow-[0_0_0_3px_oklch(0.52_0.13_168/0.16)]" />
      <span className="absolute top-2 left-3 rounded-[4px] border border-[oklch(0.78_0.04_168)] bg-white/86 px-1.5 py-0.5 text-[10px] text-[oklch(0.28_0.08_168)] shadow-sm backdrop-blur">
        0,0
      </span>
    </div>
  )
}

function createAxisTicks(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []

  const start = Math.ceil(min / AXIS_STEP) * AXIS_STEP
  const ticks: number[] = []

  for (let value = start; value <= max; value += AXIS_STEP) {
    ticks.push(value)
  }

  return ticks
}
