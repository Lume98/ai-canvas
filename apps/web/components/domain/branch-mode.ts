export const branchModes = ["evolve", "preserve", "transform"] as const

export type BranchMode = (typeof branchModes)[number]

export const defaultBranchMode: BranchMode = "evolve"

export const branchModeOptions: Array<{
  value: BranchMode
  label: string
  description: string
}> = [
  {
    value: "evolve",
    label: "延展风格",
    description: "延续原图气质与系列感，可以换构图和细节。",
  },
  {
    value: "preserve",
    label: "保持主体",
    description: "尽量保留主体身份与核心造型，偏局部修改。",
  },
  {
    value: "transform",
    label: "大幅改造",
    description: "把原图当起点，允许明显重构风格与场景。",
  },
]

export const branchModeLabelMap: Record<BranchMode, string> = Object.fromEntries(
  branchModeOptions.map((option) => [option.value, option.label]),
) as Record<BranchMode, string>
