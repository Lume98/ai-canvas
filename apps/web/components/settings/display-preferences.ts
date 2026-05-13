import {
  GeneratedImageDisplayFieldKey,
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
  generatedImageDisplayFieldKeys,
  getGeneratedImageDisplayPreset,
  isGeneratedImageDisplayPresetKey,
  resolveGeneratedImageDisplayPreset,
} from "@/components/generated-image/generated-image-display-presets"

export type CanvasDisplayPreferences = {
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
}

type StoredCanvasDisplayPreferences = {
  imageDisplayFields?: Partial<Record<string, unknown>>
  imageDisplayPreset?: string
}

export const defaultCanvasDisplayPreferences: CanvasDisplayPreferences = {
  imageDisplayFields: {},
  imageDisplayPreset: "timeline",
}

const DISPLAY_PREFERENCES_STORAGE_KEY = "canvas/display-preferences"

export function parseCanvasDisplayPreferences(
  value: StoredCanvasDisplayPreferences | null | undefined
): CanvasDisplayPreferences {
  const presetValue = value?.imageDisplayPreset

  return {
    imageDisplayFields: parseImageDisplayFields(value?.imageDisplayFields),
    imageDisplayPreset:
      typeof presetValue === "string" &&
      isGeneratedImageDisplayPresetKey(presetValue)
        ? presetValue
        : defaultCanvasDisplayPreferences.imageDisplayPreset,
  }
}

export function readCanvasDisplayPreferences(): CanvasDisplayPreferences {
  if (typeof window === "undefined") {
    return defaultCanvasDisplayPreferences
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)

    if (!raw) {
      return defaultCanvasDisplayPreferences
    }

    const parsed = JSON.parse(raw) as StoredCanvasDisplayPreferences
    return parseCanvasDisplayPreferences(parsed)
  } catch {
    return defaultCanvasDisplayPreferences
  }
}

export function writeCanvasDisplayPreferences(
  input: Partial<CanvasDisplayPreferences>
): CanvasDisplayPreferences {
  const nextPreferences = parseCanvasDisplayPreferences({
    ...readCanvasDisplayPreferences(),
    ...input,
  })

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(nextPreferences)
    )
  }

  return nextPreferences
}

export function clearCanvasDisplayPreferences(): CanvasDisplayPreferences {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DISPLAY_PREFERENCES_STORAGE_KEY)
  }

  return defaultCanvasDisplayPreferences
}

export function normalizeImageDisplayPreset(
  value: string
): GeneratedImageDisplayPresetKey {
  return getGeneratedImageDisplayPreset(value).variant
}

export function resolveCanvasDisplayFieldStates(
  preferences: CanvasDisplayPreferences
): Record<GeneratedImageDisplayFieldKey, boolean> {
  const resolvedPreset = resolveGeneratedImageDisplayPreset(
    getGeneratedImageDisplayPreset(preferences.imageDisplayPreset),
    preferences.imageDisplayFields
  )
  const infoPanel = resolvedPreset.infoPanel

  return {
    dimensions: infoPanel?.showDimensions ?? false,
    model: infoPanel?.showModel ?? false,
    order: resolvedPreset.showOrderBadges,
    prompt: infoPanel?.showPrompt ?? false,
    quality: infoPanel?.showQuality ?? false,
    size: infoPanel?.showSize ?? false,
  }
}

function parseImageDisplayFields(
  value: Partial<Record<string, unknown>> | undefined
): GeneratedImageDisplayFieldOverrides {
  const fields: GeneratedImageDisplayFieldOverrides = {}

  if (!value) return fields

  for (const key of generatedImageDisplayFieldKeys) {
    const nextValue = value[key]

    if (typeof nextValue === "boolean") {
      fields[key as GeneratedImageDisplayFieldKey] = nextValue
    }
  }

  return fields
}
