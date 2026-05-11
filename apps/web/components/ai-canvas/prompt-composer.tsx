import { FormEvent, useState } from "react"
import { Box, Gauge, LoaderCircle, Sparkles, WandSparkles } from "lucide-react"

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

import { models, qualities, sizes } from "./canvas-types"

type ParameterSelectName = "model" | "size" | "quality"

type PromptComposerProps = {
  canGenerate: boolean
  error: string
  isGenerating: boolean
  model: string
  prompt: string
  quality: string
  size: string
  onModelChange: (value: string) => void
  onPromptChange: (value: string) => void
  onQualityChange: (value: string) => void
  onSizeChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PromptComposer({
  canGenerate,
  error,
  isGenerating,
  model,
  prompt,
  quality,
  size,
  onModelChange,
  onPromptChange,
  onQualityChange,
  onSizeChange,
  onSubmit,
}: PromptComposerProps) {
  const [openSelect, setOpenSelect] = useState<ParameterSelectName | null>(null)

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-3xl">
      <PromptInput
        attachmentsDisabled
        className="rounded-md bg-white/90 shadow-[0_18px_45px_oklch(0.55_0.05_245_/_0.14)] backdrop-blur"
        onSubmit={(_, event) => onSubmit(event)}
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-label="提示词"
            autoFocus
            className="min-h-32 px-3 pt-3 pb-2 text-sm leading-6"
            onChange={(event) => onPromptChange(event.currentTarget.value)}
            placeholder="描述你想生成的画面、风格、构图、光线和用途。"
            value={prompt}
          />
        </PromptInputBody>
        <PromptInputFooter className="flex-wrap items-end px-3 pb-3">
          <PromptInputTools className="flex-wrap gap-2">
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
        className="h-8 max-w-36 min-w-24 border border-[oklch(0.74_0.035_75)] bg-white/80 text-[oklch(0.17_0.018_245)] shadow-sm"
      >
        <Icon
          aria-hidden="true"
          className="size-3.5 text-[oklch(0.45_0.025_245)]"
        />
        <PromptInputSelectValue />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>{children}</PromptInputSelectContent>
    </PromptInputSelect>
  )
}
