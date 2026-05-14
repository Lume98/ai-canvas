import { FormEvent, SetStateAction, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useImmerReducer } from "use-immer"
import { toast } from "@workspace/ui/components/sonner"

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
  branchSourceCompatibleModels,
  models,
  qualities,
  sizes,
} from "@/components/generated-image/generated-image-types"
import {
  BranchMode,
  defaultBranchMode,
} from "@/components/domain/branch-mode"
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

type ConversationSyncResult = {
  conversationId: string
  messages: ConversationMessage[]
}

type CancellationGuard = () => boolean

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
  generationSourceAssetId: string | null
  branchMode: BranchMode
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
  generationSourceAssetId: null,
  branchMode: defaultBranchMode,
  selectedMessageId: null,
  focusRequest: null,
}

export function useAiCanvasController(initialConversationId: string | null = null) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, dispatch] = useImmerReducer(
    (draft: AiCanvasState, action: AiCanvasAction) => {
      action(draft)
    },
    initialAiCanvasState,
  )

  const layoutRootRef = useRef<HTMLElement | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
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
    generationSourceAssetId,
    branchMode,
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
  const setGenerationSourceAssetId = (next: SetStateAction<string | null>) => {
    dispatch((draft) => {
      draft.generationSourceAssetId = applySetStateAction(
        draft.generationSourceAssetId,
        next,
      )
    })
  }
  const setBranchMode = (next: SetStateAction<BranchMode>) => {
    dispatch((draft) => {
      draft.branchMode = applySetStateAction(draft.branchMode, next)
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
  const selectedSourceImage = useMemo(
    () =>
      generationSourceAssetId
        ? generatedImages.find((image) => image.asset.id === generationSourceAssetId) ?? null
        : null,
    [generatedImages, generationSourceAssetId],
  )
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

  function resolveBranchCompatibleModel(nextModel: string) {
    return branchSourceCompatibleModels.includes(
      nextModel as (typeof branchSourceCompatibleModels)[number],
    )
      ? nextModel
      : branchSourceCompatibleModels[0]
  }

  function persistConversationId(nextConversationId: string) {
    if (typeof window === "undefined") return

    window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, nextConversationId)
  }

  function syncConversationLocation(nextConversationId: string) {
    const nextPathname = `/${encodeURIComponent(nextConversationId)}`
    if (pathname === nextPathname) return

    router.replace(nextPathname, { scroll: false })
  }

  function resetConversationScopedState() {
    pendingTaskIdsRef.current.clear()
    pendingFocusAssetIdRef.current = null
    setMessages([])
    setCanvasItems([])
    setSelectedItemId(null)
    setGenerationSourceAssetId(null)
    setBranchMode(defaultBranchMode)
    setSelectedMessageId(null)
    setFocusRequest(null)
  }

  function clearActiveConversation() {
    activeConversationIdRef.current = null
    setConversationId(null)
    resetConversationScopedState()
  }

  function activateConversation(nextConversationId: string) {
    const previousConversationId = activeConversationIdRef.current

    activeConversationIdRef.current = nextConversationId
    persistConversationId(nextConversationId)
    setConversationId(nextConversationId)

    if (previousConversationId !== nextConversationId) {
      resetConversationScopedState()
    }

    syncConversationLocation(nextConversationId)
  }

  function applyConversationMessages(
    targetConversationId: string,
    nextMessages: ConversationMessage[],
    isCancelled: CancellationGuard = () => false,
  ): ConversationSyncResult | null {
    if (isCancelled() || activeConversationIdRef.current !== targetConversationId) return null

    setMessages(nextMessages)
    setSelectedMessageId((currentSelectedMessageId) =>
      resolveNextSelectedMessageId(currentSelectedMessageId, nextMessages),
    )
    restorePendingTasks(nextMessages, targetConversationId)

    return {
      conversationId: targetConversationId,
      messages: nextMessages,
    }
  }

  async function recoverConversation(
    targetConversationId: string,
    isCancelled: CancellationGuard = () => false,
  ): Promise<ConversationSyncResult | null> {
    if (isCancelled() || activeConversationIdRef.current !== targetConversationId) return null

    clearActiveConversation()
    const conversation = await createConversation("当前画图会话")
    if (isCancelled()) return null

    activateConversation(conversation.id)
    setError("")

    const recoveredMessages = await readConversationMessages(conversation.id)
    return applyConversationMessages(conversation.id, recoveredMessages, isCancelled)
  }

  async function createAndActivateConversation(
    isCancelled: CancellationGuard = () => false,
  ): Promise<ConversationSyncResult | null> {
    const conversation = await createConversation("当前画图会话")
    if (isCancelled()) return null

    const nextMessages = await readConversationMessages(conversation.id)
    if (isCancelled()) return null

    activateConversation(conversation.id)
    setError("")

    return applyConversationMessages(conversation.id, nextMessages, isCancelled)
  }

  async function activateExistingConversationOrRecover(
    targetConversationId: string,
    isCancelled: CancellationGuard = () => false,
  ): Promise<ConversationSyncResult | null> {
    try {
      const nextMessages = await readConversationMessages(targetConversationId)
      if (isCancelled()) return null

      activateConversation(targetConversationId)
      setError("")

      return applyConversationMessages(targetConversationId, nextMessages, isCancelled)
    } catch (caughtError) {
      if (isCancelled()) return null
      if (!existingConversationErrorNeedsReset(caughtError)) throw caughtError

      toast.warning("会话不存在，已为你创建新的干净会话。")
      return createAndActivateConversation(isCancelled)
    }
  }

  async function loadConversationMessages(
    targetConversationId: string,
    options: {
      isCancelled?: CancellationGuard
      recoverOnMissing?: boolean
    },
  ): Promise<ConversationSyncResult | null> {
    const isCancelled = options.isCancelled ?? (() => false)

    if (isCancelled() || activeConversationIdRef.current !== targetConversationId) {
      return null
    }

    try {
      const nextMessages = await readConversationMessages(targetConversationId)
      return applyConversationMessages(targetConversationId, nextMessages, isCancelled)
    } catch (caughtError) {
      if (isCancelled() || activeConversationIdRef.current !== targetConversationId) {
        return null
      }

      if (
        !options.recoverOnMissing ||
        !existingConversationErrorNeedsReset(caughtError)
      ) {
        throw caughtError
      }

      toast.warning("会话不存在，已为你创建新的干净会话。")
      return recoverConversation(targetConversationId, isCancelled)
    }
  }

  async function refreshMessages(
    targetConversationId: string,
    isCancelled: CancellationGuard = () => false,
  ) {
    await loadConversationMessages(targetConversationId, {
      isCancelled,
      recoverOnMissing: true,
    })
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
    const isCancelled = () => cancelled

    async function ensureConversation() {
      setIsConversationLoading(true)
      setError("")

      try {
        const existingConversationIdFromStorage =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY)

        let activeConversationId = initialConversationId || existingConversationIdFromStorage

        if (!activeConversationId) {
          const conversations = await listConversations()
          if (isCancelled()) return
          activeConversationId =
            conversations[0]?.id ?? null
        }

        if (isCancelled()) return

        if (!activeConversationId) {
          await createAndActivateConversation(isCancelled)
          return
        }

        if (activeConversationIdRef.current !== activeConversationId) {
          clearActiveConversation()
        }

        await activateExistingConversationOrRecover(activeConversationId, isCancelled)
      } catch (caughtError) {
        if (!isCancelled()) {
          setError(caughtError instanceof Error ? caughtError.message : "初始化会话失败。")
        }
      } finally {
        if (!isCancelled()) setIsConversationLoading(false)
      }
    }

    void ensureConversation()

    return () => {
      cancelled = true
    }
  }, [initialConversationId])

  useEffect(() => {
    syncCanvasItemsWithAssets(generatedImages, setCanvasItems)
  }, [generatedImages])

  useEffect(() => {
    if (!generationSourceAssetId) return

    if (
      branchSourceCompatibleModels.includes(
        model as (typeof branchSourceCompatibleModels)[number],
      )
    ) {
      return
    }

    setModel(branchSourceCompatibleModels[0])
  }, [generationSourceAssetId, model])

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
          const syncResult = await loadConversationMessages(activeConversationId, {
            recoverOnMissing: true,
          })
          if (!syncResult || syncResult.conversationId !== activeConversationId) return

          const { messages: nextMessages } = syncResult
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
              const syncResult = await loadConversationMessages(targetConversationId, {
                recoverOnMissing: true,
              })
              if (!syncResult || syncResult.conversationId !== targetConversationId) return

              const { messages: refreshedMessages } = syncResult
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
    branchMode?: BranchMode
    parentAssetId?: string | null
  }) {
    const requestedConversationId = activeConversationIdRef.current
    if (!requestedConversationId || !input.prompt.trim()) return

    setIsGenerating(true)
    setError("")

    async function runGeneration(targetConversationId: string) {
      const task = await createConversationDrawTask({
        conversationId: targetConversationId,
        prompt: input.prompt.trim(),
        model: input.model,
        size: input.size,
        quality: input.quality,
        outputCount: input.outputCount ?? 1,
        branchMode: input.branchMode,
        parentAssetId: input.parentAssetId ?? null,
      })

      pendingTaskIdsRef.current.add(task.id)
      await refreshMessages(targetConversationId)
      await pollConversationTaskUntilSettled(task.id, targetConversationId, {
        onSettled: async (settledTask) => {
          pendingTaskIdsRef.current.delete(task.id)
          const syncResult = await loadConversationMessages(targetConversationId, {
            recoverOnMissing: true,
          })
          if (!syncResult || syncResult.conversationId !== targetConversationId) return

          const { messages: nextMessages } = syncResult
          restorePendingTasks(nextMessages, targetConversationId)

          if (settledTask.status === "succeeded") {
            focusLatestTaskAsset(settledTask.id, nextMessages)
          } else if (settledTask.errorMessage) {
            setError(settledTask.errorMessage)
          }
        },
      })
    }

    try {
      await runGeneration(requestedConversationId)
    } catch (caughtError) {
      if (existingConversationErrorNeedsReset(caughtError)) {
        try {
          toast.warning("会话不存在，已为你创建新的干净会话。")
          const recoveredConversation = await recoverConversation(
            requestedConversationId,
          )

          if (recoveredConversation) {
            await runGeneration(recoveredConversation.conversationId)
            return
          }
        } catch (retryError) {
          setError(retryError instanceof Error ? retryError.message : "生成失败，请稍后重试。")
          return
        }
      }

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
      branchMode: task.branchMode ?? undefined,
      parentAssetId: task.parentAssetId,
    })
  }

  function handleUseTaskAsDraft(task: ConversationMessage["task"]) {
    if (!task) return

    setPrompt(task.prompt)
    setModel(task.parentAssetId ? resolveBranchCompatibleModel(task.model) : task.model)
    setSize(task.size)
    setQuality(task.quality)
    setGenerationSourceAssetId(task.parentAssetId)
    setBranchMode(task.branchMode ?? defaultBranchMode)
  }

  function handleUseSelectedAssetAsGenerationSource() {
    if (!selectedItemId) return

    const item = canvasItems.find((entry) => entry.id === selectedItemId)
    if (!item) return

    setGenerationSourceAssetId(item.assetId)
    setBranchMode(defaultBranchMode)
    setModel((currentModel) => resolveBranchCompatibleModel(currentModel))
  }

  function handleUseAssetAsGenerationSource(asset: { id: string; messageId: string }) {
    setGenerationSourceAssetId(asset.id)
    setBranchMode(defaultBranchMode)
    setModel((currentModel) => resolveBranchCompatibleModel(currentModel))
    setSelectedMessageId(asset.messageId)

    const item = canvasItems.find((entry) => entry.assetId === asset.id)
    if (item) {
      focusCanvasItem(item)
    }
  }

  function handleClearGenerationSource() {
    setGenerationSourceAssetId(null)
    setBranchMode(defaultBranchMode)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canGenerate) return

    const nextModel = selectedSourceImage ? resolveBranchCompatibleModel(model) : model

    await submitGeneration({
      prompt: prompt.trim(),
      model: nextModel,
      size,
      quality,
      branchMode: selectedSourceImage ? branchMode : undefined,
      parentAssetId: selectedSourceImage?.asset.id ?? null,
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
    generationSourceAssetId,
    branchMode,
    selectedSourceImage,
    setProviderConfig,
    setDisplayPreferences,
    setPrompt,
    setModel,
    setQuality,
    setSize,
    setCanvasItems,
    setSelectedItemId,
    setGenerationSourceAssetId,
    setBranchMode,
    handleSelectResult,
    handleSelectAsset,
    handleSelectMessage,
    handleRetryTask,
    handleUseTaskAsDraft,
    handleUseAssetAsGenerationSource,
    handleUseSelectedAssetAsGenerationSource,
    handleClearGenerationSource,
    handleSubmit,
  }
}
