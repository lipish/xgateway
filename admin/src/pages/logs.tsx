import { useState, useEffect, useRef, useCallback } from "react"
import { apiGet } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { t, useI18n } from "@/lib/i18n"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Search, Download, Clock, Server, Pause, Play } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PageContainer } from "@/components/layout/page-container"

interface RequestLog {
  id: number
  created_at: string
  service_id: string | null
  provider_id: number | null
  provider_name: string
  model: string
  status: "success" | "error" | "timeout"
  latency_ms: number
  tokens_used: number
  error_message: string | null
  request_type: string
  request_content: string | null
  response_content: string | null
}

export function LogsPage() {
  const { language } = useI18n()
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all")
  const [hideHealthChecks, setHideHealthChecks] = useState(true)
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const refreshTimerRef = useRef<number | null>(null)
  const fetchInFlightRef = useRef(false)
  const mountedRef = useRef(false)

  const fetchLogs = useCallback(async ({ initial }: { initial: boolean }) => {
    if (fetchInFlightRef.current) return
    fetchInFlightRef.current = true
    try {
      if (initial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (requestTypeFilter !== 'all') params.set('request_type', requestTypeFilter)
      if (hideHealthChecks) params.set('exclude_health_checks', 'true')
      const data = await apiGet<{ success: boolean; data?: RequestLog[] }>(`/api/logs?${params.toString()}`)
      if (data.success) {
        const logsData = data.data || []
        setLogs(logsData)
        setSelectedLog((prev) => {
          if (logsData.length === 0) return null
          if (!prev) return logsData[0]
          return logsData.find((l: RequestLog) => l.id === prev.id) || logsData[0]
        })
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
      if (initial) {
        setLogs([])
      }
    } finally {
      const isMounted = mountedRef.current
      fetchInFlightRef.current = false
      if (isMounted) {
        if (initial) {
          setLoading(false)
        } else {
          setRefreshing(false)
        }
      }
    }
  }, [hideHealthChecks, requestTypeFilter, statusFilter])

  useEffect(() => {
    mountedRef.current = true
    fetchLogs({ initial: true })

    return () => {
      mountedRef.current = false
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      return
    }

    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    refreshTimerRef.current = window.setInterval(() => {
      fetchLogs({ initial: false })
    }, 3000)

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefreshEnabled, fetchLogs])

  const requestTypeOptions = (() => {
    const types = Array.from(new Set(logs.map((l) => l.request_type).filter(Boolean))).sort()
    const toLabel = (tpe: string) => {
      if (tpe === "health_check" || tpe === "provider_disabled") return t("logs.healthCheck")
      if (tpe === "chat") return t("logs.chat")
      return tpe
    }
    return [
      { value: "all", label: t("logs.allTypes") },
      ...types.map((tpe) => ({ value: tpe, label: toLabel(tpe) })),
    ]
  })()

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = log.provider_name.toLowerCase().includes(q) ||
      log.model.toLowerCase().includes(q) ||
      (log.service_id || "").toLowerCase().includes(q) ||
      (log.request_type || "").toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    const matchesType = requestTypeFilter === "all" || log.request_type === requestTypeFilter
    const matchesHideHealthChecks = !hideHealthChecks || log.request_type !== "health_check"
    return matchesSearch && matchesStatus && matchesType && matchesHideHealthChecks
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-violet-50 text-violet-700 border border-violet-200" variant="outline">{t('common.success')}</Badge>
      case 'error': return <Badge className="bg-destructive text-destructive-foreground border-0" variant="destructive">{t('common.error')}</Badge>
      case 'timeout': return <Badge variant="secondary">{t('common.timeout')}</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const exportLogs = () => {
    const csv = [
      ['ID', 'Timestamp', 'Provider', 'Model', 'Status', 'Latency(ms)', 'Tokens', 'Error'].join(','),
      ...filteredLogs.map(log => [
        log.id, log.created_at, log.provider_name, log.model, log.status, log.latency_ms, log.tokens_used, log.error_message || ''
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xgateway-logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    }

  return (
    <PageShell className="overflow-y-auto">
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.description')}
        onRefresh={() => fetchLogs({ initial: false })}
        loading={refreshing}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefreshEnabled((v) => !v)}
          >
            {autoRefreshEnabled ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                {t('logs.stopAutoRefresh')}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t('logs.autoRefresh')}
              </>
            )}
          </Button>
        }
      />
      <PageContainer className="overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('logs.search')}
              className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "all", label: t('logs.allStatus') },
              { value: "success", label: t('common.success') },
              { value: "error", label: t('common.error') },
              { value: "timeout", label: t('logs.timeout') },
            ]}
            className="w-[120px]"
          />
          <Select
            value={requestTypeFilter}
            onChange={(value) => setRequestTypeFilter(value)}
            options={requestTypeOptions}
            className="w-[160px]"
          />
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground whitespace-nowrap">{t("logs.hideHealthChecks")}</div>
            <Switch checked={hideHealthChecks} onCheckedChange={setHideHealthChecks} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="mr-2 h-4 w-4" />
              {t('logs.export')}
            </Button>
          </div>
        </div>

        <div className="flex gap-6 h-[calc(100%-60px)]">
          {/* Left: Log List */}
          <div className="flex-1 bg-card rounded-xl border overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto scrollbar-hide">
              {loading ? (
                <div className="text-center py-4">{t('common.loading')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">{t('logs.timestamp')}</TableHead>
                      <TableHead>{t('logs.service')}</TableHead>
                      <TableHead>{t('logs.provider')}</TableHead>
                      <TableHead>{t('logs.model')}</TableHead>
                      <TableHead>{t('logs.status')}</TableHead>
                      <TableHead>{t('logs.latency')}</TableHead>
                      <TableHead>Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedLog?.id === log.id ? 'bg-violet-50 border-l-2 border-l-violet-400' : ''}`}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-sm whitespace-nowrap pl-6">{formatDateTime(log.created_at, language)}</TableCell>
                        <TableCell>{log.service_id || '-'}</TableCell>
                        <TableCell>{log.provider_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.model}</Badge>
                            {log.request_type === 'health_check' && (
                              <Badge variant="secondary">{t('logs.healthCheck')}</Badge>
                            )}
                            {log.request_type === 'provider_disabled' && (
                              <Badge className="bg-destructive text-destructive-foreground border-0" variant="destructive">
                                {t('logs.providerDisabled')}
                              </Badge>
                            )}
                            {log.request_type === 'chat' && (
                              <Badge variant="secondary">{t('logs.chat')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.latency_ms} ms</TableCell>
                        <TableCell>{log.tokens_used}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Right: Log Detail */}
          <div className="w-[400px] bg-card rounded-xl border flex flex-col overflow-hidden">
            {selectedLog ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">{t('logs.requestDetails')}</h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-hide">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedLog.status === 'success' ? 'bg-violet-50 text-violet-700' : 'bg-destructive/10 text-destructive'}`}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{selectedLog.provider_name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{selectedLog.model}</Badge>
                          {selectedLog.request_type === 'health_check' && (
                            <Badge variant="secondary">{t('logs.healthCheck')}</Badge>
                          )}
                          {selectedLog.request_type === 'provider_disabled' && (
                            <Badge className="bg-destructive text-destructive-foreground border-0" variant="destructive">
                              {t('logs.providerDisabled')}
                            </Badge>
                          )}
                          {selectedLog.request_type === 'chat' && (
                            <Badge variant="secondary">{t('logs.chat')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedLog.status)}
                      <Badge variant="outline">{selectedLog.latency_ms} ms</Badge>
                      <Badge variant="outline">{selectedLog.tokens_used} tokens</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatDateTime(selectedLog.created_at, language)}</span>
                    </div>
                  </div>

                  {selectedLog.error_message && (
                    <div className="space-y-2 pt-3 border-t">
                      <h5 className="text-sm font-medium text-destructive">{t('logs.errorMessage')}</h5>
                      <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{selectedLog.error_message}</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-3 border-t">
                    <h5 className="text-sm font-medium mb-3">{t('logs.chatContent')}</h5>
                    <div className="space-y-3 max-h-[400px] overflow-auto scrollbar-hide">
                      {(() => {
                        const messages: { role: string; content: string }[] = []
                        if (selectedLog.request_content) {
                          const parts = selectedLog.request_content.split(/\n\n/)
                          for (const part of parts) {
                            const match = part.match(/^\[(user|assistant)\]:\s*(.*)$/s)
                            if (match) {
                              messages.push({ role: match[1], content: match[2].trim() })
                            }
                          }
                        }
                        if (selectedLog.response_content && !messages.some(m => m.role === 'assistant' && m.content === selectedLog.response_content)) {
                          messages.push({ role: 'assistant', content: selectedLog.response_content })
                        }

                        if (messages.length === 0) {
                          return <p className="text-sm text-muted-foreground">{t('logs.noChatContent')}</p>
                        }

                        return messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                              }`}>
                              <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? t('logs.user') : t('logs.assistant')}</div>
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>{t('logs.selectLogToView')}</p>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </PageShell>
  )
}
