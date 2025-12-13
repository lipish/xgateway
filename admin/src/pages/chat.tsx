import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { Send, Loader2, Bot, Plus, X, RotateCcw } from "lucide-react"
import { Select } from "@/components/ui/select"

interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
}

interface ChatPanel {
  id: string
  providerId: number | null
  messages: { role: "user" | "assistant"; content: string }[]
  loading: boolean
  input: string
}

export function ChatPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [panels, setPanels] = useState<ChatPanel[]>([
    { id: "1", providerId: null, messages: [], loading: false, input: "" },
    { id: "2", providerId: null, messages: [], loading: false, input: "" }
  ])
  const messagesEndRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})

  useEffect(() => {
    fetch("/api/providers").then(r => r.json()).then(result => {
      if (result.success) {
        const enabledProviders = result.data.filter((p: Provider) => p.enabled)
        setProviders(enabledProviders)
        // 默认为两个窗口选择不同的 provider
        if (enabledProviders.length > 0) {
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
  }, [])

  useEffect(() => {
    panels.forEach(panel => {
      messagesEndRefs.current[panel.id]?.scrollIntoView({ behavior: "smooth" })
    })
  }, [panels])

  const addPanel = () => {
    if (panels.length >= 4) return
    setPanels(prev => [...prev, { id: Date.now().toString(), providerId: null, messages: [], loading: false, input: "" }])
  }

  const removePanel = (id: string) => {
    if (panels.length <= 1) return
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  const setProviderForPanel = (panelId: string, providerId: number) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, providerId } : p))
  }

  const clearPanel = (panelId: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, messages: [] } : p))
  }

  const setInputForPanel = (panelId: string, input: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, input } : p))
  }

  const sendMessageForPanel = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId)
    if (!panel || !panel.input.trim() || !panel.providerId) return

    const userMessage = panel.input.trim()

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
          messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: `错误: ${text}` }],
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

      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, loading: false } : p))
    } catch (err) {
      setPanels(prev => prev.map(p => p.id === panelId ? {
        ...p,
        messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: `网络错误: ${err}` }],
        loading: false
      } : p))
    }
  }

  const handleKeyDownForPanel = (panelId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessageForPanel(panelId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="对话测试" description="选择 Provider 进行对比测试" />

      <div className="flex-1 p-6 flex flex-col overflow-hidden max-w-[1600px] mx-auto w-full">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={addPanel} disabled={panels.length >= 4}>
            <Plus className="w-4 h-4 mr-1" /> 添加对话窗口
          </Button>
          <span className="text-sm text-muted-foreground self-center">最多 4 个窗口并排对比</span>
        </div>

        <div className={`flex-1 grid gap-4 overflow-hidden ${panels.length === 1 ? 'grid-cols-1' : panels.length === 2 ? 'grid-cols-2' : panels.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {panels.map(panel => {
            const provider = providers.find(p => p.id === panel.providerId)
            return (
              <Card key={panel.id} className="flex flex-col overflow-hidden">
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <Select
                    value={panel.providerId?.toString() || ""}
                    onChange={v => setProviderForPanel(panel.id, parseInt(v))}
                    options={providers.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.provider_type})` }))}
                    placeholder="选择 Provider"
                    className="w-[180px]"
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => clearPanel(panel.id)} title="清空对话">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    {panels.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePanel(panel.id)} title="关闭">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-3 text-sm">
                    {panel.messages.length === 0 && !panel.providerId && (
                      <div className="text-center text-muted-foreground py-8">请先选择 Provider</div>
                    )}
                    {panel.messages.length === 0 && panel.providerId && (
                      <div className="text-center text-muted-foreground py-8">发送消息开始测试</div>
                    )}
                    {panel.messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && <Bot className="w-5 h-5 shrink-0 mt-1" />}
                        <div className={`max-w-[90%] rounded-lg px-3 py-2 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
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
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <textarea
                      ref={el => inputRefs.current[panel.id] = el}
                      className="flex-1 min-h-[36px] max-h-24 px-2 py-1.5 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="输入消息..."
                      value={panel.input}
                      onChange={e => setInputForPanel(panel.id, e.target.value)}
                      onKeyDown={e => handleKeyDownForPanel(panel.id, e)}
                      disabled={!panel.providerId}
                      rows={1}
                    />
                    <Button
                      size="sm"
                      onClick={() => sendMessageForPanel(panel.id)}
                      disabled={panel.loading || !panel.input.trim() || !panel.providerId}
                    >
                      {panel.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

