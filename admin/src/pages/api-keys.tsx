import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Copy, Key, Shield, Globe, Zap } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select } from "@/components/ui/select"

interface ApiKey {
  id: number
  name: string
  key_hash: string
  scope: string
  provider_id: number | null
  provider_ids: number[] | null
  qps_limit: number
  concurrency_limit: number
  status: string
  expires_at: string | null
  created_at: string
}

interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
}

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    scope: "global",
    provider_ids: [] as number[],
    qps_limit: 10,
    concurrency_limit: 5
  })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    fetchApiKeys()
    fetchProviders()
  }, [])

  useEffect(() => {
    if (!selectedApiKeyId && apiKeys.length > 0) {
      setSelectedApiKeyId(apiKeys[0].id)
    }
  }, [apiKeys, selectedApiKeyId])

  const selectedApiKey = apiKeys.find((k) => k.id === selectedApiKeyId) || null

  const getBoundProviders = (key: ApiKey): Provider[] => {
    const ids = [key.provider_id, ...(key.provider_ids || [])].filter((v): v is number => typeof v === 'number')
    if (ids.length === 0) return []
    return ids
      .map((id) => providers.find((p) => p.id === id))
      .filter((p): p is Provider => !!p)
  }

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/api-keys')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('API Keys Response:', data.data)
          setApiKeys(data.data || [])
        }
      }
    } catch {
      // Failed silently
    } finally {
      setLoading(false)
    }
  }

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/instances')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProviders(data.data || [])
        }
      }
    } catch {
      // Failed silently
    }
  }

  const handleCreate = async () => {
    try {
      setError(null)
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData)
      })
      const data = await response.json()
      if (data.success) {
        setCreatedKey(data.data.full_key)
        fetchApiKeys()
      } else {
        setError(data.message || t('apiKeys.createFailed'))
      }
    } catch {
      setError(t('common.networkError'))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const toggleApiKeyStatus = async (id: number) => {
    try {
      const response = await fetch(`/api/api-keys/${id}/toggle`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchApiKeys()
      }
    } catch (err) {
      console.error('Failed to toggle API key status:', err)
    }
  }

  const handleDelete = async () => {
    if (!apiKeyToDelete) return
    try {
      const response = await fetch(`/api/api-keys/${apiKeyToDelete}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchApiKeys()
      }
    } catch (err) {
      console.error('Failed to delete API key:', err)
    } finally {
      setApiKeyToDelete(null)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex items-center justify-end mb-3">
          <Button
            size="sm"
            onClick={() => {
              setCreatedKey(null)
              setNewKeyData({
                name: "",
                scope: "global",
                provider_ids: [],
                qps_limit: 10,
                concurrency_limit: 5
              })
              setError(null)
              setDialogKey(prev => prev + 1)
              setShowCreateDialog(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('apiKeys.create')}
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">

        <Dialog key={dialogKey} open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setCreatedKey(null)
            setNewKeyData({
              name: "",
              scope: "global",
              provider_ids: [],
              qps_limit: 10,
              concurrency_limit: 5
            })
            setError(null)
          }
        }}>
          <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
            <div className="p-6 space-y-5">
              <DialogHeader className="space-y-1.5 mb-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('apiKeys.create')}
                </DialogTitle>
                <DialogDescription className="text-purple-600 font-medium pb-2">
                  {createdKey ? t('apiKeys.saveKeyHint') : t('apiKeys.listDesc')}
                </DialogDescription>
              </DialogHeader>

              {createdKey ? (
                <div className="space-y-4 py-2">
                  <div className="rounded-md bg-muted p-3 flex items-center gap-2 group border">
                    <code className="text-sm font-mono break-all flex-1">{createdKey}</code>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyToClipboard(createdKey)}>
                      {copySuccess ? <span className="text-[10px] text-primary">Copied!</span> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                    <p className="text-xs text-destructive font-medium flex items-center gap-2">
                      <Shield className="h-3 w-3" /> {t('apiKeys.saveKeyHint')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">{t('apiKeys.name')} <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      value={newKeyData.name}
                      onChange={e => setNewKeyData({ ...newKeyData, name: e.target.value })}
                      placeholder="e.g. My App"
                      className="h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('apiKeys.qps')}</Label>
                      <Input
                        type="number"
                        value={newKeyData.qps_limit}
                        onChange={e => setNewKeyData({ ...newKeyData, qps_limit: parseFloat(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('apiKeys.concurrency')}</Label>
                      <Input
                        type="number"
                        value={newKeyData.concurrency_limit}
                        onChange={e => setNewKeyData({ ...newKeyData, concurrency_limit: parseInt(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('apiKeys.scope')}</Label>
                    <Select
                      value={newKeyData.scope}
                      onChange={(value) => setNewKeyData({ ...newKeyData, scope: value, provider_ids: value === 'global' ? [] : newKeyData.provider_ids })}
                      options={[
                        { value: 'global', label: t('apiKeys.global') },
                        { value: 'instance', label: t('apiKeys.instance') }
                      ]}
                      triggerClassName="h-10"
                    />
                  </div>

                  {newKeyData.scope === 'instance' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('apiKeys.selectInstance')}</Label>
                      <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-background">
                        {providers.map(provider => (
                          <label key={provider.id} className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={newKeyData.provider_ids.includes(provider.id)}
                              onChange={(e) => {
                                const newProviderIds = e.target.checked
                                  ? [...newKeyData.provider_ids, provider.id]
                                  : newKeyData.provider_ids.filter(id => id !== provider.id)
                                setNewKeyData({ ...newKeyData, provider_ids: newProviderIds })
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium">{provider.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="text-sm text-destructive mt-1 font-medium">{error}</p>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 mt-2">
                {createdKey ? (
                  <Button onClick={() => {
                    setCreatedKey(null)
                    setNewKeyData({
                      name: "",
                      scope: "global",
                      provider_ids: [],
                      qps_limit: 10,
                      concurrency_limit: 5
                    })
                    setError(null)
                    setShowCreateDialog(false)
                  }} className="h-10 px-10">{t('common.confirm')}</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="h-10 px-10">
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleCreate}
                      className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                    >
                      {t('common.save')}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>


          <div className="flex gap-6 flex-1 min-h-0">
            <Card className="w-[520px] shrink-0 h-full flex flex-col">
              <CardContent className="flex-1 h-full overflow-y-auto p-6">
                {loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-medium mb-2">{t('apiKeys.noKeys')}</p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('apiKeys.name')}</TableHead>
                        <TableHead>{t('apiKeys.scope')}</TableHead>
                        <TableHead>{t('apiKeys.provider')}</TableHead>
                        <TableHead>{t('apiKeys.created')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => {
                        const boundProviders = getBoundProviders(key)
                        const providerSummary = key.scope === 'global'
                          ? t('apiKeys.global')
                          : boundProviders.length > 0
                            ? `${boundProviders.length}`
                            : '0'

                        return (
                          <TableRow
                            key={key.id}
                            className={cn(
                              'cursor-pointer',
                              selectedApiKeyId === key.id && 'bg-muted/60'
                            )}
                            onClick={() => setSelectedApiKeyId(key.id)}
                          >
                            <TableCell className="font-medium">{key.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{key.scope}</Badge>
                            </TableCell>
                            <TableCell>
                              {key.scope === 'global' ? (
                                <Badge variant="secondary">{t('apiKeys.global')}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">{providerSummary}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(key.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 h-full flex flex-col min-w-0">
              <CardContent className="flex-1 h-full overflow-y-auto p-6">
                {!selectedApiKey ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span>{t('apiKeys.list')}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">{selectedApiKey.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="mr-2">{t('apiKeys.scope')}:</span>
                          <Badge variant="secondary">{selectedApiKey.scope}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={selectedApiKey.status === 'active' ? 'default' : 'secondary'}>
                          {selectedApiKey.status === 'active' ? t('apiKeys.enabled') : t('apiKeys.disabled')}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKeyStatus(selectedApiKey.id)}
                        >
                          {selectedApiKey.status === 'active' ? t('apiKeys.disable') : t('apiKeys.enable')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setApiKeyToDelete(selectedApiKey.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md border p-4">
                        <div className="text-sm text-muted-foreground">{t('apiKeys.usage')}</div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>{t('apiKeys.qps')}:</span>
                            <span className="font-medium">{selectedApiKey.qps_limit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('apiKeys.concurrency')}:</span>
                            <span className="font-medium">{selectedApiKey.concurrency_limit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border p-4">
                        <div className="text-sm text-muted-foreground">{t('apiKeys.created')}</div>
                        <div className="mt-2 text-sm">
                          {new Date(selectedApiKey.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border p-4">
                      <div className="text-sm text-muted-foreground">{t('apiKeys.provider')}</div>
                      <div className="mt-2">
                        {selectedApiKey.scope === 'global' ? (
                          <Badge variant="secondary">{t('apiKeys.global')}</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {getBoundProviders(selectedApiKey).length === 0 ? (
                              <span className="text-sm text-muted-foreground">-</span>
                            ) : (
                              getBoundProviders(selectedApiKey).map((p) => (
                                <Badge key={p.id} variant="secondary">{p.name}</Badge>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        <AlertDialog open={!!apiKeyToDelete} onOpenChange={(open) => !open && setApiKeyToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('apiKeys.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('apiKeys.deleteWarning') || 'This action cannot be undone. This will permanently revoke the API key.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
    </div>
  )
}