import { SetStateAction, useEffect, useRef } from "react"
import { useImmerReducer } from "use-immer"

import {
  type AiProviderConfig,
  clearAiProviderConfig,
  defaultAiProviderConfig,
  readAiProviderConfig,
  writeAiProviderConfig,
} from "@/components/settings/config/ai-provider-config"
import {
  type CanvasDisplayPreferences,
  clearCanvasDisplayPreferences,
  defaultCanvasDisplayPreferences,
  readCanvasDisplayPreferences,
  resolveCanvasDisplayFieldStates,
  writeCanvasDisplayPreferences,
} from "@/components/settings/config/display-preferences"

type SettingsFormState = {
  apiKey: string
  baseUrl: string
  imageDisplayPreset: CanvasDisplayPreferences["imageDisplayPreset"]
  imageDisplayFields: CanvasDisplayPreferences["imageDisplayFields"]
  isLoading: boolean
  isSaving: boolean
  status: string
}

type SettingsFormAction = (draft: SettingsFormState) => void

const initialSettingsFormState: SettingsFormState = {
  apiKey: defaultAiProviderConfig.apiKey,
  baseUrl: defaultAiProviderConfig.baseUrl,
  imageDisplayPreset: defaultCanvasDisplayPreferences.imageDisplayPreset,
  imageDisplayFields: defaultCanvasDisplayPreferences.imageDisplayFields,
  isLoading: true,
  isSaving: false,
  status: "",
}

type UseSettingsFormStateOptions = {
  onConfigChange?: (config: AiProviderConfig) => void
  onDisplayPreferencesChange?: (preferences: CanvasDisplayPreferences) => void
}

export function useSettingsFormState({
  onConfigChange,
  onDisplayPreferencesChange,
}: UseSettingsFormStateOptions) {
  const onConfigChangeRef = useRef(onConfigChange)
  const onDisplayPreferencesChangeRef = useRef(onDisplayPreferencesChange)
  const [state, dispatch] = useImmerReducer(
    (draft: SettingsFormState, action: SettingsFormAction) => {
      action(draft)
    },
    initialSettingsFormState,
  )

  useEffect(() => {
    onConfigChangeRef.current = onConfigChange
  }, [onConfigChange])

  useEffect(() => {
    onDisplayPreferencesChangeRef.current = onDisplayPreferencesChange
  }, [onDisplayPreferencesChange])

  const setField = <K extends keyof SettingsFormState>(
    key: K,
    next: SetStateAction<SettingsFormState[K]>,
  ) => {
    dispatch((draft) => {
      draft[key] = applySetStateAction(draft[key], next)
    })
  }

  const setApiKey = (next: SetStateAction<string>) => {
    setField("apiKey", next)
  }
  const setBaseUrl = (next: SetStateAction<string>) => {
    setField("baseUrl", next)
  }
  const setImageDisplayPreset = (
    next: SetStateAction<CanvasDisplayPreferences["imageDisplayPreset"]>,
  ) => {
    setField("imageDisplayPreset", next)
  }
  const setImageDisplayFields = (
    next: SetStateAction<CanvasDisplayPreferences["imageDisplayFields"]>,
  ) => {
    setField("imageDisplayFields", next)
  }
  const setIsLoading = (next: SetStateAction<boolean>) => {
    setField("isLoading", next)
  }
  const setIsSaving = (next: SetStateAction<boolean>) => {
    setField("isSaving", next)
  }
  const setStatus = (next: SetStateAction<string>) => {
    setField("status", next)
  }

  const notifySettingsChange = (
    config: AiProviderConfig,
    displayPreferences: CanvasDisplayPreferences,
  ) => {
    onConfigChangeRef.current?.(config)
    onDisplayPreferencesChangeRef.current?.(displayPreferences)
  }

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      try {
        const config = await readAiProviderConfig()

        if (!isMounted) return

        setApiKey(config.apiKey)
        setBaseUrl(config.baseUrl)

        const displayPreferences = readCanvasDisplayPreferences()
        setImageDisplayPreset(displayPreferences.imageDisplayPreset)
        setImageDisplayFields(displayPreferences.imageDisplayFields)

        onConfigChangeRef.current?.(config)
        onDisplayPreferencesChangeRef.current?.(displayPreferences)
      } catch (caughtError) {
        if (!isMounted) return

        setStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "读取接口配置失败。",
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadConfig()

    return () => {
      isMounted = false
    }
  }, [])

  const resolvedDisplayFields = resolveCanvasDisplayFieldStates({
    imageDisplayFields: state.imageDisplayFields,
    imageDisplayPreset: state.imageDisplayPreset,
  })

  async function saveSettings() {
    setIsSaving(true)
    setStatus("")

    try {
      const config = await writeAiProviderConfig({
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
      })
      const displayPreferences = writeCanvasDisplayPreferences({
        imageDisplayFields: state.imageDisplayFields,
        imageDisplayPreset: state.imageDisplayPreset,
      })

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setImageDisplayPreset(displayPreferences.imageDisplayPreset)
      setImageDisplayFields(displayPreferences.imageDisplayFields)

      notifySettingsChange(config, displayPreferences)
      setStatus("配置已保存")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "保存接口配置失败。",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function resetSettings() {
    setIsSaving(true)
    setStatus("")

    try {
      const config = await clearAiProviderConfig()
      const displayPreferences = clearCanvasDisplayPreferences()

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setImageDisplayPreset(displayPreferences.imageDisplayPreset)
      setImageDisplayFields(displayPreferences.imageDisplayFields)

      notifySettingsChange(config, displayPreferences)
      setStatus("已恢复默认配置")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "清空接口配置失败。",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return {
    ...state,
    resolvedDisplayFields,
    setApiKey,
    setBaseUrl,
    setImageDisplayPreset,
    setImageDisplayFields,
    setStatus,
    saveSettings,
    resetSettings,
  }
}

function applySetStateAction<T>(current: T, next: SetStateAction<T>): T {
  return typeof next === "function"
    ? (next as (value: T) => T)(current)
    : next
}
