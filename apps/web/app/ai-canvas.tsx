"use client"

import { FormEvent, useEffect, useState } from "react"
import { CanvasStage } from "./components/canvas-stage"
import {
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

  const activeResult = results[0]
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

      setResults((current) => [
        {
          id: crypto.randomUUID(),
          url: image,
          prompt: prompt.trim(),
          model,
          size,
          quality,
        },
        ...current,
      ])
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
    setResults((current) => [
      result,
      ...current.filter((entry) => entry.id !== result.id),
    ])
  }

  return (
    <main className="relative h-svh overflow-hidden bg-[oklch(0.985_0.012_92)] text-[oklch(0.17_0.018_245)]">
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
            activeResult={activeResult}
            isGenerating={isGenerating}
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
