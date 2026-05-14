import { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type CapsuleNavButtonProps = {
  ariaLabel: string
  children: ReactNode
  isActive: boolean
  label: string
  onClick: () => void
}

export function CapsuleNavButton({
  ariaLabel,
  children,
  isActive,
  label,
  onClick,
}: CapsuleNavButtonProps) {
  return (
    <button
      className={cn(
        "group relative flex w-[46px] items-center justify-center rounded-[18px] border px-2 py-2.5 text-[oklch(0.38_0.012_245)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.05_190_/_0.32)] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none",
        isActive
          ? "border-[oklch(0.82_0.02_190)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,247,0.96))] text-[oklch(0.2_0.018_245)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_10px_22px_oklch(0.22_0.015_245_/_0.08)]"
          : "border-transparent bg-transparent hover:border-[oklch(0.88_0.01_245)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,248,249,0.84))] hover:text-[oklch(0.22_0.018_245)] hover:shadow-[0_8px_18px_oklch(0.22_0.015_245_/_0.05)]"
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
            ? "bg-white/85 opacity-100"
            : "bg-white/70 opacity-0 group-hover:opacity-100"
        )}
      />
      <span
        className={cn(
          "absolute top-1/2 left-1 h-6 w-[2px] -translate-y-1/2 rounded-full transition-all",
          isActive
            ? "bg-[linear-gradient(180deg,oklch(0.76_0.05_190),oklch(0.68_0.04_190))] opacity-100"
            : "bg-[linear-gradient(180deg,oklch(0.76_0.05_190),oklch(0.68_0.04_190))] opacity-0 group-hover:opacity-55"
        )}
      />
      <span className="relative z-10 flex size-8 items-center justify-center">
        {children}
      </span>
      <span
        className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 translate-x-1 -translate-y-1/2 rounded-full border border-[oklch(0.86_0.01_245)] bg-[rgba(255,255,255,0.96)] px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap text-[oklch(0.24_0.016_245)] opacity-0 shadow-[0_10px_24px_oklch(0.18_0.015_245_/_0.10)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        {label}
      </span>
    </button>
  )
}
