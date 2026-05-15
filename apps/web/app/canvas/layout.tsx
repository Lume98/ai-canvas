export default function CanvasLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="h-svh overflow-hidden">{children}</div>
}
