"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Download,
  ImageIcon,
  LoaderCircle,
  PanelLeft,
  Settings,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { defaultAiProviderConfig, readAiProviderConfig } from "./ai-config"

type ImageResult = {
  id: string
  url: string
  prompt: string
  model: string
  size: string
  quality: string
}

const models = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
]

const sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"]
const qualities = ["auto", "high", "medium", "low"]
const controlSelectClass =
  "w-full rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"

const promptSeeds = [
  "一张极简产品海报，磨砂玻璃香水瓶放在石材台面上，柔和晨光，商业摄影",
  "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
  "为 AI 画布应用设计一个干净的应用图标，白底，精致几何形态",
]

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
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null)

  const activeResult = results[0]
  const hasApiKey = providerConfig.hasApiKey
  const hasCopiedActiveResult = activeResult?.id === copiedImageId
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

  useEffect(() => {
    if (!copiedImageId) return

    const timeoutId = window.setTimeout(() => {
      setCopiedImageId(null)
    }, 1600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copiedImageId])

  const activeMeta = useMemo(() => {
    if (!activeResult) return "等待生成"

    return `${activeResult.model} · ${activeResult.size} · ${activeResult.quality}`
  }, [activeResult])

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

  async function handleCopyShareUrl() {
    if (!activeResult) return

    try {
      const shareUrl = new URL(
        activeResult.url,
        window.location.origin
      ).toString()

      await navigator.clipboard.writeText(shareUrl)
      setCopiedImageId(activeResult.id)
    } catch {
      setError("复制链接失败，请手动打开图片后复制地址。")
    }
  }

  return (
    <main className="h-svh overflow-hidden bg-[oklch(0.985_0.012_92)] text-[oklch(0.17_0.018_245)]">
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,auto)_minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="max-h-[45svh] overflow-y-auto border-b border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)] px-5 py-5 lg:max-h-none lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
                AI Canvas
              </p>
              <h1 className="mt-2 text-2xl font-semibold">OpenAI 图像画布</h1>
            </div>
            <div className="flex size-10 items-center justify-center rounded-md bg-[oklch(0.58_0.16_42)] text-white">
              <Sparkles className="size-5" />
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md border border-[oklch(0.78_0.028_75)] bg-white/55 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">接口配置</p>
                  <p className="mt-1 truncate text-xs text-[oklch(0.45_0.025_245)]">
                    {isConfigLoading
                      ? "正在读取配置"
                      : hasApiKey
                        ? providerConfig.baseUrl
                        : "未配置 API Key"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="size-4" />
                    设置
                  </Link>
                </Button>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium">提示词</span>
              <textarea
                className="mt-2 min-h-36 w-full resize-none rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-3 text-sm leading-6 shadow-sm transition outline-none focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"
                value={prompt}
                maxLength={2400}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="描述你想生成的画面、风格、构图、光线和用途。"
              />
              <span className="mt-1 block text-right text-xs text-[oklch(0.45_0.025_245)]">
                {prompt.length}/2400
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Control label="模型">
                <select
                  className={controlSelectClass}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {models.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Control>

              <Control label="尺寸">
                <select
                  className={controlSelectClass}
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                >
                  {sizes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Control>

              <Control label="质量">
                <select
                  className={controlSelectClass}
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                >
                  {qualities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Control>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">快速提示词</p>
              <div className="grid gap-2">
                {promptSeeds.map((item) => (
                  <button
                    className="rounded-md border border-[oklch(0.78_0.028_75)] bg-white/60 px-3 py-2 text-left text-xs leading-5 text-[oklch(0.34_0.025_245)] transition hover:border-[oklch(0.49_0.12_168)] hover:bg-white"
                    key={item}
                    type="button"
                    onClick={() => setPrompt(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-[oklch(0.67_0.18_28)] bg-[oklch(0.96_0.03_28)] px-3 py-2 text-sm text-[oklch(0.38_0.14_28)]">
                {error}
              </div>
            ) : null}

            <Button
              className="h-11 w-full bg-[oklch(0.22_0.04_245)] text-white hover:bg-[oklch(0.29_0.05_245)]"
              disabled={!canGenerate}
              type="submit"
            >
              {isGenerating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {hasApiKey ? "生成图像" : "先配置 API Key"}
            </Button>
          </form>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[oklch(0.83_0.025_75)] bg-white/50 px-5">
            <div className="flex items-center gap-3">
              <PanelLeft className="size-4 text-[oklch(0.46_0.08_168)]" />
              <div>
                <p className="text-sm font-medium">生成结果</p>
                <p className="text-xs text-[oklch(0.45_0.025_245)]">
                  {activeMeta}
                </p>
              </div>
            </div>

            {activeResult ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCopyShareUrl}
                >
                  {hasCopiedActiveResult ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {hasCopiedActiveResult ? "已复制" : "复制链接"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a download="ai-canvas.png" href={activeResult.url}>
                    <Download className="size-4" />
                    下载
                  </a>
                </Button>
              </div>
            ) : null}
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-h-0 overflow-auto p-5">
              <div className="flex min-h-full items-center justify-center">
                <div className="relative flex aspect-square w-full max-w-[720px] items-center justify-center overflow-hidden rounded-lg border border-[oklch(0.78_0.028_75)] bg-[linear-gradient(45deg,oklch(0.92_0.012_88)_25%,transparent_25%),linear-gradient(-45deg,oklch(0.92_0.012_88)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,oklch(0.92_0.012_88)_75%),linear-gradient(-45deg,transparent_75%,oklch(0.92_0.012_88)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] shadow-sm">
                  {activeResult ? (
                    <Image
                      className="object-contain"
                      fill
                      unoptimized
                      src={activeResult.url}
                      alt={activeResult.prompt}
                    />
                  ) : (
                    <div className="flex max-w-sm flex-col items-center px-8 text-center">
                      <ImageIcon className="size-12 text-[oklch(0.58_0.16_42)]" />
                      <p className="mt-4 text-lg font-semibold">空画布</p>
                      <p className="mt-2 text-sm leading-6 text-[oklch(0.42_0.025_245)]">
                        配置 API Key
                        并输入提示词后生成第一张图。接口调用经由本项目服务端代理完成。
                      </p>
                    </div>
                  )}

                  {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
                      <div className="flex items-center gap-3 rounded-md border border-[oklch(0.78_0.028_75)] bg-white px-4 py-3 text-sm shadow-sm">
                        <LoaderCircle className="size-4 animate-spin text-[oklch(0.46_0.08_168)]" />
                        正在生成
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto border-t border-[oklch(0.83_0.025_75)] bg-white/35 p-4 xl:border-t-0 xl:border-l">
              <p className="text-sm font-medium">历史</p>
              <div className="mt-3 grid grid-cols-3 gap-3 xl:grid-cols-1">
                {results.length === 0 ? (
                  <div className="col-span-full rounded-md border border-dashed border-[oklch(0.76_0.028_75)] px-3 py-8 text-center text-sm text-[oklch(0.45_0.025_245)]">
                    暂无生成记录
                  </div>
                ) : null}

                {results.map((item) => (
                  <button
                    className="group overflow-hidden rounded-md border border-[oklch(0.78_0.028_75)] bg-white text-left transition hover:border-[oklch(0.49_0.12_168)]"
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setResults((current) => [
                        item,
                        ...current.filter((entry) => entry.id !== item.id),
                      ])
                    }
                  >
                    <Image
                      className="object-cover"
                      width={180}
                      height={180}
                      unoptimized
                      src={item.url}
                      alt=""
                    />
                    <div className="hidden px-2 py-2 xl:block">
                      <p className="line-clamp-2 text-xs leading-5 text-[oklch(0.36_0.025_245)]">
                        {item.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Control({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}
