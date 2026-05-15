/**
 * 服务层公共类型定义
 *
 * 定义所有业务模块共享的 TypeScript 类型，包括：
 * - API 供应商配置（ProviderConfigRecord）
 * - 绘图任务及其状态（DrawTaskRecord / DrawTaskStatus）
 * - 会话及其消息（ConversationRecord / ConversationMessageRecord）
 * - 图片资源（ImageAssetRecord / PersistedImage）
 * - 消息状态（MessageStatus）
 *
 * 这些类型面向 API 响应序列化，所有日期字段均为 ISO 字符串。
 */

import type { BranchMode } from "@/components/domain/branch-mode"

/** AI 供应商配置记录，由 provider-config 模块使用 */
export type ProviderConfigRecord = {
  /** API Key（读取时不掩码，由前端决定展示） */
  apiKey: string
  /** OpenAI 兼容接口的 Base URL */
  baseUrl: string
  /** 数据库中是否已存储过 API Key */
  hasApiKey: boolean
  /** 上次更新时间（ISO 字符串），未配置过则为 null */
  updatedAt: string | null
}

/** 绘图任务的生命周期状态 */
export type DrawTaskStatus =
  | "queued"    // 已入队，等待执行
  | "running"   // 正在调用 AI 接口生成
  | "succeeded" // 生成成功
  | "failed"    // 生成失败
  | "canceled"  // 已取消

/** 会话消息的处理状态 */
export type MessageStatus = "pending" | "running" | "succeeded" | "failed"

/** 会话记录，对应数据库 conversation 表的序列化结果 */
export type ConversationRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

/** 图片资源记录，对应数据库 image_asset 表的序列化结果 */
export type ImageAssetRecord = {
  id: string
  /** 所属绘图任务 ID */
  taskId: string
  /** 所属会话 ID */
  conversationId: string
  /** 关联的消息 ID（assistant 回复消息） */
  messageId: string
  /** 本地文件名，如 `image_xxx.png` */
  filename: string
  /** 前端可访问的 URL 路径，如 `/api/generated-images/image_xxx.png` */
  url: string
  /** 图片宽度（px） */
  width: number
  /** 图片高度（px） */
  height: number
  /** 在同一任务/消息中的排序序号 */
  sortOrder: number
  createdAt: string
}

/** 绘图任务记录，对应数据库 draw_task 表的序列化结果 */
export type DrawTaskRecord = {
  id: string
  /** 关联会话 ID，独立生成时为 null */
  conversationId: string | null
  /** 用户发送的提示词对应的消息 ID */
  requestMessageId: string | null
  /** AI 回复的消息 ID */
  replyMessageId: string | null
  /** 用户输入的图片描述提示词 */
  prompt: string
  /** 使用的 AI 模型名称，如 `gpt-image-1` */
  model: string
  /** 图片尺寸，如 `1024x1024` */
  size: string
  /** 图片质量，如 `standard`、`hd` */
  quality: string
  /** 期望输出图片数量 */
  outputCount: number
  /** 图片延展模式：基于参考图演变 / 保持 / 大幅改造 */
  branchMode: BranchMode | null
  /** 父级图片资源 ID，用于基于已有图片二次生成 */
  parentAssetId: string | null
  /** 当前任务状态 */
  status: DrawTaskStatus
  /** 生成进度百分比（0–100） */
  progress: number
  /** 首张生成图片的访问 URL，失败时为 null */
  resultUrl: string | null
  /** 失败时的错误信息 */
  errorMessage: string | null
  /** 已重试次数 */
  attempts: number
  createdAt: string
  updatedAt: string
  /** 任务开始执行的时间 */
  startedAt: string | null
  /** 任务结束（成功或失败）的时间 */
  finishedAt: string | null
  /** 任务关联的图片资源列表 */
  assets: ImageAssetRecord[]
}

/** 会话消息记录，对应数据库 message 表的序列化结果 */
export type ConversationMessageRecord = {
  id: string
  conversationId: string
  /** 消息角色：用户或 AI 助手 */
  role: "user" | "assistant"
  /** 消息类型：用户提示词 / 图片结果 / 错误 */
  type: "prompt" | "image_result" | "error"
  /** 消息文本内容，图片结果类型时为 null */
  text: string | null
  /** 消息处理状态 */
  status: MessageStatus
  /** 在会话中的排序序号 */
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** 关联的图片资源列表 */
  assets: ImageAssetRecord[]
  /** 关联的绘图任务（仅 assistant 回复消息可能有） */
  task?: DrawTaskRecord
}

/** 持久化后的图片元数据，由 image-storage 模块返回 */
export type PersistedImage = {
  /** 本地文件名 */
  filename: string
  /** 图片宽度（px） */
  width: number
  /** 图片高度（px） */
  height: number
}
