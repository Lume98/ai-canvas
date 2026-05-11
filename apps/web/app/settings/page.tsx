import { SettingsForm } from "@/components/settings/settings-form"

export default function SettingsPage() {
  return (
    <main className="h-svh overflow-hidden bg-[oklch(0.985_0.012_92)] text-[oklch(0.17_0.018_245)]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-[oklch(0.83_0.025_75)] bg-white/45 px-5 py-5">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
              Provider Settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold">AI 接口配置</h1>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-3xl rounded-lg border border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)] p-5 shadow-sm">
            <SettingsForm />
          </div>
        </div>
      </div>
    </main>
  )
}
