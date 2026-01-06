import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { apiGet, apiPost } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import { useNavigate } from "react-router-dom"
import { Send, Loader2, Bot, Plus, X, MessageSquarePlus, History, Trash2, PanelLeftClose, PanelLeft, Settings, Sparkles, Maximize2, Minimize2, Image, Paperclip } from "lucide-react"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
}

interface ConversationItem {
  id: number
  title: string
  provider_id: number
  provider_name: string | null
  updated_at: string
  message_count: number
}

interface ChatPanel {
  id: string
  providerId: number | null
  conversationId: number | null
  messages: { role: "user" | "assistant"; content: string }[]
  loading: boolean
  input: string
  maximized?: boolean
}

export function ChatPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [providers, setProviders] = useState<Provider[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [panels, setPanels] = useState<ChatPanel[]>([
    { id: "1", providerId: null, conversationId: null, messages: [], loading: false, input: "" },
    { id: "2", providerId: null, conversationId: null, messages: [], loading: false, input: "" }
  ])
  const messagesEndRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})

  const fetchConversations = async () => {
    const result = await apiGet("/api/conversations?limit=50") as any
    if (result.success) {
      setConversations(result.data)
    }
  }

  useEffect(() => {
    apiGet("/api/instances").then((result: any) => {
      if (result.success) {
        const enabledProviders = result.data.filter((p: Provider) => p.enabled)
        setProviders(enabledProviders)

        // 检查 URL 参数是否指定了 provider
        const providerIdParam = searchParams.get('provider')
        if (providerIdParam) {
          const providerId = parseInt(providerIdParam)
          // 将第一个面板设置为指定的 provider，只保留一个面板
          setPanels([{ id: "1", providerId, conversationId: null, messages: [], loading: false, input: "" }])
          setSearchParams({}, { replace: true })
        } else if (enabledProviders.length > 0) {
          // 默认为两个窗口选择不同的 provider
          setPanels(prev => prev.map((p, i) => {
            if (p.providerId !== null) return p
            const providerIndex = Math.min(i, enabledProviders.length - 1)
            return { ...p, providerId: enabledProviders[providerIndex].id }
          }))
        }
        // 默认聚焦到第一个输入框
        setTimeout(() => inputRefs.current["1"]?.focus(), 100)
      }
    })
    fetchConversations()
  }, [])

  useEffect(() => {
    panels.forEach(panel => {
      if (panel.loading || panel.messages.length > 0) {
        messagesEndRefs.current[panel.id]?.scrollIntoView({ behavior: "smooth" })
      }
    })
  }, [panels.map(p => p.messages.length).join(','), panels.map(p => p.loading).join(',')])

  const addPanel = () => {
    if (panels.length >= 4) return
    setPanels(prev => [...prev, { id: Date.now().toString(), providerId: null, conversationId: null, messages: [], loading: false, input: "" }])
  }

  const removePanel = (id: string) => {
    if (panels.length <= 1) return
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  const toggleMaximizePanel = (panelId: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, maximized: !p.maximized } : p))
  }

  const setProviderForPanel = (panelId: string, providerId: number) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, providerId } : p))
  }

  const clearPanel = (panelId: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, conversationId: null, messages: [] } : p))
    setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
  }

  const loadConversation = async (conversationId: number, panelId: string) => {
    const result = await apiGet(`/api/conversations/${conversationId}`) as any
    if (result.success) {
      const conv = result.data
      setPanels(prev => prev.map(p => p.id === panelId ? {
        ...p,
        conversationId: conv.id,
        providerId: conv.provider_id,
        messages: conv.messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      } : p))
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    }
  }

  const saveMessage = async (conversationId: number, role: string, content: string) => {
    await apiPost(`/api/conversations/${conversationId}/messages`, { role, content })
    fetchConversations() // 刷新列表更新时间
  }

  const createConversation = async (providerId: number, title?: string): Promise<number | null> => {
    const result = await apiPost("/api/conversations", { provider_id: providerId, title }) as any
    if (result.success) {
      fetchConversations()
      return result.data.id
    }
    return null
  }

  const deleteConversation = async (conversationId: number) => {
    await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" })
    fetchConversations()
    // 清空所有加载了这个对话的面板
    setPanels(prev => prev.map(p => p.conversationId === conversationId ? { ...p, conversationId: null, messages: [] } : p))
  }

  const setInputForPanel = (panelId: string, input: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, input } : p))
  }

  const sendMessageForPanel = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId)
    if (!panel || !panel.input.trim() || !panel.providerId) return

    const userMessage = panel.input.trim()
    let conversationId = panel.conversationId

    // 如果没有对话ID，先创建一个新对话
    if (!conversationId) {
      conversationId = await createConversation(panel.providerId, userMessage.slice(0, 50))
      if (!conversationId) return
      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, conversationId } : p))
    }

    // 保存用户消息
    await saveMessage(conversationId, "user", userMessage)

    // Clear input and add user message, set loading
    setPanels(prev => prev.map(p => p.id === panelId ? {
      ...p,
      input: "",
      messages: [...p.messages, { role: "user" as const, content: userMessage }],
      loading: true
    } : p))

    // Keep focus on input
    setTimeout(() => inputRefs.current[panelId]?.focus(), 0)

    // Add empty assistant message for streaming
    setPanels(prev => prev.map(p => p.id === panelId ? {
      ...p,
      messages: [...p.messages, { role: "assistant" as const, content: "" }]
    } : p))

    try {
      const response = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: panel.providerId,
          messages: [...panel.messages, { role: "user", content: userMessage }],
          stream: true
        })
      })

      if (!response.ok) {
        const text = await response.text()
        setPanels(prev => prev.map(p => p.id === panelId ? {
          ...p,
          messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: `${t('chat.error')}: ${text}` }],
          loading: false
        } : p))
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5)
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content || ""
                accumulatedContent += delta
                setPanels(prev => prev.map(p => p.id === panelId ? {
                  ...p,
                  messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: accumulatedContent }]
                } : p))
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // 保存助手回复
      if (accumulatedContent && conversationId) {
        await saveMessage(conversationId, "assistant", accumulatedContent)
      }

      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, loading: false } : p))
      // 对话完成后聚焦到输入框
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    } catch (err) {
      setPanels(prev => prev.map(p => p.id === panelId ? {
        ...p,
        messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: `${t('chat.networkError')}: ${err}` }],
        loading: false
      } : p))
      // 错误后也聚焦到输入框
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    }
  }

  const handleKeyDownForPanel = (panelId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessageForPanel(panelId)
    }
  }

  // Removed unused formatTime

  return (
    <div className="flex flex-col h-full page-transition overflow-hidden">
      <PageHeader
        title={t('chat.title')}
        subtitle={`${t('chat.subtitle')} ${panels.length} ${t('chat.windows')}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              {t('chat.history')}
            </Button>
            <Button variant="default" size="sm" onClick={addPanel} disabled={panels.length >= 4} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              {t('chat.addChatWindow')}
            </Button>
          </div>
        }
      />
      <div className="flex-1 flex overflow-hidden min-h-0 max-w-[1400px] mx-auto w-full">
        {/* 历史对话侧边栏 */}
        {showHistory && (
          <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="w-4 h-4" />
                {t('chat.history')}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pt-2">
              {conversations.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">
                  <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  {t('chat.noHistory')}
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="group mx-2 px-3 py-3 hover:bg-muted rounded-lg cursor-pointer transition-colors relative mb-1"
                    onClick={() => loadConversation(conv.id, panels[0].id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{conv.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                          <span className="shrink-0">{conv.provider_name || t('chat.unknown')}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span>{conv.message_count}{t('chat.messages')}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className={`flex-1 grid gap-4 overflow-hidden min-h-0 ${panels.length === 1 ? 'grid-cols-1' : panels.length === 2 ? 'grid-cols-2' : panels.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {panels.map(panel => (
              <div key={panel.id} className={cn(
                "flex min-h-0",
                panels.length === 1 ? "max-w-[50%] mx-auto w-full" : "",
                panel.maximized && "fixed inset-0 z-50 bg-background p-4"
              )}>
                <Card className="flex flex-col overflow-hidden min-h-0 flex-1 p-0 gap-0">
                  {/* Card Header */}
                  <div className="px-4 py-3 flex items-center justify-between gap-4 shrink-0 flex-nowrap border-b border-transparent bg-card">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative group/model">
                        <Select
                          value={panel.providerId?.toString() || ""}
                          onChange={v => setProviderForPanel(panel.id, parseInt(v))}
                          options={providers.map(p => ({ value: p.id.toString(), label: `${p.name}` }))}
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
                        onClick={() => toggleMaximizePanel(panel.id)}
                        title={t('chat.maximize')}
                      >
                        {panel.maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                      {panels.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted rounded-lg hover:text-destructive"
                          onClick={() => removePanel(panel.id)}
                          title={t('chat.close')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardContent className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
                    <div className="flex-1 overflow-y-auto space-y-6 text-sm p-6 pb-4 scrollbar-hide min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {panel.messages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                            <Sparkles className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">{t('chat.startChat')}</h3>
                          <p className="text-muted-foreground/70 max-w-[240px] leading-relaxed">
                            {panel.providerId
                              ? `${t('chat.sendMessageToStart')} ${providers.find(p => p.id === panel.providerId)?.name}`
                              : t('chat.selectProviderFirst')}
                          </p>
                        </div>
                      )}
                      {panel.messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                            {msg.role === "assistant" ? <Bot className="w-4 h-4 text-primary" /> : <div className="text-[10px] font-bold text-primary">ME</div>}
                          </div>
                          <div className={`max-w-[85%] space-y-2`}>
                            <div className={`rounded-xl px-4 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border-border"}`}>
                              {msg.role === "user" ? (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
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
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {panel.loading && panel.messages[panel.messages.length - 1]?.role !== "assistant" && (
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
                      )}
                      <div ref={(el) => { messagesEndRefs.current[panel.id] = el }} />
                    </div>
                    <div className="p-4 pt-0 shrink-0 flex justify-center">
                      <div className="relative flex items-center gap-3 px-4 py-2 rounded-3xl bg-muted/30 border border-border/30 max-w-[800px] w-full">
                        <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
                          <Image className="w-5 h-5 text-muted-foreground" strokeWidth={1.2} />
                        </button>
                        <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
                          <Paperclip className="w-5 h-5 text-muted-foreground" strokeWidth={1.2} />
                        </button>
                        <textarea
                          ref={(el) => { inputRefs.current[panel.id] = el }}
                          className="flex-1 min-h-[28px] max-h-32 py-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 border-none"
                          style={{ fontSize: '14px' }}
                          placeholder={t('chat.inputMessage')}
                          value={panel.input}
                          onChange={e => setInputForPanel(panel.id, e.target.value)}
                          onKeyDown={e => handleKeyDownForPanel(panel.id, e)}
                          disabled={!panel.providerId}
                          rows={1}
                        />
                        <button
                          className={cn(
                            "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                            panel.input.trim()
                              ? "text-[#007AFF] hover:bg-[#007AFF]/10"
                              : "text-[#D1D1D1] cursor-not-allowed"
                          )}
                          onClick={() => sendMessageForPanel(panel.id)}
                          disabled={panel.loading || !panel.input.trim() || !panel.providerId}
                        >
                          {panel.loading ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.2} /> : <Send className="w-5 h-5" strokeWidth={1.2} />}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div >
  )
}