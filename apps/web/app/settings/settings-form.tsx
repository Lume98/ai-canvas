"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import {
  clearAiProviderConfig,
  defaultAiProviderConfig,
  defaultOpenAIBaseUrl,
  readAiProviderConfig,
  writeAiProviderConfig,
} from "../ai-config"

const inputClass =
  "w-full rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-[oklch(0.56_0.025_245)] focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"

export function SettingsForm() {
  const [apiKey, setApiKey] = useState(defaultAiProviderConfig.apiKey)
  const [baseUrl, setBaseUrl] = useState(defaultAiProviderConfig.baseUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      try {
        const config = await readAiProviderConfig()

        if (!isMounted) return

        setApiKey(config.apiKey)
        setBaseUrl(config.baseUrl)
      } catch (caughtError) {
        if (!isMounted) return

        setStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "读取接口配置失败。"
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSaving(true)
    setStatus("")

    try {
      const config = await writeAiProviderConfig({
        apiKey,
        baseUrl,
      })

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setStatus("配置已保存")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "保存接口配置失败。"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    setIsSaving(true)
    setStatus("")

    try {
      const config = await clearAiProviderConfig()

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setStatus("已恢复默认配置")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "清空接口配置失败。"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="h-svh overflow-hidden bg-[oklch(0.985_0.012_92)] text-[oklch(0.17_0.018_245)]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-[oklch(0.83_0.025_75)] bg-white/45 px-5 py-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
                Provider Settings
              </p>
              <h1 className="mt-2 text-2xl font-semibold">AI 接口配置</h1>
            </div>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="size-4" />
                返回画布
              </Link>
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-3xl">
            <form
              className="space-y-6 rounded-lg border border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)] p-5 shadow-sm"
              onSubmit={handleSubmit}
            >
              <label className="block">
                <span className="text-sm font-medium">API Key</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={apiKey}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isLoading || isSaving}
                  onChange={(event) => {
                    setApiKey(event.target.value)
                    setStatus("")
                  }}
                  placeholder="sk-..."
                />
                <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
                  保存在 Worker，后台任务和同步生成共用这份配置。
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Base URL</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={baseUrl}
                  type="url"
                  spellCheck={false}
                  disabled={isLoading || isSaving}
                  onChange={(event) => {
                    setBaseUrl(event.target.value)
                    setStatus("")
                  }}
                  placeholder={defaultOpenAIBaseUrl}
                />
                <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
                  默认是 OpenAI 官方地址。兼容代理或 OpenAI-compatible
                  服务时，填写到 API 版本根路径，例如
                  https://api.openai.com/v1。
                </span>
              </label>

              {status ? (
                <div className="rounded-md border border-[oklch(0.72_0.11_168)] bg-[oklch(0.95_0.035_168)] px-3 py-2 text-sm text-[oklch(0.32_0.09_168)]">
                  {status}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading || isSaving}
                  onClick={handleReset}
                >
                  <RotateCcw className="size-4" />
                  恢复默认
                </Button>
                <Button
                  className="bg-[oklch(0.22_0.04_245)] text-white hover:bg-[oklch(0.29_0.05_245)]"
                  disabled={isLoading || isSaving}
                  type="submit"
                >
                  <Save className="size-4" />
                  {isSaving ? "保存中" : "保存配置"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
