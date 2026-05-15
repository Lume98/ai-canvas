import { branchModes } from "@/components/domain/branch-mode"

const imageModels = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"] as const
const imageSizes = ["1024x1024", "1536x1024", "1024x1536", "auto"] as const
const imageQualities = ["auto", "high", "medium", "low"] as const
const drawTaskStatuses = ["queued", "running", "succeeded", "failed", "canceled"] as const
const messageStatuses = ["pending", "running", "succeeded", "failed"] as const
const messageRoles = ["user", "assistant"] as const
const messageTypes = ["prompt", "image_result", "error"] as const

type OpenApiSchema = {
  $ref?: string
  type?: string
  format?: string
  title?: string
  description?: string
  enum?: readonly string[]
  items?: OpenApiSchema
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  nullable?: boolean
  additionalProperties?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  default?: string | number | boolean | null
  example?: unknown
}

function jsonContent(schema: OpenApiSchema, example?: unknown) {
  return {
    "application/json": {
      schema,
      ...(example === undefined ? {} : { example }),
    },
  }
}

function response(description: string, schema: OpenApiSchema, example?: unknown) {
  return {
    description,
    content: jsonContent(schema, example),
  }
}

const schemas = {
  ErrorResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      error: { type: "string", description: "错误信息" },
      code: { type: "string", nullable: true, description: "可选错误码" },
    },
    required: ["error"],
  } satisfies OpenApiSchema,
  ImageAsset: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      taskId: { type: "string" },
      conversationId: { type: "string" },
      messageId: { type: "string" },
      filename: { type: "string" },
      url: { type: "string", nullable: true },
      width: { type: "integer" },
      height: { type: "integer" },
      sortOrder: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: [
      "id",
      "taskId",
      "conversationId",
      "messageId",
      "filename",
      "url",
      "width",
      "height",
      "sortOrder",
      "createdAt",
    ],
  } satisfies OpenApiSchema,
  Conversation: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "title", "createdAt", "updatedAt"],
  } satisfies OpenApiSchema,
  DrawTask: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      conversationId: { type: "string", nullable: true },
      requestMessageId: { type: "string", nullable: true },
      replyMessageId: { type: "string", nullable: true },
      prompt: { type: "string" },
      model: { type: "string", enum: imageModels },
      size: { type: "string", enum: imageSizes },
      quality: { type: "string", enum: imageQualities },
      outputCount: { type: "integer", minimum: 1, maximum: 4 },
      branchMode: { type: "string", enum: branchModes, nullable: true },
      parentAssetId: { type: "string", nullable: true },
      status: { type: "string", enum: drawTaskStatuses },
      progress: { type: "integer", minimum: 0, maximum: 100 },
      resultUrl: { type: "string", nullable: true },
      errorMessage: { type: "string", nullable: true },
      attempts: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      startedAt: { type: "string", format: "date-time", nullable: true },
      finishedAt: { type: "string", format: "date-time", nullable: true },
      assets: {
        type: "array",
        items: { title: "ImageAsset" },
      },
    },
    required: [
      "id",
      "conversationId",
      "requestMessageId",
      "replyMessageId",
      "prompt",
      "model",
      "size",
      "quality",
      "outputCount",
      "branchMode",
      "parentAssetId",
      "status",
      "progress",
      "resultUrl",
      "errorMessage",
      "attempts",
      "createdAt",
      "updatedAt",
      "startedAt",
      "finishedAt",
      "assets",
    ],
  } satisfies OpenApiSchema,
  ConversationMessage: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      conversationId: { type: "string" },
      role: { type: "string", enum: messageRoles },
      type: { type: "string", enum: messageTypes },
      text: { type: "string", nullable: true },
      status: { type: "string", enum: messageStatuses },
      sortOrder: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      assets: {
        type: "array",
        items: { title: "ImageAsset" },
      },
      task: {
        title: "DrawTask",
        nullable: true,
      },
    },
    required: [
      "id",
      "conversationId",
      "role",
      "type",
      "text",
      "status",
      "sortOrder",
      "createdAt",
      "updatedAt",
      "assets",
    ],
  } satisfies OpenApiSchema,
  ProviderConfig: {
    type: "object",
    additionalProperties: false,
    properties: {
      apiKey: { type: "string" },
      baseUrl: { type: "string", format: "uri" },
      hasApiKey: { type: "boolean" },
      updatedAt: { type: "string", format: "date-time", nullable: true },
    },
    required: ["apiKey", "baseUrl", "hasApiKey", "updatedAt"],
  } satisfies OpenApiSchema,
  CreateConversationRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", description: "可选标题，默认未命名会话" },
    },
  } satisfies OpenApiSchema,
  ProviderConfigRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      apiKey: { type: "string", minLength: 1 },
      baseUrl: {
        type: "string",
        format: "uri",
        default: "https://api.openai.com/v1",
      },
    },
    required: ["apiKey"],
  } satisfies OpenApiSchema,
  GenerateImageRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      prompt: { type: "string", description: "提示词，最长 2400 字符" },
      model: { type: "string", enum: imageModels, default: "gpt-image-2" },
      size: { type: "string", enum: imageSizes, default: "1024x1024" },
      quality: { type: "string", enum: imageQualities, default: "auto" },
    },
    required: ["prompt"],
  } satisfies OpenApiSchema,
  CreateDrawTaskRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      conversationId: { type: "string" },
      prompt: { type: "string", description: "提示词，最长 2400 字符" },
      model: { type: "string", enum: imageModels, default: "gpt-image-2" },
      size: { type: "string", enum: imageSizes, default: "1024x1024" },
      quality: { type: "string", enum: imageQualities, default: "auto" },
      outputCount: { type: "integer", minimum: 1, maximum: 4, default: 1 },
      branchMode: { type: "string", enum: branchModes, nullable: true },
      parentAssetId: { type: "string", nullable: true },
    },
    required: ["conversationId", "prompt"],
  } satisfies OpenApiSchema,
  GenerateImageResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      image: { type: "string" },
    },
    required: ["image"],
  } satisfies OpenApiSchema,
  ProviderConfigResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      config: { title: "ProviderConfig" },
    },
    required: ["config"],
  } satisfies OpenApiSchema,
  ConversationResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      conversation: { title: "Conversation" },
    },
    required: ["conversation"],
  } satisfies OpenApiSchema,
  ConversationsResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      conversations: {
        type: "array",
        items: { title: "Conversation" },
      },
    },
    required: ["conversations"],
  } satisfies OpenApiSchema,
  ConversationMessagesResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      messages: {
        type: "array",
        items: { title: "ConversationMessage" },
      },
    },
    required: ["messages"],
  } satisfies OpenApiSchema,
  DrawTaskResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      task: { title: "DrawTask" },
    },
    required: ["task"],
  } satisfies OpenApiSchema,
  DrawTasksResponse: {
    type: "object",
    additionalProperties: false,
    properties: {
      tasks: {
        type: "array",
        items: { title: "DrawTask" },
      },
    },
    required: ["tasks"],
  } satisfies OpenApiSchema,
}

