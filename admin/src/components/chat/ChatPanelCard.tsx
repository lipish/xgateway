import { forwardRef } from "react"
import { useNavigate } from "react-router-dom"
import { X, Settings, Sparkles, Maximize2, Minimize2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ChatMessage, ChatMessageLoading } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import type { ChatPanel, Provider } from "./types"

interface ChatPanelCardProps {
  panel: ChatPanel
  providers: Provider[]
  panelCount: number
  onProviderChange: (providerId: number) => void
  onMaximizeToggle: () => void
  onRemove: () => void
  onInputChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: (el: HTMLTextAreaElement | null) => void
  messagesEndRef: (el: HTMLDivElement | null) => void
}

export const ChatPanelCard = forwardRef<HTMLDivElement, ChatPanelCardProps>(
  ({
    panel,
    providers,
    panelCount,
    onProviderChange,
    onMaximizeToggle,
    onRemove,
    onInputChange,
    onSend,
    onKeyDown,
    inputRef,
    messagesEndRef,
  }, ref) => {
    const navigate = useNavigate()
    const provider = providers.find(p => p.id === panel.providerId)

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full min-h-0",
          panelCount === 1 ? "max-w-[50%] mx-auto w-full" : "",
          panel.maximized && "fixed inset-0 z-50 bg-background p-4"
        )}
      >
        <Card className="flex flex-col w-full h-full overflow-hidden p-0 gap-0 relative">
          <div className="px-4 py-3 flex items-center justify-between gap-4 shrink-0 flex-nowrap border-b border-transparent bg-card">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative group/model">
                <Select
                  value={panel.providerId?.toString() || ""}
                  onChange={v => onProviderChange(parseInt(v))}
                  options={providers.map(p => ({ value: p.id.toString(), label: `${p.name} ` }))}
                  placeholder={t('chat.selectProviderPlaceholder')}
                  className="w-auto min-w-[120px]"
                  triggerClassName="h-8 rounded-full bg-card border-0 hover:bg-muted/30 font-medium text-xs px-3 gap-1.5"
                />
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground/60">
              {panel.providerId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted rounded-lg"
                  onClick={() => navigate(`/instances?select=${panel.providerId}`)}
                  title={t('providers.edit')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted rounded-lg"
                onClick={onMaximizeToggle}
                title={t('chat.maximize')}
              >
                {panel.maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              {panelCount > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted rounded-lg hover:text-destructive"
                  onClick={onRemove}
                  title={t('chat.close')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0 relative">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 text-sm p-6 pb-24 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {panel.messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                    <Sparkles className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t('chat.startChat')}</h3>
                  <p className="text-muted-foreground/70 max-w-[240px] leading-relaxed">
                    {panel.providerId
                      ? `${t('chat.sendMessageToStart')} ${provider?.name}`
                      : t('chat.selectProviderFirst')}
                  </p>
                </div>
              )}

              {panel.messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}

              {panel.loading && panel.messages[panel.messages.length - 1]?.role !== "assistant" && (
                <ChatMessageLoading />
              )}

              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              ref={inputRef}
              value={panel.input}
              onChange={onInputChange}
              onSend={onSend}
              onKeyDown={onKeyDown}
              disabled={!panel.providerId}
              loading={panel.loading}
            />
          </CardContent>
        </Card>
      </div>
    )
  }
)

ChatPanelCard.displayName = "ChatPanelCard"
