import { useState, useEffect } from "react"
import { apiGet, apiPut, apiPost } from "@/lib/api"
import { t } from "@/lib/i18n"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, Loader2, Box, Search, MoreVertical } from "lucide-react"

// Provider icon mapping
const getProviderIcon = (providerId: string): string | null => {
  const iconMap: Record<string, string> = {
    'aliyun': '/ali.svg',
    'volcengine': '/volcengine.svg',
    'moonshot': '/moonshot.svg',
    'deepseek': '/deepseek.png',
  }
  return iconMap[providerId] || null
}

interface ModelInfo {
  id: string
  name: string
  description?: string
  supports_tools?: boolean
  context_length?: number
  input_price?: number
  output_price?: number
}

interface ProviderType {
  id: string
  label: string
  base_url: string
  default_model: string
  models: ModelInfo[]
  enabled: boolean
  sort_order: number
  docs_url?: string
}

export function ModelTypesPage() {
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingModel, setEditingModel] = useState<{ typeId: string; model: ModelInfo | null } | null>(null)
  const [modelForm, setModelForm] = useState<ModelInfo>({ id: "", name: "" })
  const [saving, setSaving] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [providerForm, setProviderForm] = useState({ id: "", label: "", base_url: "", default_model: "", docs_url: "" })

  // 从服务商名称生成 ID（转小写，空格转下划线，移除特殊字符）
  const generateIdFromLabel = (label: string): string => {
    return label
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
  }

  // 处理名称变化，自动生成 ID
  const handleLabelChange = (label: string) => {
    const id = generateIdFromLabel(label)
    setProviderForm({ ...providerForm, label, id })
  }

  const fetchProviderTypes = async () => {
    try {
      setLoading(true)
      const response = await apiGet<{ success: boolean; data: ProviderType[] }>("/api/provider-types")
      if (response.success && response.data) {
        setProviderTypes(response.data)
        // 默认选中第一个
        if (response.data.length > 0 && !selectedType) {
          setSelectedType(response.data[0])
        }
      }
    } catch (err) {
      console.error("Failed to fetch provider types:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviderTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAddModel = (typeId: string) => {
    setEditingModel({ typeId, model: null })
    setModelForm({ id: "", name: "", description: "", supports_tools: false, context_length: 128000, input_price: undefined, output_price: undefined })
  }

  const openEditModel = (typeId: string, model: ModelInfo) => {
    setEditingModel({ typeId, model })
    setModelForm({ ...model })
  }

  const closeDialog = () => {
    setEditingModel(null)
    setModelForm({ id: "", name: "" })
  }

  const saveModel = async () => {
    if (!editingModel) return
    if (!modelForm.id || !modelForm.name) {
      alert(t("modelTypes.pleaseEnterModelInfo"))
      return
    }

    setSaving(true)
    try {
      const providerType = providerTypes.find(pt => pt.id === editingModel.typeId)
      if (!providerType) return

      const updatedModels = editingModel.model
        ? providerType.models.map(m => m.id === editingModel.model!.id ? modelForm : m)
        : [...providerType.models, modelForm]

      const response = await apiPut<{ success: boolean; message?: string }>(`/api/provider-types/${editingModel.typeId}`, { models: updatedModels })
      if (response.success) {
        await fetchProviderTypes()
        closeDialog()
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch {
      alert(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const deleteModel = async (typeId: string, modelId: string) => {
    if (!confirm(t("modelTypes.confirmDeleteModel"))) return

    const providerType = providerTypes.find(pt => pt.id === typeId)
    if (!providerType) return

    const updatedModels = providerType.models.filter(m => m.id !== modelId)
    const response = await apiPut<{ success: boolean }>(`/api/provider-types/${typeId}`, { models: updatedModels })
    if (response.success) {
      await fetchProviderTypes()
    }
  }

  const addProvider = async () => {
    if (!providerForm.id || !providerForm.label) {
      alert(t("modelTypes.pleaseEnterProviderInfo"))
      return
    }

    setSaving(true)
    try {
      const response = await apiPost<{ success: boolean; message?: string }>("/api/provider-types", {
        ...providerForm,
        models: [],
        enabled: true,
        sort_order: providerTypes.length + 1
      })
      if (response.success) {
        await fetchProviderTypes()
        setShowAddProvider(false)
        setProviderForm({ id: "", label: "", base_url: "", default_model: "", docs_url: "" })
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch {
      alert(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "-"
    return `¥${price}`
  }

  const filteredProviderTypes = providerTypes.filter(pt =>
    pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Master-Detail Layout */}
        {!loading && (
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Left: Provider Type List */}
            <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col w-[28%]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("providers.search")}
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground">
                  {t('providers.total')} {filteredProviderTypes.length} {t('providers.unit')}
                </span>
                <Button onClick={() => setShowAddProvider(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> {t("modelTypes.addProvider")}
                </Button>
              </div>

              <div className="flex-1 overflow-auto space-y-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {filteredProviderTypes.map(pt => (
                  <div
                    key={pt.id}
                    className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedType?.id === pt.id ? 'bg-muted' : 'bg-white'
                    }`}
                    onClick={() => setSelectedType(pt)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getProviderIcon(pt.id) ? (
                          <img src={getProviderIcon(pt.id)!} alt={pt.label} className="h-5 w-5 shrink-0 mt-0.5" />
                        ) : (
                          <Box className={`h-5 w-5 shrink-0 mt-0.5 ${selectedType?.id === pt.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{pt.label}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{pt.id}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">可用模型</div>
                        <div className="text-lg font-semibold mt-0.5">{pt.models.length}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Provider Type Details */}
            <div className="bg-white rounded-xl shadow-sm border flex-1 flex flex-col overflow-hidden">
              {selectedType ? (
                <>
                  {/* Header with title and actions */}
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold">{selectedType.label}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{selectedType.id}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openAddModel(selectedType.id)} title={t("modelTypes.addModel")}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: 实现编辑服务商功能
                          }}
                          title={t("providers.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(t("modelTypes.confirmDelete"))) {
                              // TODO: 实现删除服务商功能
                            }
                          }}
                          title={t("providers.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">默认 API 地址</div>
                        <div className="text-xs font-mono">{selectedType.base_url || '-'}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">默认模型</div>
                        <div className="text-xs">{selectedType.default_model || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Models List */}
                  <div className="flex-1 overflow-auto p-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <h3 className="text-base font-semibold mb-4">可用模型 ({selectedType.models.length})</h3>
                    {selectedType.models.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        {t("modelTypes.noModels")}
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="font-medium text-xs">模型 ID</TableHead>
                              <TableHead className="font-medium text-xs">模型名称</TableHead>
                              <TableHead className="font-medium text-xs text-center">
                                <div>{t('modelTypes.contextLength')}</div>
                              </TableHead>
                              <TableHead className="font-medium text-xs text-center">
                                <div>{t('modelTypes.inputPrice')}</div>
                                <div className="text-xs font-normal text-muted-foreground whitespace-nowrap">({t('modelTypes.priceUnit')})</div>
                              </TableHead>
                              <TableHead className="font-medium text-xs text-center">
                                <div>{t('modelTypes.outputPrice')}</div>
                                <div className="text-xs font-normal text-muted-foreground whitespace-nowrap">({t('modelTypes.priceUnit')})</div>
                              </TableHead>
                              <TableHead className="font-medium text-xs text-center">
                                <div>{t('modelTypes.supportsTools')}</div>
                              </TableHead>
                              <TableHead className="font-medium text-xs text-center w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedType.models.map(model => (
                              <TableRow key={model.id} className="hover:bg-muted/30">
                                <TableCell className="font-mono text-xs">{model.id}</TableCell>
                                <TableCell className="font-mono text-xs">{model.name}</TableCell>
                                <TableCell className="text-xs text-center">{model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "-"}</TableCell>
                                <TableCell className="text-xs text-center">{formatPrice(model.input_price)}</TableCell>
                                <TableCell className="text-xs text-center">{formatPrice(model.output_price)}</TableCell>
                                <TableCell className="text-center">
                                  {model.supports_tools ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">✓</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center">
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModel(selectedType.id, model)}>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          {t("providers.edit")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => deleteModel(selectedType.id, model.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {t("providers.delete")}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  {t("providers.selectProvider")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Model Dialog */}
        <Dialog open={!!editingModel} onOpenChange={() => closeDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingModel?.model ? t("modelTypes.editModel") : t("modelTypes.addModel")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("modelTypes.modelId")}</label>
                <Input
                  value={modelForm.id}
                  onChange={e => setModelForm({ ...modelForm, id: e.target.value })}
                  placeholder="gpt-4"
                  disabled={!!editingModel?.model}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.modelName")}</label>
                <Input
                  value={modelForm.name}
                  onChange={e => setModelForm({ ...modelForm, name: e.target.value })}
                  placeholder="GPT-4"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.description")}</label>
                <Input
                  value={modelForm.description || ""}
                  onChange={e => setModelForm({ ...modelForm, description: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.contextLength")}</label>
                  <Input
                    type="number"
                    value={modelForm.context_length || ""}
                    onChange={e => setModelForm({ ...modelForm, context_length: parseInt(e.target.value) || undefined })}
                    placeholder="128000"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={modelForm.supports_tools || false}
                    onCheckedChange={(checked: boolean) => setModelForm({ ...modelForm, supports_tools: checked })}
                  />
                  <label className="text-sm">{t("modelTypes.supportsTools")}</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.inputPrice")}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.input_price || ""}
                    onChange={e => setModelForm({ ...modelForm, input_price: parseFloat(e.target.value) || undefined })}
                    placeholder="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.outputPrice")}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.output_price || ""}
                    onChange={e => setModelForm({ ...modelForm, output_price: parseFloat(e.target.value) || undefined })}
                    placeholder="0.03"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
              <Button onClick={saveModel} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Provider Dialog */}
        <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("modelTypes.addProvider")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("modelTypes.providerName")}</label>
                <Input
                  value={providerForm.label}
                  onChange={e => handleLabelChange(e.target.value)}
                  placeholder="OpenAI"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.baseUrl")}</label>
                <Input
                  value={providerForm.base_url}
                  onChange={e => setProviderForm({ ...providerForm, base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.defaultModel")}</label>
                <Input
                  value={providerForm.default_model}
                  onChange={e => setProviderForm({ ...providerForm, default_model: e.target.value })}
                  placeholder="gpt-4"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.docsUrl")}</label>
                <Input
                  value={providerForm.docs_url}
                  onChange={e => setProviderForm({ ...providerForm, docs_url: e.target.value })}
                  placeholder="https://platform.openai.com/docs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProvider(false)}>{t("common.cancel")}</Button>
              <Button onClick={addProvider} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}