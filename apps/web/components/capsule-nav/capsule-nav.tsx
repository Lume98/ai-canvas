"use client"

import { type RefObject, useEffect, useId, useMemo, useState } from "react"

import { type AiProviderConfig } from "@/components/settings/config/ai-provider-config"
import { type CanvasDisplayPreferences } from "@/components/settings/config/display-preferences"
import {
  type CapsuleNavPanelContext,
  useCapsulePanels,
} from "./model"
import { CapsuleNavPanelFrame } from "./panel-frame"
import { CapsuleNavShell } from "./shell"
import { CapsuleSettingsDialog } from "./settings-dialog"
import { type CapsulePanelDefinition } from "./model"

type CapsuleNavProps = {
  panelContext: CapsuleNavPanelContext
  layoutRootRef: RefObject<HTMLElement | null>
  onConfigChange: (config: AiProviderConfig) => void
  onDisplayPreferencesChange: (preferences: CanvasDisplayPreferences) => void
  userName?: string
}

export function CapsuleNav({
  layoutRootRef,
  onConfigChange,
  onDisplayPreferencesChange,
  panelContext,
  userName = "Canvas User",
}: CapsuleNavProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [profileStatus, setProfileStatus] = useState("")
  const settingsTitleId = useId()
  const initial = userName.trim().charAt(0).toUpperCase() || "C"
  const renderContext = useMemo(
    () => ({
      panelContext: {
        ...panelContext,
        user: {
          ...panelContext.user,
          name: userName,
        },
      },
      shell: {
        onOpenSettings: () => {
          setIsSettingsOpen(true)
        },
      },
      profile: {
        initial,
        setStatus: setProfileStatus,
        status: profileStatus,
      },
    }),
    [initial, panelContext, profileStatus, userName]
  )
  const { panelMap, panels } = useCapsulePanels()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  function handleRenderPanel(
    panel: CapsulePanelDefinition,
    closePanel: () => void
  ) {
    const actionContext: CapsuleNavPanelContext = {
      ...panelContext,
      user: {
        ...panelContext.user,
        name: userName,
      },
      actions: {
        ...panelContext.actions,
        onPromptSelect: (prompt) => {
          panelContext.actions.onPromptSelect(prompt)
          closePanel()
        },
        onResultSelect: (result) => {
          panelContext.actions.onResultSelect(result)
          closePanel()
        },
        onRetryTask: (task) => {
          panelContext.actions.onRetryTask(task)
          closePanel()
        },
        onUseAssetAsGenerationSource: (asset) => {
          panelContext.actions.onUseAssetAsGenerationSource(asset)
          closePanel()
        },
        onUseTaskAsDraft: (task) => {
          panelContext.actions.onUseTaskAsDraft(task)
          closePanel()
        },
      },
    }
    const resolvedRenderContext = {
      panelContext: actionContext,
      shell: {
        onOpenSettings: () => {
          setIsSettingsOpen(true)
          closePanel()
        },
      },
      profile: {
        initial,
        setStatus: setProfileStatus,
        status: profileStatus,
      },
    }

    return (
      <CapsuleNavPanelFrame panel={panel} onClose={closePanel}>
        {panel.render(resolvedRenderContext)}
      </CapsuleNavPanelFrame>
    )
  }

  return (
    <>
      <CapsuleNavShell
        layoutRootRef={layoutRootRef}
        panelMap={panelMap}
        panels={panels}
        renderContext={renderContext}
        onPanelChange={() => {
          setProfileStatus("")
        }}
        renderPanel={handleRenderPanel}
      />

      <CapsuleSettingsDialog
        isOpen={isSettingsOpen}
        titleId={settingsTitleId}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={onConfigChange}
        onDisplayPreferencesChange={onDisplayPreferencesChange}
      />
    </>
  )
}