function resolveSchema(schema: OpenApiSchema): OpenApiSchema {
  if (schema.title && schema.title in schemas && !schema.properties && !schema.items) {
    return { $ref: `#/components/schemas/${schema.title}` }
  }

  return {
    ...schema,
    ...(schema.items ? { items: resolveSchema(schema.items) } : {}),
    ...(schema.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [key, resolveSchema(value)]),
          ),
        }
      : {}),
  }
}

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "AI Canvas API",
    version: "0.0.1",
    description: "AI Canvas 的公开 HTTP API 文档。",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Conversations", description: "会话管理" },
    { name: "Messages", description: "会话消息读取" },
    { name: "Draw Tasks", description: "绘图任务创建与查询" },
    { name: "Images", description: "单图生成与图片访问" },
    { name: "Provider Config", description: "OpenAI 提供方配置" },
  ],
  paths: {
    "/api/conversations": {
      get: {
        tags: ["Conversations"],
        operationId: "listConversations",
        summary: "列出全部会话",
        responses: {
          200: response("会话列表", schemas.ConversationsResponse),
        },
      },
      post: {
        tags: ["Conversations"],
        operationId: "createConversation",
        summary: "创建会话",
        requestBody: {
          required: false,
          content: jsonContent(schemas.CreateConversationRequest),
        },
        responses: {
          201: response("新建成功", schemas.ConversationResponse),
          400: response("请求参数错误", schemas.ErrorResponse),
        },
      },
    },
    "/api/conversations/{conversationId}": {
      get: {
        tags: ["Conversations"],
        operationId: "readConversation",
        summary: "读取单个会话",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: response("会话详情", schemas.ConversationResponse),
          404: response("会话不存在", schemas.ErrorResponse),
        },
      },
    },
    "/api/conversations/{conversationId}/messages": {
      get: {
        tags: ["Messages"],
        operationId: "readConversationMessages",
        summary: "读取会话消息",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: response("消息列表", schemas.ConversationMessagesResponse),
          404: response("会话不存在", schemas.ErrorResponse),
        },
      },
    },
    "/api/draw-tasks": {
      get: {
        tags: ["Draw Tasks"],
        operationId: "listDrawTasks",
        summary: "列出最近绘图任务",
        responses: {
          200: response("任务列表", schemas.DrawTasksResponse),
        },
      },
      post: {
        tags: ["Draw Tasks"],
        operationId: "createDrawTask",
        summary: "创建绘图任务",
        requestBody: {
          required: true,
          content: jsonContent(schemas.CreateDrawTaskRequest),
        },
        responses: {
          201: response("任务创建成功", schemas.DrawTaskResponse),
          400: response("请求参数错误", schemas.ErrorResponse),
          401: response("Provider API Key 缺失", schemas.ErrorResponse),
          404: response("会话或来源图片不存在", schemas.ErrorResponse),
          500: response("服务端错误", schemas.ErrorResponse),
          502: response("上游生成失败", schemas.ErrorResponse),
        },
      },
    },
    "/api/draw-tasks/{taskId}": {
      get: {
        tags: ["Draw Tasks"],
        operationId: "readDrawTask",
        summary: "读取单个绘图任务",
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: response("任务详情", schemas.DrawTaskResponse),
          404: response("任务不存在", schemas.ErrorResponse),
        },
      },
    },
    "/api/images/generate": {
      post: {
        tags: ["Images"],
        operationId: "generateImage",
        summary: "生成单张图片",
        requestBody: {
          required: true,
          content: jsonContent(schemas.GenerateImageRequest),
        },
        responses: {
          200: response("生成成功", schemas.GenerateImageResponse),
          400: response("请求参数错误", schemas.ErrorResponse),
          401: response("Provider API Key 缺失", schemas.ErrorResponse),
          500: response("服务端错误", schemas.ErrorResponse),
          502: response("上游生成失败", schemas.ErrorResponse),
        },
      },
    },
    "/api/generated-images/{filename}": {
      get: {
        tags: ["Images"],
        operationId: "readGeneratedImage",
        summary: "读取生成后的 PNG 图片",
        parameters: [
          {
            name: "filename",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "PNG 二进制文件",
            content: {
              "image/png": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          404: response("图片不存在", schemas.ErrorResponse),
        },
      },
    },
    "/api/provider-config": {
      get: {
        tags: ["Provider Config"],
        operationId: "getProviderConfig",
        summary: "读取 Provider 配置",
        responses: {
          200: response("当前配置", schemas.ProviderConfigResponse),
        },
      },
      post: {
        tags: ["Provider Config"],
        operationId: "saveProviderConfig",
        summary: "保存 Provider 配置",
        requestBody: {
          required: true,
          content: jsonContent(schemas.ProviderConfigRequest),
        },
        responses: {
          200: response("保存成功", schemas.ProviderConfigResponse),
          400: response("请求参数错误", schemas.ErrorResponse),
        },
      },
      delete: {
        tags: ["Provider Config"],
        operationId: "clearProviderConfig",
        summary: "清空 Provider 配置",
        responses: {
          200: response("清空后配置", schemas.ProviderConfigResponse),
        },
      },
    },
  },
  components: {
    schemas: Object.fromEntries(
      Object.entries(schemas).map(([key, schema]) => [key, resolveSchema(schema)]),
    ),
  },
} as const

export type OpenApiDocument = typeof openApiDocument

export function getOpenApiDocument(): OpenApiDocument {
  return openApiDocument
}
