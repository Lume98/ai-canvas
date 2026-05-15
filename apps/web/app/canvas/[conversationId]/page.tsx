import { AiCanvas } from "@/components/canvas/ai-canvas"

type ConversationPageProps = {
  params: Promise<{
    conversationId: string
  }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params

  return <AiCanvas initialConversationId={conversationId} />
}
