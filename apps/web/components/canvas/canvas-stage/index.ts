export { EmptyCanvas } from "./empty-canvas"
export { InfiniteCanvas } from "./infinite-canvas"

export { CanvasConnectionLayer } from "./connection-layer"
export { CanvasPendingPlaceholderLayer } from "./pending-placeholder-layer"

export {
  CanvasGenerationStatus,
  CanvasSurfaceBackdrop,
  CanvasViewportContent,
  CanvasZoomBadge,
  getCanvasSurfaceStyle,
} from "./surface-overlays"

export { useCanvasNavigation } from "./navigation"
export { useCanvasItemDrag } from "./use-canvas-item-drag"

export {
  AXIS_STEP,
  AXIS_VISIBLE_RADIUS,
  GRID_SIZE,
  MAJOR_GRID_INTERVAL,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_SENSITIVITY,
} from "./constants"

export type {
  CanvasStageHandle,
  CanvasStageProps,
  CanvasSurfaceHandle,
  CanvasSurfaceStyle,
  CanvasZoomGesture,
  FocusRequest,
  InfiniteCanvasProps,
  ViewportTransform,
} from "./types"
