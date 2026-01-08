import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Bot } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "./types"

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
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-3 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !String(children).includes('\n')
                    return isInline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[0.85em]" {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match?.[1] || 'text'}
                        PreTag="div"
                        className="rounded-lg text-[0.85rem] !my-3 border border-border/50 !bg-[#1e1e1e]"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
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
