import { LogOut, Settings } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const panelSurfaceClassName =
  "rounded-[22px] border border-[oklch(0.89_0.008_245)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,249,250,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_26px_oklch(0.22_0.014_245_/_0.05)]"

export function ProfilePanelContent({
  initial,
  onLogoutClick,
  onOpenSettings,
  profileStatus,
  userName,
}: {
  initial: string
  onLogoutClick: () => void
  onOpenSettings: () => void
  profileStatus: string
  userName: string
}) {
  return (
    <div className="space-y-3">
      <div className={cn(panelSurfaceClassName, "flex items-center gap-3 px-4 py-4")}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(180deg,oklch(0.98_0.004_110),oklch(0.92_0.012_245))] text-sm font-semibold text-[oklch(0.29_0.018_245)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_oklch(0.2_0.015_245_/_0.08)]">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[oklch(0.24_0.018_245)]">
            {userName}
          </p>
          <p className="mt-1 text-xs text-[oklch(0.5_0.012_245)]">本地画布用户</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Button
          className={cn(
            panelSurfaceClassName,
            "h-11 justify-start px-4 text-[oklch(0.28_0.018_245)] shadow-none hover:border-[oklch(0.82_0.012_190)] hover:bg-[oklch(0.98_0.006_190)]"
          )}
          variant="outline"
          type="button"
          onClick={onOpenSettings}
        >
          <Settings className="size-4" />
          设置
        </Button>
        <Button
          className={cn(
            panelSurfaceClassName,
            "h-11 justify-start px-4 text-[oklch(0.48_0.09_30)] shadow-none hover:border-[oklch(0.84_0.04_30)] hover:bg-[oklch(0.98_0.008_30)]"
          )}
          variant="ghost"
          type="button"
          onClick={onLogoutClick}
        >
          <LogOut className="size-4" />
          退出登录
        </Button>
      </div>

      {profileStatus ? (
        <p className="px-1 text-xs leading-5 text-[oklch(0.47_0.012_245)]">
          {profileStatus}
        </p>
      ) : null}
    </div>
  )
}
