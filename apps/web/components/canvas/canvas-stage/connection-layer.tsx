import type { buildCanvasConnectionSegments } from "@/components/canvas/ai-canvas-utils"

type CanvasConnectionSegments = ReturnType<typeof buildCanvasConnectionSegments>

type CanvasConnectionLayerProps = {
  segments: CanvasConnectionSegments
  selectedItemId: string | null
}

export function CanvasConnectionLayer({
  segments,
  selectedItemId,
}: CanvasConnectionLayerProps) {
  if (segments.length === 0) return null

  const bounds = segments.reduce(
    (currentBounds, segment) => ({
      minX: Math.min(currentBounds.minX, segment.from.x, segment.to.x),
      minY: Math.min(currentBounds.minY, segment.from.y, segment.to.y),
      maxX: Math.max(currentBounds.maxX, segment.from.x, segment.to.x),
      maxY: Math.max(currentBounds.maxY, segment.from.y, segment.to.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )
  const padding = 72
  const viewBoxX = bounds.minX - padding
  const viewBoxY = bounds.minY - padding
  const viewBoxWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 1)
  const viewBoxHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 1)

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute overflow-visible"
      style={{
        left: viewBoxX,
        top: viewBoxY,
        width: viewBoxWidth,
        height: viewBoxHeight,
      }}
      viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
    >
      <defs>
        <filter
          id="canvas-connection-glow"
          colorInterpolationFilters="sRGB"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="10"
            floodColor="#4f8f75"
            floodOpacity="0.18"
            stdDeviation="12"
          />
        </filter>
        <marker
          id="canvas-connection-arrow"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
          refX="11"
          refY="7"
        >
          <path d="M 1 1 L 11 7 L 1 13 z" fill="#4f8f75" fillOpacity="0.88" />
        </marker>
      </defs>
      {segments.map((segment) => {
        const path = buildCanvasConnectionPath(segment.from, segment.to)
        const isLinkedToSelection =
          selectedItemId !== null &&
          (segment.fromItemId === selectedItemId ||
            segment.toItemId === selectedItemId)
        const shouldFade = selectedItemId !== null && !isLinkedToSelection
        const baseOpacity = shouldFade ? 0.22 : isLinkedToSelection ? 1 : 0.7
        const accentOpacity = shouldFade ? 0.14 : isLinkedToSelection ? 0.98 : 0.58
        const strokeWidth = isLinkedToSelection ? 4 : 3
        const haloWidth = isLinkedToSelection ? 24 : 18
        const endpointRadius = isLinkedToSelection ? 5.5 : 4.5

        return (
          <g key={segment.id}>
            <path
              d={path}
              fill="none"
              filter="url(#canvas-connection-glow)"
              stroke="#d6ebe2"
              strokeOpacity={baseOpacity}
              strokeLinecap="round"
              strokeWidth={haloWidth}
            />
            <path
              d={path}
              fill="none"
              markerEnd="url(#canvas-connection-arrow)"
              stroke="#4f8f75"
              strokeOpacity={accentOpacity}
              strokeDasharray="8 14"
              strokeLinecap="round"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={segment.from.x}
              cy={segment.from.y}
              fill="white"
              fillOpacity={shouldFade ? 0.82 : 1}
              r={endpointRadius}
              stroke="#4f8f75"
              strokeOpacity={accentOpacity}
              strokeWidth="2"
            />
            <circle
              cx={segment.to.x}
              cy={segment.to.y}
              fill="white"
              fillOpacity={shouldFade ? 0.82 : 1}
              r={endpointRadius}
              stroke="#4f8f75"
              strokeOpacity={accentOpacity}
              strokeWidth="2"
            />
          </g>
        )
      })}
    </svg>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildCanvasConnectionPath(
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  const deltaX = to.x - from.x
  const bendMagnitude =
    Math.abs(deltaX) < 24 ? 0 : clamp(Math.abs(deltaX) * 0.35, 72, 220)
  const bend = deltaX >= 0 ? bendMagnitude : -bendMagnitude

  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`
}
