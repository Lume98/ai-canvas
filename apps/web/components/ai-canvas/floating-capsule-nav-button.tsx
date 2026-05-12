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
        "group relative z-10 flex w-12 flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] px-2 py-2.5 text-[oklch(0.31_0.022_245)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.46_0.08_168_/_0.35)]",
        isActive
          ? "bg-[linear-gradient(180deg,oklch(0.3_0.065_245)_0%,oklch(0.2_0.04_245)_100%)] text-white shadow-[0_14px_24px_oklch(0.18_0.04_245_/_0.28)]"
          : "hover:bg-white/80 hover:text-[oklch(0.22_0.03_245)]",
      )}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={isActive}
      onClick={onClick}
    >
      <span
        className={cn(
          "absolute inset-x-2 top-1.5 h-4 rounded-full transition-opacity",
          isActive
            ? "bg-[linear-gradient(180deg,oklch(1_0_0_/_0.2)_0%,oklch(1_0_0_/_0)_100%)] opacity-100"
            : "bg-white/70 opacity-0 group-hover:opacity-100",
        )}
      />
      <span
        className={cn(
          "absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full transition-all",
          isActive
            ? "bg-[oklch(0.78_0.13_85)] opacity-100"
            : "bg-[oklch(0.78_0.13_85)] opacity-0 group-hover:opacity-55",
        )}
      />
      {children}
      <span className="text-[9px] font-medium tracking-[0.04em]">{label}</span>
    </button>
  )
}
