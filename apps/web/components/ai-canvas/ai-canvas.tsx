"use client"

import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

import {
  defaultAiProviderConfig,
  readAiProviderConfig,
} from "@/components/ai-canvas/ai-config"
import { CanvasStage } from "@/components/ai-canvas/canvas-stage"
import {
  createConversation,
  createConversationDrawTask,
  readConversationMessages,
  readDrawTask,
} from "@/components/ai-canvas/conversation-api"
import {
  CanvasItem,
  ConversationMessage,
  HistoryResult,
  ImageAsset,
  models,
  promptSeeds,
  qualities,
  sizes,
} from "@/components/ai-canvas/canvas-types"
import { FloatingCapsuleNav } from "@/components/ai-canvas/floating-capsule-nav"
import {
  AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE,
  DEFAULT_AI_CANVAS_NAV_FOOTPRINT_PX,
  aiCanvasLayoutRootClassName,
  aiCanvasPromptComposerDockClassName,
} from "@/components/ai-canvas/layout-tokens"
import { PromptComposer } from "@/components/ai-canvas/prompt-composer"

const CURRENT_CONVERSATION_STORAGE_KEY = "ai-canvas/current-conversation-id"

type AiCanvasLayoutStyle = CSSProperties & {
  "--ai-canvas-nav-footprint": string
}

