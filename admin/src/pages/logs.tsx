import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Search, Download } from "lucide-react"

interface RequestLog {
  id: number
  timestamp: string
  provider_id: number
  provider_name: string
  model: string
  status: "success" | "error" | "timeout"
  latency_ms: number
  tokens_used: number
  error_message?: string
}

export function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

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
      // 模拟数据用于演示
      setLogs([
        { id: 1, timestamp: new Date().toISOString(), provider_id: 1, provider_name: "Aliyun-Qwen", model: "qwen-turbo", status: "success", latency_ms: 456, tokens_used: 150 },
        { id: 2, timestamp: new Date(Date.now() - 60000).toISOString(), provider_id: 2, provider_name: "Zhipu-GLM", model: "glm-4", status: "success", latency_ms: 551, tokens_used: 200 },
        { id: 3, timestamp: new Date(Date.now() - 120000).toISOString(), provider_id: 3, provider_name: "Minimax", model: "abab6.5s-chat", status: "error", latency_ms: 5000, tokens_used: 0, error_message: "Timeout" },
      ])
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
        log.id, log.timestamp, log.provider_name, log.model, log.status, log.latency_ms, log.tokens_used, log.error_message || ''
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
    <div className="flex flex-col">
      <Header title="请求日志" description="查看 API 请求历史记录" />
      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
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

        <Card>
          <CardHeader>
            <CardTitle>请求记录</CardTitle>
            <CardDescription>共 {filteredLogs.length} 条记录</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.provider_name}</TableCell>
                      <TableCell><Badge variant="outline">{log.model}</Badge></TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.latency_ms} ms</TableCell>
                      <TableCell>{log.tokens_used}</TableCell>
                      <TableCell className="text-red-500 text-sm">{log.error_message || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

