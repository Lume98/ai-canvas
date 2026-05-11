import { FormEvent, ReactNode } from "react"
import { LoaderCircle, Sparkles } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { models, qualities, sizes } from "./canvas-types"

const controlSelectClass =
  "w-full rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"

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
  return (
    <form
      className="pointer-events-auto mx-auto w-full max-w-3xl rounded-t-xl border border-b-0 border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)]/95 p-4 shadow-[0_-16px_45px_oklch(0.55_0.05_245_/_0.12)] backdrop-blur"
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Control label="模型">
          <select
            className={controlSelectClass}
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
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
            onChange={(event) => onSizeChange(event.target.value)}
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
            onChange={(event) => onQualityChange(event.target.value)}
          >
            {qualities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Control>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">提示词</span>
        <div className="relative">
          <textarea
            className="min-h-32 w-full resize-none rounded-md border border-[oklch(0.74_0.035_75)] bg-white/85 px-3 pt-3 pr-3 pb-16 text-sm leading-6 shadow-sm transition outline-none focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"
            value={prompt}
            maxLength={2400}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="描述你想生成的画面、风格、构图、光线和用途。"
          />
          <span className="absolute bottom-4 left-3 text-xs text-[oklch(0.45_0.025_245)]">
            {prompt.length}/2400
          </span>
          <Button
            className="absolute right-3 bottom-3 h-10 bg-[oklch(0.22_0.04_245)] px-4 text-white shadow-sm hover:bg-[oklch(0.29_0.05_245)]"
            disabled={!canGenerate}
            type="submit"
          >
            {isGenerating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            生成图像
          </Button>
        </div>
      </label>

      {error ? (
        <div className="mt-3 rounded-md border border-[oklch(0.67_0.18_28)] bg-[oklch(0.96_0.03_28)] px-3 py-2 text-sm text-[oklch(0.38_0.14_28)]">
          {error}
        </div>
      ) : null}

    </form>
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
