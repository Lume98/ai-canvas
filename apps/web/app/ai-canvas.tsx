"use client"

import { FormEvent, useEffect, useState } from "react"
import { CanvasStage } from "./components/canvas-stage"
import {
  CanvasItem,
  ImageResult,
  models,
  promptSeeds,
  qualities,
  sizes,
} from "./components/canvas-types"
import { FloatingCapsuleNav } from "./components/floating-capsule-nav"
import { PromptComposer } from "./components/prompt-composer"
import { defaultAiProviderConfig, readAiProviderConfig } from "./ai-config"

export function AiCanvas() {
  const [providerConfig, setProviderConfig] = useState(defaultAiProviderConfig)
  const [isConfigLoading, setIsConfigLoading] = useState(true)
  const [prompt, setPrompt] = useState(promptSeeds[0] ?? "")
  const [model, setModel] = useState(models[0]?.value ?? "gpt-image-2")
  const [size, setSize] = useState(sizes[0] ?? "1024x1024")
  const [quality, setQuality] = useState(qualities[0] ?? "auto")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<ImageResult[]>([])
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{
    centerX: number
    centerY: number
    requestId: number
  } | null>(null)

  const hasApiKey = providerConfig.hasApiKey
  const canGenerate =
    prompt.trim().length > 0 && hasApiKey && !isConfigLoading && !isGenerating

  useEffect(() => {
    let isMounted = true

    async function loadProviderConfig() {
      try {
        const config = await readAiProviderConfig()

        if (isMounted) {
          setProviderConfig(config)
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "读取接口配置失败。"
          )
        }
      } finally {
        if (isMounted) {
          setIsConfigLoading(false)
        }
      }
    }

    loadProviderConfig()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canGenerate) return

    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          size,
          quality,
        }),
      })

      const payload = (await response.json()) as {
        image?: string
        error?: string
      }
      const image = payload.image

      if (!response.ok || typeof image !== "string") {
        throw new Error(payload.error || "生成失败，请检查接口配置。")
      }

      const resultId = crypto.randomUUID()
      const itemSize = parseCanvasItemSize(size)
      const itemId = crypto.randomUUID()
      const itemPosition = getNextCanvasItemPosition(
        canvasItems.length,
        itemSize,
      )

      setResults((current) => [
        {
          id: resultId,
          url: image,
          prompt: prompt.trim(),
          model,
          size,
          quality,
        },
        ...current,
      ])
      setCanvasItems((current) => [
        ...current,
        {
          id: itemId,
          resultId,
          ...itemSize,
          ...itemPosition,
        },
      ])
      setSelectedItemId(itemId)
      setFocusRequest({
        centerX: itemPosition.x + itemSize.width / 2,
        centerY: itemPosition.y + itemSize.height / 2,
        requestId: Date.now(),
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "生成失败，请稍后重试。"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSelectResult(result: ImageResult) {
    const item = canvasItems.find((entry) => entry.resultId === result.id)

    if (item) {
      setSelectedItemId(item.id)
      setFocusRequest({
        centerX: item.x + item.width / 2,
        centerY: item.y + item.height / 2,
        requestId: Date.now(),
      })
    }
  }

  return (
    <main className="relative h-svh overflow-hidden bg-white text-[oklch(0.17_0.018_245)]">
      <FloatingCapsuleNav
        prompts={promptSeeds}
        results={results}
        onConfigChange={setProviderConfig}
        onPromptSelect={setPrompt}
        onResultSelect={handleSelectResult}
      />
      <div className="grid h-full min-h-0 grid-cols-1">
        <section className="flex min-h-0 flex-col overflow-hidden">
          <CanvasStage
            canvasItems={canvasItems}
            focusRequest={focusRequest}
            isGenerating={isGenerating}
            results={results}
            selectedItemId={selectedItemId}
            onCanvasItemsChange={setCanvasItems}
            onSelectedItemChange={setSelectedItemId}
          />

          <div className="pointer-events-none absolute right-4 bottom-6 left-4 z-30 sm:bottom-8">
            <PromptComposer
              canGenerate={canGenerate}
              error={error}
              isGenerating={isGenerating}
              model={model}
              prompt={prompt}
              quality={quality}
              size={size}
              onModelChange={setModel}
              onPromptChange={setPrompt}
              onQualityChange={setQuality}
              onSizeChange={setSize}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function parseCanvasItemSize(size: string) {
  const match = /^(\d+)x(\d+)$/.exec(size)

  if (!match) {
    return {
      width: 1024,
      height: 1024,
    }
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  }
}

function getNextCanvasItemPosition(
  itemCount: number,
  size: { width: number; height: number },
) {
  const gap = 180
  const columns = 3
  const column = itemCount % columns
  const row = Math.floor(itemCount / columns)
  const cellWidth = 1024 + gap
  const cellHeight = 1024 + gap
  const x = column * cellWidth - ((columns - 1) * cellWidth) / 2
  const y = row * cellHeight

  return {
    x: x - size.width / 2,
    y: y - size.height / 2,
  }
}
