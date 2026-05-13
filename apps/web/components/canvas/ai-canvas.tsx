"use client"

import { CSSProperties } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { CanvasStage } from "@/components/canvas/canvas-stage"
import { FloatingCapsuleNav } from "@/components/canvas/floating-capsule-nav"
import {
  AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE,
  DEFAULT_AI_CANVAS_NAV_FOOTPRINT_PX,
  aiCanvasLayoutRootClassName,
  aiCanvasPromptComposerDockClassName,
} from "@/components/canvas/layout-tokens"
import { PromptComposer } from "@/components/canvas/prompt-composer"
import { promptSeeds } from "@/components/conversation/conversation-types"
import { useAiCanvasController } from "@/components/canvas/use-ai-canvas-controller"

type AiCanvasLayoutStyle = CSSProperties & {
  "--ai-canvas-nav-footprint": string
}

type AiCanvasProps = {
  initialConversationId?: string | null
}

export function AiCanvas({ initialConversationId = null }: AiCanvasProps) {
  const {
    layoutRootRef,
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
  } = useAiCanvasController(initialConversationId)

  const layoutStyle: AiCanvasLayoutStyle = {
    [AI_CANVAS_NAV_FOOTPRINT_CSS_VARIABLE]: `${DEFAULT_AI_CANVAS_NAV_FOOTPRINT_PX}px`,
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
        imageDisplayFields={displayPreferences.imageDisplayFields}
        imageDisplayPreset={displayPreferences.imageDisplayPreset}
        imagesByMessageId={imagesByMessageId}
        isBusy={isGenerating}
        isConversationLoading={isConversationLoading}
        layoutRootRef={layoutRootRef}
        prompts={promptSeeds}
        results={results}
        selectedMessageId={selectedMessageId}
        onAssetSelect={handleSelectAsset}
        onConfigChange={setProviderConfig}
        onDisplayPreferencesChange={setDisplayPreferences}
        onMessageSelect={handleSelectMessage}
        onPromptSelect={setPrompt}
        onResultSelect={handleSelectResult}
        onRetryTask={handleRetryTask}
        onUseAssetAsGenerationSource={handleUseAssetAsGenerationSource}
        onUseTaskAsDraft={handleUseTaskAsDraft}
      />
      <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <CanvasStage
          images={generatedImages}
          imageDisplayFields={displayPreferences.imageDisplayFields}
          imageDisplayPreset={displayPreferences.imageDisplayPreset}
          canvasItems={canvasItems}
          focusRequest={focusRequest}
          isGenerating={isCanvasGenerating}
          pendingMessages={pendingMessages}
          selectedItemId={selectedItemId}
          onCanvasItemsChange={setCanvasItems}
          onAssetSelect={handleSelectAsset}
          onSelectedItemChange={setSelectedItemId}
        />

        <div className={aiCanvasPromptComposerDockClassName}>
          <PromptComposer
            branchMode={branchMode}
            canGenerate={canGenerate}
            error={error}
            generationSourceLabel={
              selectedSourceImage
                ? `基于已选图片继续生成 · 第 ${selectedSourceImage.generationOrder} 轮`
                : null
            }
            isGenerating={isGenerating || isConversationLoading}
            model={model}
            prompt={prompt}
            quality={quality}
            selectedItemId={selectedItemId}
            sourceImage={selectedSourceImage}
            size={size}
            hasGenerationSource={Boolean(generationSourceAssetId)}
            onClearGenerationSource={handleClearGenerationSource}
            onBranchModeChange={setBranchMode}
            onModelChange={setModel}
            onPromptChange={setPrompt}
            onQualityChange={setQuality}
            onSizeChange={setSize}
            onUseSelectedAsGenerationSource={handleUseSelectedAssetAsGenerationSource}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </main>
  )
}
