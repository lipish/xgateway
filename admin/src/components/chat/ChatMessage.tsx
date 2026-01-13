import React, { Suspense } from "react"
import { Bot } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "./types"

const ChatMessageMarkdown = React.lazy(() =>
  import("./ChatMessageMarkdown").then((m) => ({ default: m.ChatMessageMarkdown }))
)

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? "bg-primary/10" : "bg-muted"}`}>
        {isUser ? (
          <div className="text-[10px] font-bold text-primary">ME</div>
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className={`rounded-xl px-4 py-2.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border-border"}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          ) : (
            <Suspense fallback={<p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>}>
              <ChatMessageMarkdown content={message.content} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChatMessageLoading() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border bg-muted shadow-sm">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  )
}
