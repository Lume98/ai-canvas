"use client"

import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  PointerEvent,
} from "react"

type CanvasDotGridProps = ComponentPropsWithoutRef<"div"> & {
  showBackground?: boolean
}

type CanvasDotGridBackgroundProps = {
  className?: string
}

type DotGridStyle = CSSProperties & {
  "--dot-highlight-x"?: string
  "--dot-highlight-y"?: string
  "--dot-highlight-opacity"?: number
}

export function CanvasDotGrid({
  className,
  children,
  onPointerLeave,
  onPointerMove,
  showBackground = true,
  style,
  ...props
}: CanvasDotGridProps) {
  function setHighlight(
    event: PointerEvent<HTMLDivElement>,
    opacity: number,
  ) {
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty(
      "--dot-highlight-x",
      `${event.clientX - bounds.left}px`,
    )
    event.currentTarget.style.setProperty(
      "--dot-highlight-y",
      `${event.clientY - bounds.top}px`,
    )
    event.currentTarget.style.setProperty(
      "--dot-highlight-opacity",
      String(opacity),
    )
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    setHighlight(event, 1)
    onPointerMove?.(event)
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    setHighlight(event, 0)
    onPointerLeave?.(event)
  }

  return (
    <div
      {...props}
      className={[
        "relative flex size-full touch-none select-none items-center justify-center overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={
        {
          "--dot-highlight-x": "50%",
          "--dot-highlight-y": "50%",
          "--dot-highlight-opacity": 0,
          ...style,
        } as DotGridStyle
      }
    >
      {showBackground ? <CanvasDotGridBackground /> : null}
      {children}
    </div>
  )
}

export function CanvasDotGridBackground({
  className,
}: CanvasDotGridBackgroundProps) {
  return (
    <div
      className={[
        "absolute inset-0 bg-white",
        "bg-[radial-gradient(circle,oklch(0.78_0.018_245)_1px,transparent_1px)] bg-[length:22px_22px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_160px_at_var(--dot-highlight-x)_var(--dot-highlight-y),oklch(0.58_0.16_42/0.24)_0_1px,transparent_1.5px)] bg-[length:22px_22px] opacity-[var(--dot-highlight-opacity)] transition-opacity duration-200"
      />
    </div>
  )
}