export function AiCanvas() {
  const [providerConfig, setProviderConfig] = useState(defaultAiProviderConfig)
  const [isConfigLoading, setIsConfigLoading] = useState(true)
  const [isConversationLoading, setIsConversationLoading] = useState(true)
  const [prompt, setPrompt] = useState(promptSeeds[0] ?? "")
  const [model, setModel] = useState(models[0]?.value ?? "gpt-image-2")
  const [size, setSize] = useState(sizes[0] ?? "1024x1024")
  const [quality, setQuality] = useState(qualities[0] ?? "auto")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{
    centerX: number
    centerY: number
    requestId: number
  } | null>(null)
  const layoutRootRef = useRef<HTMLElement | null>(null)
  const pendingTaskIdsRef = useRef<Set<string>>(new Set())
  const pendingFocusAssetIdRef = useRef<string | null>(null)

  const hasApiKey = providerConfig.hasApiKey
  const canGenerate =
    prompt.trim().length > 0 &&
    hasApiKey &&
    !isConfigLoading &&
    !isConversationLoading &&
    !isGenerating &&
    Boolean(conversationId)

  const assets = useMemo(() => collectConversationAssets(messages), [messages])
  const results = useMemo(() => buildHistoryResults(messages), [messages])
  const layoutStyle: AiCanvasLayoutStyle = {
    [AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE]: `${DEFAULT_AI_CANVAS_NAV_FOOTPRINT_PX}px`,
  }

  async function refreshMessages(
    targetConversationId: string,
    cancelled: boolean,
  ) {
    const nextMessages = await readConversationMessages(targetConversationId)

    if (cancelled) return

    setMessages(nextMessages)
    setSelectedMessageId((currentSelectedMessageId) =>
      resolveNextSelectedMessageId(currentSelectedMessageId, nextMessages),
    )
    restorePendingTasks(nextMessages, targetConversationId)
  }

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
    let cancelled = false

    async function loadMessagesForConversation(targetConversationId: string) {
      const nextMessages = await readConversationMessages(targetConversationId)

      if (cancelled) return

      setMessages(nextMessages)
      setSelectedMessageId((currentSelectedMessageId) =>
        resolveNextSelectedMessageId(currentSelectedMessageId, nextMessages),
      )
    }

    async function ensureConversation() {
      try {
        const existingConversationId =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY)

        let activeConversationId = existingConversationId

        if (!activeConversationId) {
          activeConversationId = (await createConversation("当前画图会话")).id
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            CURRENT_CONVERSATION_STORAGE_KEY,
            activeConversationId
          )
        }

        if (cancelled) return

        setConversationId(activeConversationId)
        await loadMessagesForConversation(activeConversationId)
      } catch (caughtError) {
        if (existingConversationErrorNeedsReset(caughtError) && !cancelled) {
          try {
            const conversation = await createConversation("当前画图会话")

            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                CURRENT_CONVERSATION_STORAGE_KEY,
                conversation.id
              )
            }

            setConversationId(conversation.id)
            await loadMessagesForConversation(conversation.id)
            return
          } catch (retryError) {
            if (!cancelled) {
              setError(
                retryError instanceof Error
                  ? retryError.message
                  : "初始化会话失败。"
              )
            }

            return
          }
        }

        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "初始化会话失败。"
          )
        }
      } finally {
        if (!cancelled) {
          setIsConversationLoading(false)
        }
      }
    }

    void ensureConversation()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    syncCanvasItemsWithAssets(assets, setCanvasItems)
  }, [assets])

  useEffect(() => {
    if (!conversationId) return

    const activeConversationId = conversationId

    function queueFocusForTask(taskId: string, nextMessages: ConversationMessage[]) {
      const asset = collectConversationAssets(nextMessages).find(
        (entry) => entry.taskId === taskId
      )

      if (!asset) return

      pendingFocusAssetIdRef.current = asset.id
      const item = canvasItems.find((entry) => entry.assetId === asset.id)

      if (item) {
        pendingFocusAssetIdRef.current = null
        focusCanvasItem(item)
      }
    }

    function syncPendingTasks(nextMessages: ConversationMessage[]) {
      for (const message of nextMessages) {
        if (!message.task) continue

        if (
          message.task.status === "queued" ||
          message.task.status === "running"
        ) {
          if (!pendingTaskIdsRef.current.has(message.task.id)) {
            startTaskPolling(message.task.id)
          }
        } else {
          pendingTaskIdsRef.current.delete(message.task.id)
        }
      }
    }

    function startTaskPolling(taskId: string) {
      if (pendingTaskIdsRef.current.has(taskId)) {
        return
      }

      pendingTaskIdsRef.current.add(taskId)
      void pollConversationTaskUntilSettled(taskId, activeConversationId, {
        onSettled: async (task) => {
          pendingTaskIdsRef.current.delete(taskId)
          const nextMessages = await readConversationMessages(activeConversationId)
          setMessages(nextMessages)
          setSelectedMessageId((currentSelectedMessageId) =>
            resolveNextSelectedMessageId(currentSelectedMessageId, nextMessages),
          )
          syncPendingTasks(nextMessages)

          if (task.status === "succeeded") {
            queueFocusForTask(task.id, nextMessages)
          } else if (task.errorMessage) {
            setError(task.errorMessage)
          }
        },
      })
    }

    for (const message of messages) {
      if (!message.task) continue

      if (
        message.task.status === "queued" ||
        message.task.status === "running"
      ) {
        startTaskPolling(message.task.id)
      } else {
        pendingTaskIdsRef.current.delete(message.task.id)
      }
    }
  }, [canvasItems, conversationId, messages])

  useEffect(() => {
    const pendingAssetId = pendingFocusAssetIdRef.current

    if (!pendingAssetId) return

    const item = canvasItems.find((entry) => entry.assetId === pendingAssetId)

    if (!item) return

    pendingFocusAssetIdRef.current = null
    focusCanvasItem(item)
  }, [canvasItems])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canGenerate) return

    await submitGeneration({
      prompt: prompt.trim(),
      model,
      size,
      quality,
    })
  }

  function restorePendingTasks(
    nextMessages: ConversationMessage[],
    targetConversationId: string,
  ) {
    for (const message of nextMessages) {
      if (!message.task) continue

      if (
        message.task.status === "queued" ||
        message.task.status === "running"
      ) {
        const taskId = message.task.id

        if (!pendingTaskIdsRef.current.has(taskId)) {
          pendingTaskIdsRef.current.add(taskId)
          void pollConversationTaskUntilSettled(
            taskId,
            targetConversationId,
            {
              onSettled: async (settledTask) => {
                pendingTaskIdsRef.current.delete(taskId)
                const refreshedMessages =
                  await readConversationMessages(targetConversationId)
                setMessages(refreshedMessages)
                setSelectedMessageId((currentSelectedMessageId) =>
                  resolveNextSelectedMessageId(
                    currentSelectedMessageId,
                    refreshedMessages,
                  ),
                )
                restorePendingTasks(refreshedMessages, targetConversationId)

                if (settledTask.status === "succeeded") {
                  focusLatestTaskAsset(settledTask.id, refreshedMessages)
                } else if (settledTask.errorMessage) {
                  setError(settledTask.errorMessage)
                }
              },
            },
          )
        }
      } else {
        pendingTaskIdsRef.current.delete(message.task.id)
      }
    }
  }

  function handleSelectResult(result: HistoryResult) {
    const item = canvasItems.find((entry) => entry.assetId === result.id)

    if (item) {
      setSelectedMessageId(result.messageId)
      focusCanvasItem(item)
    }
  }

  function handleSelectAsset(asset: ImageAsset) {
    const item = canvasItems.find((entry) => entry.assetId === asset.id)

    setSelectedMessageId(asset.messageId)

    if (item) {
      focusCanvasItem(item)
    }
  }

  function handleSelectMessage(message: ConversationMessage) {
    setSelectedMessageId(message.id)

    const firstAsset = message.assets[0]

    if (!firstAsset) return

    const item = canvasItems.find((entry) => entry.assetId === firstAsset.id)

    if (item) {
      focusCanvasItem(item)
    }
  }

  async function handleRetryTask(task: ConversationMessage["task"]) {
    if (!task || !conversationId) return

    await submitGeneration({
      prompt: task.prompt,
      model: task.model,
      size: task.size,
      quality: task.quality,
      outputCount: task.outputCount,
    })
  }

  function handleUseTaskAsDraft(task: ConversationMessage["task"]) {
    if (!task) return

    setPrompt(task.prompt)
    setModel(task.model)
    setSize(task.size)
    setQuality(task.quality)
  }

  async function submitGeneration(input: {
    prompt: string
    model: string
    size: string
    quality: string
    outputCount?: number
  }) {
    if (!conversationId || !input.prompt.trim()) return

    setIsGenerating(true)
    setError("")

    try {
      const task = await createConversationDrawTask({
        conversationId,
        prompt: input.prompt.trim(),
        model: input.model,
        size: input.size,
        quality: input.quality,
        outputCount: input.outputCount ?? 1,
      })

      pendingTaskIdsRef.current.add(task.id)
      await refreshMessages(conversationId, false)
      await pollConversationTaskUntilSettled(task.id, conversationId, {
        onSettled: async (settledTask) => {
          pendingTaskIdsRef.current.delete(task.id)
          const nextMessages = await readConversationMessages(conversationId)
          setMessages(nextMessages)
          setSelectedMessageId((currentSelectedMessageId) =>
            resolveNextSelectedMessageId(currentSelectedMessageId, nextMessages),
          )
          restorePendingTasks(nextMessages, conversationId)

          if (settledTask.status === "succeeded") {
            focusLatestTaskAsset(settledTask.id, nextMessages)
          } else if (settledTask.errorMessage) {
            setError(settledTask.errorMessage)
          }
        },
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

  function focusLatestTaskAsset(
    taskId: string,
    nextMessages: ConversationMessage[],
  ) {
    const asset = collectConversationAssets(nextMessages).find(
      (entry) => entry.taskId === taskId
    )

    if (!asset) return

    pendingFocusAssetIdRef.current = asset.id
    const item = canvasItems.find((entry) => entry.assetId === asset.id)

    if (item) {
      pendingFocusAssetIdRef.current = null
      focusCanvasItem(item)
    }
  }

  function focusCanvasItem(item: CanvasItem) {
    setSelectedItemId(item.id)
    setFocusRequest({
      centerX: item.x + item.width / 2,
      centerY: item.y + item.height / 2,
      requestId: Date.now(),
    })
  }

  return (
    <main
      ref={layoutRootRef}
      className={cn(
        "relative h-svh overflow-hidden bg-white text-[oklch(0.17_0.018_245)]",
        aiCanvasLayoutRootClassName,
      )}
      style={layoutStyle}
    >
      <FloatingCapsuleNav
        conversationMessages={messages}
        isBusy={isGenerating}
        isConversationLoading={isConversationLoading}
        layoutRootRef={layoutRootRef}
        prompts={promptSeeds}
        results={results}
        selectedMessageId={selectedMessageId}
        onAssetSelect={handleSelectAsset}
        onConfigChange={setProviderConfig}
        onMessageSelect={handleSelectMessage}
        onPromptSelect={setPrompt}
        onResultSelect={handleSelectResult}
        onRetryTask={handleRetryTask}
        onUseTaskAsDraft={handleUseTaskAsDraft}
      />
      <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <CanvasStage
          assets={assets}
          canvasItems={canvasItems}
          focusRequest={focusRequest}
          isGenerating={isGenerating || isConversationLoading}
          selectedItemId={selectedItemId}
          onCanvasItemsChange={setCanvasItems}
          onAssetSelect={handleSelectAsset}
          onSelectedItemChange={setSelectedItemId}
        />

        <div className={aiCanvasPromptComposerDockClassName}>
          <PromptComposer
            canGenerate={canGenerate}
            error={error}
            isGenerating={isGenerating || isConversationLoading}
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
    </main>
  )
}

function buildHistoryResults(messages: ConversationMessage[]): HistoryResult[] {
  return messages
    .filter((message) => message.role === "assistant" && message.task)
    .flatMap((message) =>
      message.assets
        .filter((asset) => Boolean(asset.url))
        .map((asset) => ({
          id: asset.id,
          messageId: message.id,
          taskId: asset.taskId,
          url: asset.url || "",
          prompt: message.task?.prompt || "",
          model: message.task?.model || "gpt-image-2",
          size: message.task?.size || "1024x1024",
          quality: message.task?.quality || "auto",
          status: message.status,
        }))
    )
    .reverse()
}

function collectConversationAssets(messages: ConversationMessage[]): ImageAsset[] {
  return messages.flatMap((message) =>
    message.assets.filter((asset) => Boolean(asset.url))
  )
}

function syncCanvasItemsWithAssets(
  assets: ImageAsset[],
  setCanvasItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>,
) {
  setCanvasItems((current) => {
    const currentByAssetId = new Map(current.map((item) => [item.assetId, item]))
    const nextItems: CanvasItem[] = []

    for (const [index, asset] of assets.entries()) {
      const existing = currentByAssetId.get(asset.id)

      if (existing) {
        nextItems.push({
          ...existing,
          width: asset.width,
          height: asset.height,
        })
        continue
      }

      const itemPosition = getNextCanvasItemPosition(index, {
        width: asset.width,
        height: asset.height,
      })

      nextItems.push({
        id: crypto.randomUUID(),
        assetId: asset.id,
        width: asset.width,
        height: asset.height,
        ...itemPosition,
      })
    }

    if (current.length !== nextItems.length) {
      return nextItems
    }

    for (const [index, item] of nextItems.entries()) {
      const currentItem = current[index]

      if (
        !currentItem ||
        currentItem.id !== item.id ||
        currentItem.assetId !== item.assetId ||
        currentItem.x !== item.x ||
        currentItem.y !== item.y ||
        currentItem.width !== item.width ||
        currentItem.height !== item.height
      ) {
        return nextItems
      }
    }

    return current
  })
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

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

function existingConversationErrorNeedsReset(error: unknown) {
  return error instanceof Error && /会话不存在/.test(error.message)
}

function resolveNextSelectedMessageId(
  currentSelectedMessageId: string | null,
  nextMessages: ConversationMessage[],
) {
  if (currentSelectedMessageId) {
    const selectedMessageStillExists = nextMessages.some(
      (message) => message.id === currentSelectedMessageId,
    )

    if (selectedMessageStillExists) {
      return currentSelectedMessageId
    }
  }

  return nextMessages.at(-1)?.id ?? null
}

async function pollConversationTaskUntilSettled(
  taskId: string,
  conversationId: string,
  options: {
    onSettled: (task: Awaited<ReturnType<typeof readDrawTask>>) => Promise<void>
  },
) {
  while (true) {
    const task = await readDrawTask(taskId)

    if (task.conversationId && task.conversationId !== conversationId) {
      return
    }

    if (task.status === "queued" || task.status === "running") {
      await wait(1200)
      continue
    }

    await options.onSettled(task)
    return
  }
}
