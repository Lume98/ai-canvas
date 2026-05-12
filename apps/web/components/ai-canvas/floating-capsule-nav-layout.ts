import { RefObject, useLayoutEffect } from "react"

import { AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE } from "./layout-tokens"

export function useCapsuleNavFootprint({
  layoutRootRef,
  navRef,
}: {
  layoutRootRef: RefObject<HTMLElement | null>
  navRef: RefObject<HTMLElement | null>
}) {
  useLayoutEffect(() => {
    const navElement = navRef.current
    const layoutRootElement = layoutRootRef.current

    if (!navElement || !layoutRootElement) return

    const measuredNavElement = navElement
    const measuredLayoutRootElement = layoutRootElement

    let frameId = 0
    let lastWidth = -1

    function syncNavFootprint() {
      frameId = 0
      const nextWidth = Math.ceil(
        measuredNavElement.getBoundingClientRect().width,
      )

      if (nextWidth === lastWidth) {
        return
      }

      lastWidth = nextWidth
      measuredLayoutRootElement.style.setProperty(
        AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE,
        `${nextWidth}px`,
      )
    }

    syncNavFootprint()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(syncNavFootprint)
    })

    observer.observe(measuredNavElement)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      observer.disconnect()
    }
  }, [layoutRootRef, navRef])
}
