import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChatCodeBlock } from "./ChatCodeBlock"

interface ChatMessageMarkdownProps {
  content: string
}

export function ChatMessageMarkdown({ content }: ChatMessageMarkdownProps) {
  return (
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
              <ChatCodeBlock language={match?.[1] || 'text'} code={String(children).replace(/\n$/, '')} />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
