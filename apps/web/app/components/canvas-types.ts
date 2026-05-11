export type ImageResult = {
  id: string
  url: string
  prompt: string
  model: string
  size: string
  quality: string
}

export const models = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
]

export const sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"]
export const qualities = ["auto", "high", "medium", "low"]

export const promptSeeds = [
  "一张极简产品海报，磨砂玻璃香水瓶放在石材台面上，柔和晨光，商业摄影",
  "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
  "为 AI 画布应用设计一个干净的应用图标，白底，精致几何形态",
]
