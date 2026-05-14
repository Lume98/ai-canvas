"use client"

import { ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { CapsulePanelDefinition } from "./model"

const panelFrameClassName =
  "pointer-events-auto flex max-h-[min(600px,calc(100svh-32px))] w-[min(360px,calc(100vw-94px))] flex-col overflow-hidden rounded-[30px] border border-[oklch(0.87_0.008_245)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,251,252,0.94))] shadow-[0_18px_40px_oklch(0.2_0.015_245_/_0.08),0_36px_90px_oklch(0.18_0.018_245_/_0.12)] ring-1 ring-white/90 backdrop-blur-xl"

const panelHeaderClassName =
  "flex shrink-0 items-start justify-between gap-4 border-b border-[oklch(0.9_0.006_245)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,249,250,0.88))] px-5 py-4"

const panelBodyClassName =
  "min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,251,0.92))] px-4 pb-4 pt-3"

export function CapsuleNavPanelFrame({
  children,
  panel,
  onClose,
}: {
  children: ReactNode
  panel: CapsulePanelDefinition
  onClose: () => void
}) {
  return (
    <aside className={panelFrameClassName}>
      <header className={panelHeaderClassName}>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[oklch(0.54_0.035_190)] uppercase">
            {panel.eyebrow}
          </p>
          <h2 className="mt-1.5 text-[15px] font-semibold text-[oklch(0.23_0.018_245)]">
            {panel.title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          className="rounded-full border border-transparent text-[oklch(0.46_0.012_245)] hover:border-[oklch(0.86_0.01_245)] hover:bg-white/80 hover:text-[oklch(0.22_0.02_245)]"
          aria-label="关闭面板"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className={panelBodyClassName}>{children}</div>
    </aside>
  )
}
