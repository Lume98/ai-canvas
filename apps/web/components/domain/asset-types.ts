export type ImageAsset = {
  id: string
  taskId: string
  conversationId: string
  messageId: string
  filename: string
  url: string | null
  width: number
  height: number
  sortOrder: number
  createdAt: string
}
