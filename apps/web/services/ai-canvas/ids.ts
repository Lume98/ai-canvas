export function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`
}
