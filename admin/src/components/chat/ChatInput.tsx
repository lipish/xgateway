import { forwardRef } from "react"
import { Send, Loader2, Image, Paperclip } from "lucide-react"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  disabled?: boolean
  loading?: boolean
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ value, onChange, onSend, onKeyDown, disabled, loading }, ref) => {
    const canSend = value.trim() && !disabled && !loading

    return (
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card/95 backdrop-blur-sm">
        <div className="relative flex items-center gap-3 px-4 py-2 rounded-3xl bg-muted/30 border border-border/30">
          <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
            <Image className="w-5 h-5 text-muted-foreground" strokeWidth={1.2} />
          </button>
          <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
            <Paperclip className="w-5 h-5 text-muted-foreground" strokeWidth={1.2} />
          </button>
          <textarea
            ref={ref}
            className="flex-1 min-h-[28px] max-h-32 py-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 border-none"
            style={{ fontSize: '14px' }}
            placeholder={t('chat.inputMessage')}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
          />
          <button
            className={cn(
              "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all",
              canSend
                ? "text-[#007AFF] hover:bg-[#007AFF]/10"
                : "text-[#D1D1D1] cursor-not-allowed"
            )}
            onClick={onSend}
            disabled={!canSend}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.2} />
            ) : (
              <Send className="w-5 h-5" strokeWidth={1.2} />
            )}
          </button>
        </div>
      </div>
    )
  }
)

ChatInput.displayName = "ChatInput"
