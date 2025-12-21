import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Search, Download, Clock, Server } from "lucide-react"

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
      const response = await fetch('/api/logs?limit=100')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLogs(data.data || [])
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
      case 'success': return <Badge variant="success">成功</Badge>
      case 'error': return <Badge variant="destructive">错误</Badge>
      case 'timeout': return <Badge variant="secondary">超时</Badge>
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
    a.download = `llm-link-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="请求日志" description="查看 API 请求历史记录" />
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索 Provider 或模型..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="success">成功</option>
              <option value="error">错误</option>
              <option value="timeout">超时</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="mr-2 h-4 w-4" /> 刷新
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="mr-2 h-4 w-4" /> 导出
            </Button>
          </div>
        </div>

        <div className="flex gap-6 h-[calc(100%-60px)]">
          {/* Left: Log List */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">请求记录</h3>
              <p className="text-sm text-muted-foreground">共 {filteredLogs.length} 条记录</p>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-center py-4">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>模型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>延迟</TableHead>
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
                        <TableCell className="text-sm whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
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
          <div className="w-[400px] bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
            {selectedLog ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">请求详情</h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedLog.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
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
                      <h5 className="text-sm font-medium text-red-500">错误信息</h5>
                      <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{selectedLog.error_message}</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-3 border-t">
                    <h5 className="text-sm font-medium mb-3">对话内容</h5>
                    <div className="space-y-3 max-h-[400px] overflow-auto">
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
                          return <p className="text-sm text-muted-foreground">无对话内容</p>
                        }

                        return messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? '用户' : '助手'}</div>
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
                <p>选择一条日志查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

