import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { t } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Search, Download, Clock, Server } from "lucide-react"

interface RequestLog {
  id: number
  created_at: string
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
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/logs?limit=100') as any
      if (data.success) {
        const logsData = data.data || []
        setLogs(logsData)
        // Default select the first log
        if (logsData.length > 0 && !selectedLog) {
          setSelectedLog(logsData[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-primary/10 text-primary border-0" variant="outline">{t('common.success')}</Badge>
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
    a.click()
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <div className="flex-1 max-w-[1400px] mx-auto w-full overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('logs.search')} className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                        className={`cursor-pointer hover:bg-muted/50 ${selectedLog?.id === log.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-sm whitespace-nowrap pl-6">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>{log.provider_name}</TableCell>
                        <TableCell><Badge variant="outline">{log.model}</Badge></TableCell>
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
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedLog.status === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{selectedLog.provider_name}</h4>
                        <Badge variant="outline">{selectedLog.model}</Badge>
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
                      <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
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
      </div>
    </div>
  )
}