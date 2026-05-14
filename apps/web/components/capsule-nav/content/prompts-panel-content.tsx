import { cn } from "@workspace/ui/lib/utils"

const promptCardClassName =
  "rounded-[18px] border border-[oklch(0.9_0.008_245)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,251,0.9))] px-3.5 py-2.5 text-left text-xs leading-5 text-[oklch(0.32_0.018_245)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_8px_20px_oklch(0.22_0.014_245_/_0.04)] transition duration-150 hover:border-[oklch(0.82_0.03_190)] hover:bg-[oklch(0.985_0.006_190)] hover:text-[oklch(0.22_0.02_245)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.05_190_/_0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"

export function PromptsPanelContent({
  onSelectPrompt,
  prompts,
}: {
  onSelectPrompt: (prompt: string) => void
  prompts: string[]
}) {
  return (
    <div className="grid gap-2">
      {prompts.map((prompt) => (
        <button
          className={cn(promptCardClassName)}
          key={prompt}
          type="button"
          onClick={() => onSelectPrompt(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
