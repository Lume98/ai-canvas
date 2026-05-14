import type { ReactNode } from "react"

import type { ViewportTransform } from "./types"

export function CanvasViewportContent({
  children,
  viewport,
}: {
  children: ReactNode
  viewport: ViewportTransform
}) {
  return (
    <div
      className="absolute inset-0 z-20 will-change-transform"
      style={{
        transform: `translate3d(${viewport.pan.x}px, ${viewport.pan.y}px, 0) scale(${viewport.scale})`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  )
}
