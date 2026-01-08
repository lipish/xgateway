import { Button } from "@/components/ui/button"
import { History, Trash2, MessageSquarePlus, ChevronDown } from "lucide-react"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { ConversationItem } from "./types"

interface ChatHistoryDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: ConversationItem[]
  onSelect: (conversationId: number) => void
  onDelete: (conversationId: number) => void
}

export function ChatHistoryDropdown({
  open,
  onOpenChange,
  conversations,
  onSelect,
  onDelete,
}: ChatHistoryDropdownProps) {
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => onOpenChange(!open)}>
        <History className="mr-2 h-4 w-4" />
        {t('chat.history')}
        <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
              {t('chat.noHistory')}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className="group px-3 py-2.5 hover:bg-accent rounded-md cursor-pointer transition-colors relative mb-1"
                  onClick={() => { onSelect(conv.id); onOpenChange(false); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{conv.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                        <span className="shrink-0">{conv.provider_name || t('chat.unknown')}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span>{conv.message_count}{t('chat.messages')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
