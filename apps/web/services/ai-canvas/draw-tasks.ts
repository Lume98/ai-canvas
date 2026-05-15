import { NextResponse } from "next/server"

import { initDatabase, prisma } from "@/db"
import type { DrawTaskInput } from "@/lib/validations/ai-canvas"

import { CONVERSATION_NOT_FOUND_CODE } from "./conversations"
import { apiError, errorResponse, normalizeError } from "./errors"
import { buildId } from "./ids"
import { readImageFile, saveGeneratedImage } from "./image-storage"
import { generateOpenAiImages } from "./openai-images"
import { getProviderConfigRecord } from "./provider-config"
import { readJson, validateDrawTaskInput } from "./request"
import {
  listAssetsByTaskIds,
  serializeTask,
} from "./serializers"
import type { DrawTaskRecord } from "./types"

export async function listDrawTasks() {
  await initDatabase()
  const rows = await prisma.drawTask.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  })

  const assetsByTaskId = await listAssetsByTaskIds(rows.map((row) => row.id))

  return NextResponse.json({
    tasks: rows.map((row) => serializeTask(row, assetsByTaskId.get(row.id) ?? [])),
  })
}

export async function readDrawTask(taskId: string) {
  await initDatabase()
  const row = await prisma.drawTask.findUnique({ where: { id: taskId } })

  if (!row) {
    return errorResponse(apiError("任务不存在。", 404))
  }

  const assetsByTaskId = await listAssetsByTaskIds([taskId])
  return NextResponse.json({
    task: serializeTask(row, assetsByTaskId.get(taskId) ?? []),
  })
}

export async function createDrawTask(request: Request) {
  const payload = await readJson(request)
  const input = validateDrawTaskInput(payload)
  if ("message" in input) return errorResponse(input)

  try {
    const task = await createSynchronousDrawTask(input)
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    return errorResponse(normalizeError(error))
  }
}

async function createSynchronousDrawTask(
  input: DrawTaskInput,
): Promise<DrawTaskRecord> {
  await initDatabase()
  const taskId = buildId("task")
  const requestMessageId = buildId("message")
  const replyMessageId = buildId("message")

  await prisma.$transaction(async (tx) => {
    const conversationExists = await tx.conversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true },
    })

    if (!conversationExists) {
      throw apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE)
    }

    const nextSortOrderAggregate = await tx.message.aggregate({
      where: { conversationId: input.conversationId },
      _max: { sortOrder: true },
    })
    const nextSortOrder = (nextSortOrderAggregate._max.sortOrder ?? 0) + 1

    await tx.message.create({
      data: {
        id: requestMessageId,
        conversationId: input.conversationId,
        role: "user",
        type: "prompt",
        text: input.prompt,
        status: "succeeded",
        sortOrder: nextSortOrder,
      },
    })

    await tx.message.create({
      data: {
        id: replyMessageId,
        conversationId: input.conversationId,
        role: "assistant",
        type: "image_result",
        text: null,
        status: "pending",
        sortOrder: nextSortOrder + 1,
      },
    })

    await tx.drawTask.create({
      data: {
        id: taskId,
        conversationId: input.conversationId,
        requestMessageId,
        replyMessageId,
        prompt: input.prompt,
        model: input.model,
        size: input.size,
        quality: input.quality,
        outputCount: input.outputCount,
        branchMode: input.branchMode,
        parentAssetId: input.parentAssetId,
        status: "queued",
        progress: 0,
        attempts: 1,
        startedAt: new Date(),
      },
    })

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    })
  })

  try {
    const providerConfig = await getProviderConfigRecord()
    const sourceImageBytes = input.parentAssetId
      ? await readSourceImageBytes(input.parentAssetId)
      : undefined
    const imageBytesList = await generateOpenAiImages(
      input,
      providerConfig,
      sourceImageBytes,
    )
    const persistedImages = await Promise.all(
      imageBytesList.map((imageBytes) => saveGeneratedImage(imageBytes)),
    )

    await prisma.$transaction(async (tx) => {
      await tx.drawTask.update({
        where: { id: taskId },
        data: {
          status: "succeeded",
          progress: 100,
          resultFilename: persistedImages[0]?.filename ?? null,
          errorMessage: null,
          finishedAt: new Date(),
        },
      })

      await tx.message.update({
        where: { id: replyMessageId },
        data: { status: "succeeded" },
      })

      await tx.imageAsset.deleteMany({ where: { taskId } })

      if (persistedImages.length > 0) {
        await tx.imageAsset.createMany({
          data: persistedImages.map((image, index) => ({
            id: buildId("asset"),
            taskId,
            conversationId: input.conversationId,
            messageId: replyMessageId,
            filename: image.filename,
            width: image.width,
            height: image.height,
            sortOrder: index,
          })),
        })
      }
    })
  } catch (error) {
    const normalizedError = normalizeError(error)

    await prisma.$transaction(async (tx) => {
      await tx.drawTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: normalizedError.message,
          finishedAt: new Date(),
        },
      })

      await tx.message.update({
        where: { id: replyMessageId },
        data: { status: "failed" },
      })
    })
  }

  const taskRow = await prisma.drawTask.findUniqueOrThrow({ where: { id: taskId } })
  const assetsByTaskId = await listAssetsByTaskIds([taskId])
  return serializeTask(taskRow, assetsByTaskId.get(taskId) ?? [])
}

async function readSourceImageBytes(parentAssetId: string) {
  await initDatabase()
  const row = await prisma.imageAsset.findUnique({
    where: { id: parentAssetId },
    select: { filename: true },
  })

  if (!row?.filename) {
    throw apiError("来源图片不存在，无法继续生成。", 404)
  }

  return readImageFile(row.filename)
}
