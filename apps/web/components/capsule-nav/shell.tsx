"use client"

import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { aiCanvasCapsuleRailPositionClassName } from "@/components/canvas/layout-tokens"
import { CapsuleNavButton } from "./button"
import { useCapsuleNavFootprint } from "./layout"
import {
  CapsuleNavRenderContext,
  CapsulePanelDefinition,
  CapsulePanelKey,
} from "./model"

type ActivePanel = CapsulePanelKey | null

const capsuleRailClassName =
  "pointer-events-none fixed top-1/2 z-40 flex -translate-y-1/2 items-center"

const capsuleNavClassName =
  "pointer-events-auto relative flex flex-col items-center gap-[var(--capsule-nav-gap)] rounded-[var(--capsule-nav-radius)] border border-[oklch(0.88_0.008_245)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,249,250,0.92))] px-[var(--capsule-nav-inset)] py-[calc(var(--capsule-nav-inset)-1px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_30px_oklch(0.2_0.015_245_/_0.08),0_26px_72px_oklch(0.2_0.016_245_/_0.10)] ring-1 ring-white/85 backdrop-blur-xl"

const capsuleNavDividerClassName =
  "my-0.5 h-px w-8 bg-[linear-gradient(90deg,transparent_0%,oklch(0.84_0.008_245)_50%,transparent_100%)]"

export function CapsuleNavShell({
  layoutRootRef,
  panelMap,
  panels,
  renderContext,
  onPanelChange,
  renderPanel,
}: {
  layoutRootRef: RefObject<HTMLElement | null>
  panelMap: Record<CapsulePanelKey, CapsulePanelDefinition>
  panels: CapsulePanelDefinition[]
  renderContext: CapsuleNavRenderContext
  onPanelChange?: (panel: ActivePanel) => void
  renderPanel: (panel: CapsulePanelDefinition, close: () => void) => ReactNode
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const navRef = useRef<HTMLElement | null>(null)

  useCapsuleNavFootprint({
    layoutRootRef,
    navRef,
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePanel(null)
        onPanelChange?.(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onPanelChange])

  const leadingPanels = useMemo(
    () => panels.filter((panel) => panel.placement === "leading"),
    [panels]
  )
  const mainPanels = useMemo(
    () => panels.filter((panel) => panel.placement === "main"),
    [panels]
  )

  function handleTogglePanel(panel: CapsulePanelKey) {
    setActivePanel((current) => {
      const nextPanel = current === panel ? null : panel
      onPanelChange?.(nextPanel)
      return nextPanel
    })
  }

  function closePanel() {
    setActivePanel(null)
    onPanelChange?.(null)
  }

  return (
    <>
      {activePanel ? (
        <button
          className="fixed inset-0 z-35 bg-[rgba(255,255,255,0.08)] backdrop-blur-[1px]"
          type="button"
          aria-label="关闭快捷面板"
          onClick={closePanel}
        />
      ) : null}

      <div
        className={cn(
          capsuleRailClassName,
          aiCanvasCapsuleRailPositionClassName,
          "[--capsule-nav-gap:0.5rem] [--capsule-nav-inset:0.5rem] [--capsule-nav-radius:30px]"
        )}
      >
        <nav
          ref={navRef}
          className={capsuleNavClassName}
          aria-label="画布快捷入口"
        >
          {leadingPanels.map((panel) => (
            <CapsuleNavButton
              ariaLabel={panel.ariaLabel}
              key={panel.key}
              label={panel.navLabel}
              isActive={activePanel === panel.key}
              onClick={() => handleTogglePanel(panel.key)}
            >
              {panel.icon(renderContext)}
            </CapsuleNavButton>
          ))}
          <div className={capsuleNavDividerClassName} />
          {mainPanels.map((panel) => (
            <CapsuleNavButton
              ariaLabel={panel.ariaLabel}
              key={panel.key}
              label={panel.navLabel}
              isActive={activePanel === panel.key}
              onClick={() => handleTogglePanel(panel.key)}
            >
              {panel.icon(renderContext)}
            </CapsuleNavButton>
          ))}
        </nav>

        {activePanel ? renderPanel(panelMap[activePanel], closePanel) : null}
      </div>
    </>
  )
}
