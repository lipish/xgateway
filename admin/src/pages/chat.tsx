import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { apiGet, apiPost } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  ChatPanelCard,
  ChatHistoryDropdown,
  type Provider,
  type ConversationItem,
  type ChatPanel,
} from "@/components/chat"

export function ChatPage() {
  const { user } = useAuth()
  const isAdmin = user?.role_id === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const [providers, setProviders] = useState<Provider[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
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
    const endpoint = isAdmin ? "/api/instances" : `/api/users/${user?.id}/instances`
    apiGet(endpoint).then((result: any) => {
      if (result.success) {
        const enabledProviders = result.data.filter((p: Provider) => p.enabled)
        setProviders(enabledProviders)

        const providerIdParam = searchParams.get('provider')
        if (providerIdParam) {
          const providerId = parseInt(providerIdParam)
          setPanels([{ id: "1", providerId, conversationId: null, messages: [], loading: false, input: "" }])
          setSearchParams({}, { replace: true })
        } else if (enabledProviders.length > 0) {
          setPanels(prev => prev.map((p, i) => {
            if (p.providerId !== null) return p
            const providerIndex = Math.min(i, enabledProviders.length - 1)
            return { ...p, providerId: enabledProviders[providerIndex].id }
          }))
        }
        setTimeout(() => inputRefs.current["1"]?.focus(), 100)
      }
    })
    fetchConversations()
  }, [])

  useEffect(() => {
    panels.forEach(panel => {
      if (panel.loading || panel.messages.length > 0) {
        messagesEndRefs.current[panel.id]?.scrollIntoView({ behavior: "auto" })
      }
    })
  }, [
    panels.map(p => p.messages.length).join(','),
    panels.map(p => p.loading).join(','),
    panels.map(p => p.messages[p.messages.length - 1]?.content.length || 0).join(',')
  ])

  const updatePanel = (panelId: string, updates: Partial<ChatPanel>) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, ...updates } : p))
  }

  const addPanel = () => {
    if (panels.length >= 4) return
    setPanels(prev => [...prev, { id: Date.now().toString(), providerId: null, conversationId: null, messages: [], loading: false, input: "" }])
  }

  const removePanel = (id: string) => {
    if (panels.length <= 1) return
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  const loadConversation = async (conversationId: number, panelId: string) => {
    const result = await apiGet(`/api/conversations/${conversationId}`) as any
    if (result.success) {
      const conv = result.data
      updatePanel(panelId, {
        conversationId: conv.id,
        providerId: conv.provider_id,
        messages: conv.messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      })
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    }
  }

  const saveMessage = async (conversationId: number, role: string, content: string) => {
    await apiPost(`/api/conversations/${conversationId}/messages`, { role, content })
    fetchConversations()
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
    setPanels(prev => prev.map(p => p.conversationId === conversationId ? { ...p, conversationId: null, messages: [] } : p))
  }

  const sendMessage = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId)
    if (!panel || !panel.input.trim() || !panel.providerId) return

    const userMessage = panel.input.trim()
    let conversationId = panel.conversationId

    if (!conversationId) {
      conversationId = await createConversation(panel.providerId, userMessage.slice(0, 50))
      if (!conversationId) return
      updatePanel(panelId, { conversationId })
    }

    await saveMessage(conversationId, "user", userMessage)

    updatePanel(panelId, {
      input: "",
      messages: [...panel.messages, { role: "user" as const, content: userMessage }],
      loading: true
    })

    setTimeout(() => inputRefs.current[panelId]?.focus(), 0)

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
              }
            }
          }
        }
      }

      if (accumulatedContent && conversationId) {
        await saveMessage(conversationId, "assistant", accumulatedContent)
      }

      updatePanel(panelId, { loading: false })
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    } catch (err) {
      setPanels(prev => prev.map(p => p.id === panelId ? {
        ...p,
        messages: [...p.messages.slice(0, -1), { role: "assistant" as const, content: `${t('chat.networkError')}: ${err}` }],
        loading: false
      } : p))
      setTimeout(() => inputRefs.current[panelId]?.focus(), 100)
    }
  }

  const handleKeyDown = (panelId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(panelId)
    }
  }

  const gridCols = panels.length === 1 ? 'grid-cols-1' : panels.length === 2 ? 'grid-cols-2' : panels.length === 3 ? 'grid-cols-3' : 'grid-cols-4'

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-hidden p-6">
      <PageHeader
        title={t('chat.title')}
        subtitle={`${t('chat.subtitle')} ${panels.length} ${t('chat.windows')}`}
        action={
          <div className="flex gap-2">
            <ChatHistoryDropdown
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              conversations={conversations}
              onSelect={(id) => loadConversation(id, panels[0].id)}
              onDelete={deleteConversation}
            />
            <Button variant="default" size="sm" onClick={addPanel} disabled={panels.length >= 4} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              {t('chat.addChatWindow')}
            </Button>
          </div>
        }
      />
      <div className="flex-1 flex overflow-hidden min-h-0 h-full max-w-[1400px] mx-auto w-full">
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
          <div className={`flex-1 grid gap-4 overflow-hidden min-h-0 h-full ${gridCols}`}>
            {panels.map(panel => (
              <ChatPanelCard
                key={panel.id}
                panel={panel}
                providers={providers}
                panelCount={panels.length}
                onProviderChange={(providerId) => updatePanel(panel.id, { providerId })}
                onMaximizeToggle={() => updatePanel(panel.id, { maximized: !panel.maximized })}
                onRemove={() => removePanel(panel.id)}
                onInputChange={(input) => updatePanel(panel.id, { input })}
                onSend={() => sendMessage(panel.id)}
                onKeyDown={(e) => handleKeyDown(panel.id, e)}
                inputRef={(el) => { inputRefs.current[panel.id] = el }}
                messagesEndRef={(el) => { messagesEndRefs.current[panel.id] = el }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
