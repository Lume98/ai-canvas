import {
  GRID_SIZE,
  MAJOR_GRID_INTERVAL,
} from "./constants"
import type { CanvasSurfaceStyle, ViewportTransform } from "./types"

export { CanvasSurfaceBackdrop } from "./backdrop-layers"
export { CanvasViewportContent } from "./viewport-content"
export {
  CanvasGenerationStatus,
  CanvasZoomBadge,
} from "./status-badges"

export function getCanvasSurfaceStyle(
  viewport: ViewportTransform
): CanvasSurfaceStyle {
  const gridSize = Math.max(GRID_SIZE * viewport.scale, 4)

  return {
    "--canvas-grid-size": `${gridSize}px`,
    "--canvas-grid-x": `calc(50% + ${viewport.pan.x}px)`,
    "--canvas-grid-y": `calc(50% + ${viewport.pan.y}px)`,
    "--canvas-major-grid-size": `${gridSize * MAJOR_GRID_INTERVAL}px`,
  }
}
