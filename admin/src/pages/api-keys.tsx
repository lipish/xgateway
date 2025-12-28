import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { useI18n, t } from "@/lib/i18n"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Copy, RefreshCw } from "lucide-react"

interface ApiKey {
  id: number
  name: string
  key_prefix: string
  created_at: string
  last_used: string | null
  enabled: boolean
  rate_limit: number
}

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/api-keys')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setApiKeys(data.data || [])
        }
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err)
      // 模拟数据
      setApiKeys([
        { id: 1, name: "Production Key", key_prefix: "llm_prod_****", created_at: new Date().toISOString(), last_used: new Date().toISOString(), enabled: true, rate_limit: 1000 },
        { id: 2, name: "Development Key", key_prefix: "llm_dev_****", created_at: new Date(Date.now() - 86400000).toISOString(), last_used: null, enabled: true, rate_limit: 100 },
      ])
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    const name = prompt('请输入 API Key 名称：')
    if (!name) return
    const rateLimit = prompt('请输入速率限制 (每分钟请求数)：', '100')
    
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rate_limit: parseInt(rateLimit || '100') })
      })
      const data = await response.json()
      if (data.success) {
        alert(`API Key 创建成功!\n\n请保存您的密钥（仅显示一次）:\n${data.data.full_key}`)
        fetchApiKeys()
      } else {
        alert(data.message || '创建失败')
      }
    } catch (err) {
      alert('网络错误')
    }
  }

  const deleteApiKey = async (id: number) => {
    if (!confirm('确定要删除这个 API Key 吗？此操作不可撤销。')) return
    try {
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setApiKeys(apiKeys.filter(k => k.id !== id))
      } else {
        alert(data.message || '删除失败')
      }
    } catch (err) {
      alert('网络错误')
    }
  }

  const toggleApiKey = async (id: number) => {
    try {
      const response = await fetch(`/api/api-keys/${id}/toggle`, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setApiKeys(apiKeys.map(k => k.id === id ? { ...k, enabled: !k.enabled } : k))
      }
    } catch (err) {
      alert('网络错误')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  return (
    <div className="flex flex-col">
      <Header title={t('apiKeys.title')} description={t('apiKeys.description')} />
      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <Button onClick={createApiKey}>
            <Plus className="mr-2 h-4 w-4" /> {t('apiKeys.create')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchApiKeys}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t('apiKeys.refresh')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('apiKeys.list')}</CardTitle>
            <CardDescription>{t('apiKeys.listDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{t('common.loading')}</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('apiKeys.noKeys')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('apiKeys.name')}</TableHead>
                    <TableHead>{t('apiKeys.key')}</TableHead>
                    <TableHead>{t('apiKeys.status')}</TableHead>
                    <TableHead>{t('apiKeys.rateLimit')}</TableHead>
                    <TableHead>{t('apiKeys.createdAt')}</TableHead>
                    <TableHead>{t('apiKeys.lastUsed')}</TableHead>
                    <TableHead>{t('apiKeys.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">{key.key_prefix}</code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.key_prefix)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.enabled ? "success" : "destructive"} className="cursor-pointer" onClick={() => toggleApiKey(key.id)}>
                          {key.enabled ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>{key.rate_limit}/min</TableCell>
                      <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{key.last_used ? new Date(key.last_used).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteApiKey(key.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

