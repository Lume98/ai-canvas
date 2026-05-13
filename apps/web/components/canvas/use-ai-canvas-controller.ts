import { FormEvent, SetStateAction, useEffect, useMemo, useRef } from "react"
import { useImmerReducer } from "use-immer"

import {
  defaultAiProviderConfig,
  readAiProviderConfig,
} from "@/components/settings/ai-config"
import {
  createConversation,
  createConversationDrawTask,
  listConversations,
  readConversationMessages,
} from "@/components/conversation/conversation-api"
import {
  CanvasDisplayPreferences,
  defaultCanvasDisplayPreferences,
  readCanvasDisplayPreferences,
} from "@/components/settings/display-preferences"
import {
  ConversationMessage,
  promptSeeds,
} from "@/components/conversation/conversation-types"
import { CanvasItem } from "@/components/canvas/canvas-types"
import {
  models,
  qualities,
  sizes,
} from "@/components/generated-image/generated-image-types"
import {
  applySetStateAction,
  buildGeneratedImageViews,
  buildHistoryResults,
  collectConversationAssets,
  existingConversationErrorNeedsReset,
  groupImagesByMessageId,
  pollConversationTaskUntilSettled,
  resolveNextSelectedMessageId,
  syncCanvasItemsWithAssets,
} from "@/components/canvas/ai-canvas-utils"

const CURRENT_CONVERSATION_STORAGE_KEY = "canvas/current-conversation-id"

type AiCanvasState = {
  providerConfig: typeof defaultAiProviderConfig
  isConfigLoading: boolean
  isConversationLoading: boolean
  prompt: string
  model: string
  size: string
  quality: string
  displayPreferences: CanvasDisplayPreferences
  isGenerating: boolean
  error: string
  conversationId: string | null
  messages: ConversationMessage[]
  canvasItems: CanvasItem[]
  selectedItemId: string | null
  selectedMessageId: string | null
  focusRequest: {
    centerX: number
    centerY: number
    requestId: number
  } | null
}

type AiCanvasAction = (draft: AiCanvasState) => void

const initialAiCanvasState: AiCanvasState = {
  providerConfig: defaultAiProviderConfig,
  isConfigLoading: true,
  isConversationLoading: true,
  prompt: promptSeeds[0] ?? "",
  model: models[0]?.value ?? "gpt-image-2",
  size: sizes[0] ?? "1024x1024",
  quality: qualities[0] ?? "auto",
  displayPreferences: defaultCanvasDisplayPreferences,
  isGenerating: false,
  error: "",
  conversationId: null,
  messages: [],
  canvasItems: [],
  selectedItemId: null,
  selectedMessageId: null,
  focusRequest: null,
}

