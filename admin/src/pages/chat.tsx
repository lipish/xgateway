import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { apiGet, apiPost } from "@/lib/api"
import { useI18n, t } from "@/lib/i18n"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import { Send, Loader2, Bot, Plus, X, MessageSquarePlus, History, Trash2, PanelLeftClose, PanelLeft } from "lucide-react"
import { Select } from "@/components/ui/select"

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
}

export function ChatPage() {
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
    const result = await apiGet("/api/conversations?limit=50")
    if (result.success) {
      setConversations(result.data)
    }
  }

  useEffect(() => {
    apiGet("/api/instances").then(result => {
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
      messagesEndRefs.current[panel.id]?.scrollIntoView({ behavior: "smooth" })
    })
  }, [panels])

  const addPanel = () => {
    if (panels.length >= 4) return
    setPanels(prev => [...prev, { id: Date.now().toString(), providerId: null, conversationId: null, messages: [], loading: false, input: "" }])
  }

  const removePanel = (id: string) => {
    if (panels.length <= 1) return
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  const setProviderForPanel = (panelId: string, providerId: number) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, providerId } : p))
  }

  const clearPanel = (panelId: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, conversationId: null, messages: [] } : p))
    setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
  }

  const loadConversation = async (conversationId: number, panelId: string) => {
    const result = await apiGet(`/api/conversations/${conversationId}`)
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
    const result = await apiPost("/api/conversations", { provider_id: providerId, title })
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
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('chat.justNow')
    if (minutes < 60) return `${minutes}${t('chat.minutesAgo')}`
    if (hours < 24) return `${hours}${t('chat.hoursAgo')}`
    if (days < 7) return `${days}${t('chat.daysAgo')}`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6">
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 历史对话侧边栏 */}
        {showHistory && (
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="w-4 h-4" />
                {t('chat.history')}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('chat.noHistory')}</div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="group px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-transparent hover:border-border"
                    onClick={() => loadConversation(conv.id, panels[0].id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{conv.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {conv.provider_name || t('chat.unknown')} · {conv.message_count}{t('chat.messages')}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime(conv.updated_at)}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden min-h-0">
          <div className="flex gap-2 mb-4 shrink-0">
            {!showHistory && (
              <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                <PanelLeft className="w-4 h-4 mr-1" /> {t('chat.history')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addPanel} disabled={panels.length >= 4}>
              <Plus className="w-4 h-4 mr-1" /> {t('chat.addChatWindow')}
            </Button>
            <span className="text-sm text-muted-foreground self-center">{t('chat.maxWindows')}</span>
          </div>

          <div className={`flex-1 grid gap-4 overflow-hidden min-h-0 ${panels.length === 1 ? 'grid-cols-1' : panels.length === 2 ? 'grid-cols-2' : panels.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {panels.map(panel => (
              <div key={panel.id} className={panels.length === 1 ? "max-w-[50%] mx-auto w-full flex min-h-0" : "flex min-h-0"}>
              <Card className="flex flex-col overflow-hidden min-h-0 flex-1">
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <Select
                    value={panel.providerId?.toString() || ""}
                    onChange={v => setProviderForPanel(panel.id, parseInt(v))}
                    options={providers.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.provider_type})` }))}
                    placeholder={t('chat.selectProviderPlaceholder')}
                    className="w-[220px]"
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => clearPanel(panel.id)} title={t('chat.newChat')}>
                      <MessageSquarePlus className="w-4 h-4" />
                    </Button>
                    {panels.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePanel(panel.id)} title={t('chat.close')}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-3 text-sm p-6 pb-0 scrollbar-hide min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {panel.messages.length === 0 && !panel.providerId && (
                      <div className="text-center text-muted-foreground py-8">{t('chat.selectProviderFirst')}</div>
                    )}
                    {panel.messages.length === 0 && panel.providerId && (
                      <div className="text-center text-muted-foreground py-8">{t('chat.sendMessageToStart')}</div>
                    )}
                    {panel.messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && <Bot className="w-5 h-5 shrink-0 mt-1" />}
                        <div className={`max-w-[90%] rounded-lg px-3 py-2 overflow-hidden ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {msg.role === "user" ? (
                            <pre className="whitespace-pre-wrap break-all font-sans text-sm">{msg.content}</pre>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:p-0 prose-pre:bg-transparent">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    const isInline = !match && !String(children).includes('\n')
                                    return isInline ? (
                                      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <SyntaxHighlighter
                                        style={oneDark}
                                        language={match?.[1] || 'text'}
                                        PreTag="div"
                                        className="rounded-md text-sm !my-2"
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
                    ))}
                    {panel.loading && panel.messages[panel.messages.length - 1]?.role !== "assistant" && (
                      <div className="flex gap-2">
                        <Bot className="w-5 h-5 shrink-0" />
                        <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div>
                      </div>
                    )}
                    <div ref={el => messagesEndRefs.current[panel.id] = el} />
                  </div>
                  <div className="flex gap-2 px-6 py-4 border-t bg-white shrink-0">
                    <textarea
                      ref={el => inputRefs.current[panel.id] = el}
                      className="flex-1 min-h-[40px] max-h-24 px-3 py-2 rounded-xl bg-muted/50 text-sm resize-none focus:outline-none focus:bg-muted transition-colors placeholder:text-muted-foreground/60"
                      placeholder={t('chat.inputMessage')}
                      value={panel.input}
                      onChange={e => setInputForPanel(panel.id, e.target.value)}
                      onKeyDown={e => handleKeyDownForPanel(panel.id, e)}
                      disabled={!panel.providerId}
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-xl shrink-0"
                      onClick={() => sendMessageForPanel(panel.id)}
                      disabled={panel.loading || !panel.input.trim() || !panel.providerId}
                    >
                      {panel.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}