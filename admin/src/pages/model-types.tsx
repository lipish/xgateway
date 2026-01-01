import { useState, useEffect } from "react"
import { apiGet, apiPut, apiPost } from "@/lib/api"
import { t } from "@/lib/i18n"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Loader2, Box, Search } from "lucide-react"

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

  useEffect(() => {
    fetchProviderTypes()
  }, [])

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

      const response = await apiPut(`/api/provider-types/${editingModel.typeId}`, { models: updatedModels })
      if (response.success) {
        await fetchProviderTypes()
        closeDialog()
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch (err) {
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
    const response = await apiPut(`/api/provider-types/${typeId}`, { models: updatedModels })
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
      const response = await apiPost("/api/provider-types", {
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
    } catch (err) {
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
            <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col w-[35%]">
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
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedType?.id === pt.id ? 'bg-muted border-primary' : 'bg-white'
                    }`}
                    onClick={() => setSelectedType(pt)}
                  >
                    <div className="flex items-start gap-3">
                      <Box className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{pt.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{pt.id}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {pt.models.length} {t("modelTypes.models")}
                          </Badge>
                          {pt.enabled && (
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">
                              {t('providers.enabled')}
                            </Badge>
                          )}
                        </div>
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
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedType.label}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedType.id}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => openAddModel(selectedType.id)}>
                        <Plus className="h-4 w-4 mr-1" /> {t("modelTypes.addModel")}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-xs text-muted-foreground">{t("modelTypes.baseUrl")}</div>
                        <div className="text-sm font-mono truncate">{selectedType.base_url || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("modelTypes.defaultModel")}</div>
                        <div className="text-sm truncate">{selectedType.default_model || '-'}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-auto p-6">
                    <h3 className="font-semibold mb-3">{t("modelTypes.models")} ({selectedType.models.length})</h3>
                    {selectedType.models.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("modelTypes.noModels")}
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("modelTypes.modelId")}</TableHead>
                              <TableHead>{t("modelTypes.modelName")}</TableHead>
                              <TableHead>{t("modelTypes.contextLength")}</TableHead>
                              <TableHead>{t("modelTypes.inputPrice")}</TableHead>
                              <TableHead>{t("modelTypes.outputPrice")}</TableHead>
                              <TableHead>{t("modelTypes.supportsTools")}</TableHead>
                              <TableHead className="w-[100px]">{t("providers.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedType.models.map(model => (
                              <TableRow key={model.id}>
                                <TableCell className="font-mono text-sm">{model.id}</TableCell>
                                <TableCell>{model.name}</TableCell>
                                <TableCell>{model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "-"}</TableCell>
                                <TableCell>{formatPrice(model.input_price)}</TableCell>
                                <TableCell>{formatPrice(model.output_price)}</TableCell>
                                <TableCell>{model.supports_tools ? "✓" : "-"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditModel(selectedType.id, model)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteModel(selectedType.id, model.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
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
                    onCheckedChange={checked => setModelForm({ ...modelForm, supports_tools: checked })}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {t("modelTypes.providerId")}: {providerForm.id || t("modelTypes.autoGenerated")}
                </p>
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