export function useAiCanvasController(initialConversationId: string | null = null) {
  const [state, dispatch] = useImmerReducer(
    (draft: AiCanvasState, action: AiCanvasAction) => {
      action(draft)
    },
    initialAiCanvasState,
  )

  const layoutRootRef = useRef<HTMLElement | null>(null)
  const pendingTaskIdsRef = useRef<Set<string>>(new Set())
  const pendingFocusAssetIdRef = useRef<string | null>(null)

  const {
    providerConfig,
    isConfigLoading,
    isConversationLoading,
    prompt,
    model,
    size,
    quality,
    displayPreferences,
    isGenerating,
    error,
    conversationId,
    messages,
    canvasItems,
    selectedItemId,
    selectedMessageId,
    focusRequest,
  } = state

  const setProviderConfig = (next: SetStateAction<typeof defaultAiProviderConfig>) => {
    dispatch((draft) => {
      draft.providerConfig = applySetStateAction(draft.providerConfig, next)
    })
  }
  const setIsConfigLoading = (next: SetStateAction<boolean>) => {
    dispatch((draft) => {
      draft.isConfigLoading = applySetStateAction(draft.isConfigLoading, next)
    })
  }
  const setIsConversationLoading = (next: SetStateAction<boolean>) => {
    dispatch((draft) => {
      draft.isConversationLoading = applySetStateAction(draft.isConversationLoading, next)
    })
  }
  const setPrompt = (next: SetStateAction<string>) => {
    dispatch((draft) => {
      draft.prompt = applySetStateAction(draft.prompt, next)
    })
  }
  const setModel = (next: SetStateAction<string>) => {
    dispatch((draft) => {
      draft.model = applySetStateAction(draft.model, next)
    })
  }
  const setSize = (next: SetStateAction<string>) => {
    dispatch((draft) => {
      draft.size = applySetStateAction(draft.size, next)
    })
  }
  const setQuality = (next: SetStateAction<string>) => {
    dispatch((draft) => {
      draft.quality = applySetStateAction(draft.quality, next)
    })
  }
  const setDisplayPreferences = (next: SetStateAction<CanvasDisplayPreferences>) => {
    dispatch((draft) => {
      draft.displayPreferences = applySetStateAction(draft.displayPreferences, next)
    })
  }
  const setIsGenerating = (next: SetStateAction<boolean>) => {
    dispatch((draft) => {
      draft.isGenerating = applySetStateAction(draft.isGenerating, next)
    })
  }
  const setError = (next: SetStateAction<string>) => {
    dispatch((draft) => {
      draft.error = applySetStateAction(draft.error, next)
    })
  }
  const setConversationId = (next: SetStateAction<string | null>) => {
    dispatch((draft) => {
      draft.conversationId = applySetStateAction(draft.conversationId, next)
    })
  }
  const setMessages = (next: SetStateAction<ConversationMessage[]>) => {
    dispatch((draft) => {
      draft.messages = applySetStateAction(draft.messages, next)
    })
  }
  const setCanvasItems = (next: SetStateAction<CanvasItem[]>) => {
    dispatch((draft) => {
      draft.canvasItems = applySetStateAction(draft.canvasItems, next)
    })
  }
  const setSelectedItemId = (next: SetStateAction<string | null>) => {
    dispatch((draft) => {
      draft.selectedItemId = applySetStateAction(draft.selectedItemId, next)
    })
  }
  const setSelectedMessageId = (next: SetStateAction<string | null>) => {
    dispatch((draft) => {
      draft.selectedMessageId = applySetStateAction(draft.selectedMessageId, next)
    })
  }
  const setFocusRequest = (next: SetStateAction<AiCanvasState["focusRequest"]>) => {
    dispatch((draft) => {
      draft.focusRequest = applySetStateAction(draft.focusRequest, next)
    })
  }

  const hasApiKey = providerConfig.hasApiKey
  const canGenerate =
    prompt.trim().length > 0 &&
    hasApiKey &&
    !isConfigLoading &&
    !isConversationLoading &&
    !isGenerating &&
    Boolean(conversationId)

  const generatedImages = useMemo(() => buildGeneratedImageViews(messages), [messages])
  const assets = useMemo(() => generatedImages.map((image) => image.asset), [generatedImages])
  const results = useMemo(() => buildHistoryResults(generatedImages), [generatedImages])
  const imagesByMessageId = useMemo(() => groupImagesByMessageId(generatedImages), [generatedImages])
  const pendingMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.role === "assistant" &&
          (message.status === "pending" || message.status === "running"),
      ),
    [messages],
  )
  const isCanvasGenerating = isGenerating || pendingMessages.length > 0

  async function refreshMessages(targetConversationId: string, cancelled: boolean) {
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
        if (isMounted) setProviderConfig(config)
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error ? caughtError.message : "读取接口配置失败。",
          )
        }
      } finally {
        if (isMounted) setIsConfigLoading(false)
      }
    }

    void loadProviderConfig()

    return () => {
      isMounted = false
    }
  }, [initialConversationId])

  useEffect(() => {
    setDisplayPreferences(readCanvasDisplayPreferences())
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
        const existingConversationIdFromStorage =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY)

        let activeConversationId = initialConversationId || existingConversationIdFromStorage

        if (!activeConversationId) {
          const conversations = await listConversations()
          activeConversationId =
            conversations[0]?.id ?? (await createConversation("当前画图会话")).id
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, activeConversationId)
        }

        if (cancelled) return

        setConversationId(activeConversationId)
        await loadMessagesForConversation(activeConversationId)
      } catch (caughtError) {
        if (existingConversationErrorNeedsReset(caughtError) && !cancelled) {
          try {
            const conversation = await createConversation("当前画图会话")

            if (typeof window !== "undefined") {
              window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, conversation.id)
            }

            setConversationId(conversation.id)
            await loadMessagesForConversation(conversation.id)
            return
          } catch (retryError) {
            if (!cancelled) {
              setError(
                retryError instanceof Error ? retryError.message : "初始化会话失败。",
              )
            }
            return
          }
        }

        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "初始化会话失败。")
        }
      } finally {
        if (!cancelled) setIsConversationLoading(false)
      }
    }

    void ensureConversation()

    return () => {
      cancelled = true
    }
  }, [initialConversationId])

  useEffect(() => {
    syncCanvasItemsWithAssets(assets, setCanvasItems)
  }, [assets])

  useEffect(() => {
    if (!conversationId) return
    const activeConversationId = conversationId

    function queueFocusForTask(taskId: string, nextMessages: ConversationMessage[]) {
      const asset = collectConversationAssets(nextMessages).find((entry) => entry.taskId === taskId)
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

        if (message.task.status === "queued" || message.task.status === "running") {
          if (!pendingTaskIdsRef.current.has(message.task.id)) startTaskPolling(message.task.id)
        } else {
          pendingTaskIdsRef.current.delete(message.task.id)
        }
      }
    }

    function startTaskPolling(taskId: string) {
      if (pendingTaskIdsRef.current.has(taskId)) return

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

      if (message.task.status === "queued" || message.task.status === "running") {
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

  function focusCanvasItem(item: CanvasItem) {
    setSelectedItemId(item.id)
    setFocusRequest({
      centerX: item.x + item.width / 2,
      centerY: item.y + item.height / 2,
      requestId: Date.now(),
    })
  }

  function focusLatestTaskAsset(taskId: string, nextMessages: ConversationMessage[]) {
    const asset = collectConversationAssets(nextMessages).find((entry) => entry.taskId === taskId)
    if (!asset) return

    pendingFocusAssetIdRef.current = asset.id
    const item = canvasItems.find((entry) => entry.assetId === asset.id)

    if (item) {
      pendingFocusAssetIdRef.current = null
      focusCanvasItem(item)
    }
  }

  function restorePendingTasks(nextMessages: ConversationMessage[], targetConversationId: string) {
    for (const message of nextMessages) {
      if (!message.task) continue

      if (message.task.status === "queued" || message.task.status === "running") {
        const taskId = message.task.id

        if (!pendingTaskIdsRef.current.has(taskId)) {
          pendingTaskIdsRef.current.add(taskId)
          void pollConversationTaskUntilSettled(taskId, targetConversationId, {
            onSettled: async (settledTask) => {
              pendingTaskIdsRef.current.delete(taskId)
              const refreshedMessages = await readConversationMessages(targetConversationId)
              setMessages(refreshedMessages)
              setSelectedMessageId((currentSelectedMessageId) =>
                resolveNextSelectedMessageId(currentSelectedMessageId, refreshedMessages),
              )
              restorePendingTasks(refreshedMessages, targetConversationId)

              if (settledTask.status === "succeeded") {
                focusLatestTaskAsset(settledTask.id, refreshedMessages)
              } else if (settledTask.errorMessage) {
                setError(settledTask.errorMessage)
              }
            },
          })
        }
      } else {
        pendingTaskIdsRef.current.delete(message.task.id)
      }
    }
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
      setError(caughtError instanceof Error ? caughtError.message : "生成失败，请稍后重试。")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSelectResult(result: { id: string; messageId: string }) {
    const item = canvasItems.find((entry) => entry.assetId === result.id)

    if (item) {
      setSelectedMessageId(result.messageId)
      focusCanvasItem(item)
    }
  }

  function handleSelectAsset(asset: { id: string; messageId: string }) {
    const item = canvasItems.find((entry) => entry.assetId === asset.id)

    setSelectedMessageId(asset.messageId)
    if (item) focusCanvasItem(item)
  }

  function handleSelectMessage(message: ConversationMessage) {
    setSelectedMessageId(message.id)
    const firstAsset = message.assets[0]
    if (!firstAsset) return

    const item = canvasItems.find((entry) => entry.assetId === firstAsset.id)
    if (item) focusCanvasItem(item)
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

  return {
    layoutRootRef,
    providerConfig,
    isConversationLoading,
    displayPreferences,
    messages,
    imagesByMessageId,
    isGenerating,
    results,
    selectedMessageId,
    prompt,
    model,
    size,
    quality,
    error,
    canGenerate,
    generatedImages,
    canvasItems,
    focusRequest,
    isCanvasGenerating,
    pendingMessages,
    selectedItemId,
    setProviderConfig,
    setDisplayPreferences,
    setPrompt,
    setModel,
    setQuality,
    setSize,
    setCanvasItems,
    setSelectedItemId,
    handleSelectResult,
    handleSelectAsset,
    handleSelectMessage,
    handleRetryTask,
    handleUseTaskAsDraft,
    handleSubmit,
  }
}
