/**
 * ID 生成工具
 *
 * 为数据库实体生成具有可读前缀的唯一标识符。
 * 格式：`{prefix}_{uuid-without-dashes}`，例如 `task_a1b2c3d4e5f6...`
 * 前缀便于在日志和调试中快速识别实体类型。
 */

/**
 * 生成带前缀的唯一 ID
 * @param prefix - 实体类型前缀，如 "task"、"conversation"、"message"、"asset"
 * @returns 格式为 `{prefix}_{uuid}` 的字符串
 */
export function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`
}
