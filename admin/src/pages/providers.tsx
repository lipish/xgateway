import { useState, useEffect } from "react"
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Search } from "lucide-react"

import type { ProviderType, ModelInfo } from "@/components/providers/types"
import { generateIdFromLabel } from "@/components/providers/utils"
import { ProviderList } from "@/components/providers/ProviderList"
import { ProviderDetail } from "@/components/providers/ProviderDetail"
import { ModelDialog } from "@/components/providers/ModelDialog"
import { AddProviderDialog } from "@/components/providers/AddProviderDialog"
import { EditProviderDialog } from "@/components/providers/EditProviderDialog"

export function ModelTypesPage() {
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingModel, setEditingModel] = useState<{ typeId: string; model: ModelInfo | null } | null>(null)
  const [modelForm, setModelForm] = useState<ModelInfo>({ id: "", name: "" })
  const [saving, setSaving] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [showEditProvider, setShowEditProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderType | null>(null)
  const [providerForm, setProviderForm] = useState({ id: "", label: "", base_url: "", default_model: "", driver_type: "openai_compatible", docs_url: "" })

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
        setProviderForm({ id: "", label: "", base_url: "", default_model: "", driver_type: "openai_compatible", docs_url: "" })
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch {
      alert(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const openEditProvider = (provider: ProviderType) => {
    setEditingProvider(provider)
    setProviderForm({
      id: provider.id,
      label: provider.label,
      base_url: provider.base_url,
      default_model: provider.default_model,
      driver_type: provider.driver_type,
      docs_url: provider.docs_url || ""
    })
    setShowEditProvider(true)
  }

  const editProvider = async () => {
    if (!editingProvider || !providerForm.label) {
      alert(t("modelTypes.pleaseEnterProviderInfo"))
      return
    }

    setSaving(true)
    try {
      const response = await apiPut<{ success: boolean; message?: string }>(`/api/provider-types/${editingProvider.id}`, {
        label: providerForm.label,
        base_url: providerForm.base_url,
        default_model: providerForm.default_model,
        driver_type: providerForm.driver_type,
        docs_url: providerForm.docs_url
      })
      if (response.success) {
        await fetchProviderTypes()
        setShowEditProvider(false)
        setEditingProvider(null)
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch {
      alert(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const deleteProvider = async (providerId: string) => {
    if (!confirm(t("modelTypes.confirmDelete"))) return

    try {
      const response = await apiDelete<{ success: boolean; message?: string }>(`/api/provider-types/${providerId}`)
      if (response.success) {
        await fetchProviderTypes()
        if (selectedType?.id === providerId) {
          setSelectedType(null)
        }
      } else {
        alert(response.message || t("common.saveFailed"))
      }
    } catch {
      alert(t("common.networkError"))
    }
  }

  const filteredProviderTypes = providerTypes.filter(pt =>
    pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
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
                <div
                  onClick={() => setShowAddProvider(true)}
                  className="h-8 w-8 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  title={t("modelTypes.addProvider")}
                >
                  <Plus className="h-5 w-5" />
                </div>
              </div>

              <ProviderList
                providers={filteredProviderTypes}
                selectedProvider={selectedType}
                onSelectProvider={setSelectedType}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border flex-1 flex flex-col overflow-hidden">
              {selectedType ? (
                <ProviderDetail
                  provider={selectedType}
                  onAddModel={openAddModel}
                  onEditModel={openEditModel}
                  onDeleteModel={deleteModel}
                  onEditProvider={openEditProvider}
                  onDeleteProvider={deleteProvider}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  {t("providers.selectProvider")}
                </div>
              )}
            </div>
          </div>
        )}

        <ModelDialog
          open={!!editingModel}
          onOpenChange={closeDialog}
          isEdit={!!editingModel?.model}
          modelForm={modelForm}
          onFormChange={setModelForm}
          onSave={saveModel}
          saving={saving}
        />

        <AddProviderDialog
          open={showAddProvider}
          onOpenChange={setShowAddProvider}
          providerForm={providerForm}
          onFormChange={setProviderForm}
          onLabelChange={handleLabelChange}
          onSave={addProvider}
          saving={saving}
        />

        <EditProviderDialog
          open={showEditProvider}
          onOpenChange={setShowEditProvider}
          providerForm={providerForm}
          onFormChange={setProviderForm}
          onSubmit={editProvider}
          saving={saving}
        />
      </div>
    </div>
  )
}