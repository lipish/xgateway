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
import { Plus, Pencil, Trash2, Loader2, Box, ChevronRight, ChevronDown } from "lucide-react"

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
  const [expandedType, setExpandedType] = useState<string | null>(null)
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
      }
    } catch (err) {
      console.error("Failed to fetch provider types:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (typeId: string) => {
    setExpandedType(expandedType === typeId ? null : typeId)
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
    setSaving(true)
    try {
      const providerType = providerTypes.find(pt => pt.id === editingModel.typeId)
      if (!providerType) return

      let newModels: ModelInfo[]
      if (editingModel.model) {
        newModels = providerType.models.map(m => m.id === editingModel.model!.id ? modelForm : m)
      } else {
        newModels = [...providerType.models, modelForm]
      }

      const response = await apiPut<{ success: boolean }>(`/api/provider-types/${editingModel.typeId}`, { models: newModels })
      if (response.success) {
        await fetchProviderTypes()
        closeDialog()
      }
    } catch (err) {
      console.error("Failed to save model:", err)
    } finally {
      setSaving(false)
    }
  }

  const deleteModel = async (typeId: string, modelId: string) => {
    if (!confirm(t("modelTypes.confirmDeleteModel"))) return
    const providerType = providerTypes.find(pt => pt.id === typeId)
    if (!providerType) return

    const newModels = providerType.models.filter(m => m.id !== modelId)
    try {
      const response = await apiPut<{ success: boolean }>(`/api/provider-types/${typeId}`, { models: newModels })
      if (response.success) {
        await fetchProviderTypes()
      }
    } catch (err) {
      console.error("Failed to delete model:", err)
    }
  }

  const saveProvider = async () => {
    setSaving(true)
    try {
      const response = await apiPost<{ success: boolean }>("/api/provider-types", {
        ...providerForm,
        models: [],
        enabled: true,
        sort_order: providerTypes.length
      })
      if (response.success) {
        await fetchProviderTypes()
        setShowAddProvider(false)
        setProviderForm({ id: "", label: "", base_url: "", default_model: "", docs_url: "" })
      }
    } catch (err) {
      console.error("Failed to create provider:", err)
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "-"
    return `¥${price}`
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("modelTypes.allTypes")}</h2>
          <Button onClick={() => setShowAddProvider(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("modelTypes.addProvider")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {providerTypes.map(pt => (
              <div key={pt.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(pt.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedType === pt.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <Box className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{pt.label}</h3>
                      <p className="text-sm text-muted-foreground">{pt.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{pt.models.length} {t("modelTypes.models")}</Badge>
                    <span className="text-sm text-muted-foreground truncate max-w-[300px]">{pt.base_url}</span>
                  </div>
                </div>

                {expandedType === pt.id && (
                  <div className="border-t p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">{t("modelTypes.models")}</h4>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); openAddModel(pt.id); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("modelTypes.addModel")}
                      </Button>
                    </div>
                    {pt.models.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t("modelTypes.noModels")}</p>
                    ) : (
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
                          {pt.models.map(model => (
                            <TableRow key={model.id}>
                              <TableCell className="font-mono text-sm">{model.id}</TableCell>
                              <TableCell>{model.name}</TableCell>
                              <TableCell>{model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "-"}</TableCell>
                              <TableCell>{formatPrice(model.input_price)}</TableCell>
                              <TableCell>{formatPrice(model.output_price)}</TableCell>
                              <TableCell>{model.supports_tools ? "✓" : "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openEditModel(pt.id, model)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => deleteModel(pt.id, model.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Model Dialog */}
        <Dialog open={!!editingModel} onOpenChange={() => closeDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingModel?.model ? t("modelTypes.editModel") : t("modelTypes.addModel")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.modelId")}</label>
                  <Input
                    value={modelForm.id}
                    onChange={(e) => setModelForm({ ...modelForm, id: e.target.value })}
                    disabled={!!editingModel?.model}
                    placeholder="e.g., gpt-4"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.modelName")}</label>
                  <Input
                    value={modelForm.name}
                    onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                    placeholder="e.g., GPT-4"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("modelTypes.modelDescription")}</label>
                <Input
                  value={modelForm.description || ""}
                  onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                  placeholder="Model description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.contextLength")}</label>
                  <Input
                    type="number"
                    value={modelForm.context_length || ""}
                    onChange={(e) => setModelForm({ ...modelForm, context_length: parseInt(e.target.value) || undefined })}
                    placeholder="128000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.inputPrice")}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.input_price ?? ""}
                    onChange={(e) => setModelForm({ ...modelForm, input_price: parseFloat(e.target.value) || undefined })}
                    placeholder="¥/1M tokens"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("modelTypes.outputPrice")}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.output_price ?? ""}
                    onChange={(e) => setModelForm({ ...modelForm, output_price: parseFloat(e.target.value) || undefined })}
                    placeholder="¥/1M tokens"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={modelForm.supports_tools || false}
                  onCheckedChange={(checked) => setModelForm({ ...modelForm, supports_tools: checked })}
                />
                <label className="text-sm font-medium">{t("modelTypes.supportsTools")}</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
              <Button onClick={saveModel} disabled={saving || !modelForm.id || !modelForm.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("common.save")}
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
            <div className="space-y-4 py-4">
              {/* 服务商名称（必填）- 自动生成 ID */}
              <div>
                <label className="text-sm font-medium">{t("modelTypes.providerName")} <span className="text-destructive">*</span></label>
                <Input
                  value={providerForm.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g., Moonshot"
                />
              </div>
              {/* 文档地址 */}
              <div>
                <label className="text-sm font-medium">{t("modelTypes.docsUrl")}</label>
                <Input
                  value={providerForm.docs_url}
                  onChange={(e) => setProviderForm({ ...providerForm, docs_url: e.target.value })}
                  placeholder="https://platform.moonshot.cn/docs/overview"
                />
              </div>
              {/* API 地址（可选） */}
              <div>
                <label className="text-sm font-medium">{t("modelTypes.baseUrl")}</label>
                <Input
                  value={providerForm.base_url}
                  onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                  placeholder="https://api.moonshot.cn/v1"
                />
              </div>
              {/* 默认模型（可选） */}
              <div>
                <label className="text-sm font-medium">{t("modelTypes.defaultModel")}</label>
                <Input
                  value={providerForm.default_model}
                  onChange={(e) => setProviderForm({ ...providerForm, default_model: e.target.value })}
                  placeholder="e.g., moonshot-v1-8k"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProvider(false)}>{t("common.cancel")}</Button>
              <Button onClick={saveProvider} disabled={saving || !providerForm.label.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
