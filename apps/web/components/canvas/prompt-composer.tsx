import { FormEvent, useState } from "react"
import Image from "next/image"
import {
  Box,
  Gauge,
  GitBranchPlus,
  LoaderCircle,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react"

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"

import {
  GeneratedImageView,
  models,
  qualities,
  sizes,
} from "@/components/generated-image/generated-image-types"
import {
  BranchMode,
  branchModeOptions,
} from "@/components/domain/branch-mode"

type ParameterSelectName = "model" | "size" | "quality"

type PromptComposerProps = {
  branchMode: BranchMode
  canGenerate: boolean
  error: string
  generationSourceLabel: string | null
  hasGenerationSource: boolean
  isGenerating: boolean
  model: string
  prompt: string
  quality: string
  selectedItemId: string | null
  sourceImage: GeneratedImageView | null
  size: string
  onClearGenerationSource: () => void
  onBranchModeChange: (value: BranchMode) => void
  onModelChange: (value: string) => void
  onPromptChange: (value: string) => void
  onQualityChange: (value: string) => void
  onSizeChange: (value: string) => void
  onUseSelectedAsGenerationSource: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PromptComposer({
  branchMode,
  canGenerate,
  error,
  generationSourceLabel,
  hasGenerationSource,
  isGenerating,
  model,
  prompt,
  quality,
  selectedItemId,
  sourceImage,
  size,
  onClearGenerationSource,
  onBranchModeChange,
  onModelChange,
  onPromptChange,
  onQualityChange,
  onSizeChange,
  onUseSelectedAsGenerationSource,
  onSubmit,
}: PromptComposerProps) {
  const [openSelect, setOpenSelect] = useState<ParameterSelectName | null>(null)

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-2xl xl:max-w-[44rem]">
      <PromptInput
        attachmentsDisabled
        className="rounded-xl border border-white/55 bg-white/84 shadow-[0_18px_45px_oklch(0.55_0.05_245_/_0.12)] backdrop-blur"
        onSubmit={(_, event) => onSubmit(event)}
      >
        <PromptInputBody>
          {hasGenerationSource && generationSourceLabel ? (
            <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[oklch(0.78_0.05_168)] bg-[linear-gradient(135deg,oklch(0.978_0.012_168)_0%,oklch(0.962_0.022_168)_100%)] px-3 py-2.5 text-xs text-[oklch(0.28_0.07_168)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.75)]">
              <div className="flex min-w-0 items-center gap-3">
                {sourceImage ? (
                  <div className="relative size-11 overflow-hidden rounded-lg border border-white/80 bg-white/80 shadow-sm">
                    <Image
                      fill
                      alt={sourceImage.prompt}
                      className="object-cover"
                      draggable={false}
                      sizes="44px"
                      src={sourceImage.url}
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <GitBranchPlus className="size-3.5 shrink-0" />
                    <span className="truncate font-medium">{generationSourceLabel}</span>
                  </div>
                  {sourceImage ? (
                    <p className="mt-1 truncate text-[11px] text-[oklch(0.36_0.04_168)]">
                      {sourceImage.prompt}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.74_0.04_168)] bg-white/80 px-2 py-1 text-[11px] text-[oklch(0.3_0.05_168)] transition hover:border-[oklch(0.55_0.12_168)]"
                type="button"
                onClick={onClearGenerationSource}
              >
                <X className="size-3" />
                清除
              </button>
            </div>
          ) : null}
          {hasGenerationSource ? (
            <div className="mx-3 mt-2 rounded-xl border border-[oklch(0.84_0.02_245)] bg-white/72 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium tracking-[0.08em] text-[oklch(0.38_0.025_245)] uppercase">
                  分支模式
                </span>
                <span className="text-[11px] text-[oklch(0.5_0.02_245)]">
                  只影响本次基于来源图的生成策略
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {branchModeOptions.map((option) => {
                  const isActive = option.value === branchMode

                  return (
                    <button
                      key={option.value}
                      className={[
                        "rounded-lg border px-2.5 py-2 text-left transition",
                        isActive
                          ? "border-[oklch(0.56_0.11_168)] bg-[oklch(0.965_0.024_168)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.72)]"
                          : "border-[oklch(0.84_0.02_245)] bg-white/75 hover:border-[oklch(0.7_0.04_168)]",
                      ].join(" ")}
                      type="button"
                      onClick={() => onBranchModeChange(option.value)}
                    >
                      <div className="text-[12px] font-medium text-[oklch(0.2_0.02_245)]">
                        {option.label}
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-[oklch(0.44_0.02_245)]">
                        {option.description}
                      </p>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-[oklch(0.46_0.02_245)]">
                基于来源图继续时将自动使用支持图像编辑的模型。
              </p>
            </div>
          ) : null}
          <PromptInputTextarea
            aria-label="提示词"
            autoFocus
            className="min-h-24 px-3 pt-3 pb-2 text-sm leading-6 sm:min-h-28"
            onChange={(event) => onPromptChange(event.currentTarget.value)}
            placeholder="描述你想生成的画面、风格、构图、光线和用途。"
            value={prompt}
          />
        </PromptInputBody>
        <PromptInputFooter className="flex-wrap items-end gap-2 px-3 pb-3 pt-1">
          <PromptInputTools className="flex-wrap gap-1.5">
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[oklch(0.74_0.035_75)] bg-white/78 px-2 text-[11px] text-[oklch(0.17_0.018_245)] shadow-sm transition hover:border-[oklch(0.55_0.12_168)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:text-xs"
              disabled={!selectedItemId}
              type="button"
              onClick={onUseSelectedAsGenerationSource}
            >
              <GitBranchPlus className="size-3 sm:size-3.5" />
              基于选中图继续
            </button>
            <ParameterSelect
              icon={WandSparkles}
              label="模型"
              name="model"
              open={openSelect === "model"}
              value={model}
              onOpenChange={(isOpen) => setOpenSelect(isOpen ? "model" : null)}
              onValueChange={onModelChange}
            >
              {models.map((item) => (
                <PromptInputSelectItem key={item.value} value={item.value}>
                  {item.label}
                </PromptInputSelectItem>
              ))}
            </ParameterSelect>
            <ParameterSelect
              icon={Box}
              label="尺寸"
              name="size"
              open={openSelect === "size"}
              value={size}
              onOpenChange={(isOpen) => setOpenSelect(isOpen ? "size" : null)}
              onValueChange={onSizeChange}
            >
              {sizes.map((item) => (
                <PromptInputSelectItem key={item} value={item}>
                  {item}
                </PromptInputSelectItem>
              ))}
            </ParameterSelect>
            <ParameterSelect
              icon={Gauge}
              label="质量"
              name="quality"
              open={openSelect === "quality"}
              value={quality}
              onOpenChange={(isOpen) => setOpenSelect(isOpen ? "quality" : null)}
              onValueChange={onQualityChange}
            >
              {qualities.map((item) => (
                <PromptInputSelectItem key={item} value={item}>
                  {item}
                </PromptInputSelectItem>
              ))}
            </ParameterSelect>
          </PromptInputTools>
          <PromptInputSubmit
            className="h-10 rounded-md bg-[oklch(0.22_0.04_245)] px-4 text-white shadow-sm hover:bg-[oklch(0.29_0.05_245)]"
            disabled={!canGenerate}
            size="sm"
          >
            {isGenerating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            生成图像
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>

      {error ? (
        <div className="mt-3 rounded-md border border-[oklch(0.67_0.18_28)] bg-[oklch(0.96_0.03_28)] px-3 py-2 text-sm text-[oklch(0.38_0.14_28)]">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function ParameterSelect({
  children,
  icon: Icon,
  label,
  name,
  onOpenChange,
  onValueChange,
  open,
  value,
}: {
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  label: string
  name: ParameterSelectName
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  open: boolean
  value: string
}) {
  return (
    <PromptInputSelect
      open={open}
      value={value}
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        onValueChange(nextValue)
        onOpenChange(false)
      }}
    >
      <PromptInputSelectTrigger
        aria-label={label}
        data-select-name={name}
        className="h-7 max-w-32 min-w-20 border border-[oklch(0.74_0.035_75)] bg-white/78 px-2 text-[11px] text-[oklch(0.17_0.018_245)] shadow-sm sm:h-8 sm:min-w-24 sm:text-xs"
      >
        <Icon
          aria-hidden="true"
          className="size-3 text-[oklch(0.45_0.025_245)] sm:size-3.5"
        />
        <PromptInputSelectValue />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>{children}</PromptInputSelectContent>
    </PromptInputSelect>
  )
}
