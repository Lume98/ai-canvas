import { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type FloatingCapsuleNavButtonProps = {
  ariaLabel: string
  children: ReactNode
  isActive: boolean
  label: string
  onClick: () => void
}

export function FloatingCapsuleNavButton({
  ariaLabel,
  children,
  isActive,
  label,
  onClick,
}: FloatingCapsuleNavButtonProps) {
  return (
    <button
      className={cn(
        "group relative flex w-12 flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border border-transparent px-2 py-2.5 text-[oklch(0.34_0.02_245)] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[oklch(0.46_0.08_168_/_0.34)] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none",
        isActive
          ? "border-[oklch(0.24_0.035_245)] bg-[oklch(0.18_0.028_245)] text-white shadow-[0_12px_22px_oklch(0.16_0.03_245_/_0.24)]"
          : "hover:border-[oklch(0.86_0.012_245)] hover:bg-[oklch(0.985_0.002_245)] hover:text-[oklch(0.2_0.025_245)] hover:shadow-[0_10px_22px_oklch(0.22_0.02_245_/_0.08)]"
      )}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={isActive}
      onClick={onClick}
    >
      <span
        className={cn(
          "absolute inset-x-2 top-1.5 h-3 rounded-full transition-opacity",
          isActive
            ? "bg-white/15 opacity-100"
            : "bg-white opacity-0 group-hover:opacity-100"
        )}
      />
      <span
        className={cn(
          "absolute top-1/2 left-1 h-6 w-1 -translate-y-1/2 rounded-full transition-all",
          isActive
            ? "bg-[oklch(0.72_0.11_168)] opacity-100"
            : "bg-[oklch(0.72_0.11_168)] opacity-0 group-hover:opacity-60"
        )}
      />
      <span className="relative z-10 flex size-8 items-center justify-center">
        {children}
      </span>
      <span className="relative z-10 text-[9px] leading-none font-medium tracking-normal">
        {label}
      </span>
    </button>
  )
}
