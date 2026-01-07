import { useState, useEffect } from "react"
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Search, ArrowUpDown } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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
  const [sortBy, setSortBy] = useState<"name" | "models">("name")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<{ typeId: string; model: ModelInfo | null } | null>(null)
  const [modelForm, setModelForm] = useState<ModelInfo>({ id: "", name: "" })
  const [saving, setSaving] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [showEditProvider, setShowEditProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderType | null>(null)
  const [providerForm, setProviderForm] = useState({ id: "", label: "", base_url: "", driver_type: "openai_compatible", docs_url: "" })
  const [error, setError] = useState<string | null>(null)
  const [modelToDelete, setModelToDelete] = useState<{ typeId: string; modelId: string } | null>(null)
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null)

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
      setError(t("modelTypes.pleaseEnterModelInfo"))
      setTimeout(() => setError(null), 3000)
      return
    }

    setSaving(true)
    setError(null)
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
        setError(response.message || t("common.saveFailed"))
      }
    } catch {
      setError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteModel = async () => {
    if (!modelToDelete) return

    const { typeId, modelId } = modelToDelete
    const providerType = providerTypes.find(pt => pt.id === typeId)
    if (!providerType) return

    const updatedModels = providerType.models.filter(m => m.id !== modelId)
    const response = await apiPut<{ success: boolean }>(`/api/provider-types/${typeId}`, { models: updatedModels })
    if (response.success) {
      await fetchProviderTypes()
    }
    setModelToDelete(null)
  }

  const addProvider = async () => {
    if (!providerForm.id || !providerForm.label) {
      setError(t("modelTypes.pleaseEnterProviderInfo"))
      setTimeout(() => setError(null), 3000)
      return
    }

    setSaving(true)
    setError(null)
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
        setProviderForm({ id: "", label: "", base_url: "", driver_type: "openai_compatible", docs_url: "" })
      } else {
        setError(response.message || t("common.saveFailed"))
      }
    } catch {
      setError(t("common.networkError"))
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
      driver_type: provider.driver_type,
      docs_url: provider.docs_url || ""
    })
    setShowEditProvider(true)
  }

  const editProvider = async () => {
    if (!editingProvider || !providerForm.label) {
      setError(t("modelTypes.pleaseEnterProviderInfo"))
      setTimeout(() => setError(null), 3000)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await apiPut<{ success: boolean; message?: string }>(`/api/provider-types/${editingProvider.id}`, {
        label: providerForm.label,
        base_url: providerForm.base_url,
        driver_type: providerForm.driver_type,
        docs_url: providerForm.docs_url
      })
      if (response.success) {
        await fetchProviderTypes()
        setShowEditProvider(false)
        setEditingProvider(null)
      } else {
        setError(response.message || t("common.saveFailed"))
      }
    } catch {
      setError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProvider = async () => {
    if (!providerToDelete) return

    try {
      const response = await apiDelete<{ success: boolean; message?: string }>(`/api/provider-types/${providerToDelete}`)
      if (response.success) {
        await fetchProviderTypes()
        if (selectedType?.id === providerToDelete) {
          setSelectedType(null)
        }
      } else {
        setError(response.message || t("common.saveFailed"))
      }
    } catch {
      setError(t("common.networkError"))
    } finally {
      setProviderToDelete(null)
    }
  }

  const filteredProviderTypes = providerTypes.filter(pt =>
    pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.id.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === "name") {
      return a.label.localeCompare(b.label)
    } else {
      return b.models.length - a.models.length
    }
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <PageHeader
        title={t('providers.title')}
        subtitle={t('providers.description')}
        action={
          <Button size="sm" onClick={() => setShowAddProvider(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            {t('providers.addProvider')}
          </Button>
        }
      />
      <div className="flex-1 max-w-[1400px] mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/5 text-destructive border border-destructive/20 flex items-center justify-between">
            <span className="text-sm font-medium">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>×</Button>
          </div>
        )}
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
                <div className="relative">
                  <ArrowUpDown 
                    className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  />
                  {sortDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-40 bg-popover border rounded-lg shadow-lg z-50">
                        <div className="p-1">
                          <div
                            className={`px-3 py-2 text-sm cursor-pointer rounded hover:bg-accent ${sortBy === "name" ? "bg-accent" : ""}`}
                            onClick={() => {
                              setSortBy("name")
                              setSortDropdownOpen(false)
                            }}
                          >
                            Sort by Name
                          </div>
                          <div
                            className={`px-3 py-2 text-sm cursor-pointer rounded hover:bg-accent ${sortBy === "models" ? "bg-accent" : ""}`}
                            onClick={() => {
                              setSortBy("models")
                              setSortDropdownOpen(false)
                            }}
                          >
                            Sort by Models
                          </div>
                        </div>
                      </div>
                    </>
                  )}
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
                  onDeleteModel={(typeId, modelId) => setModelToDelete({ typeId, modelId })}
                  onEditProvider={openEditProvider}
                  onDeleteProvider={setProviderToDelete}
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

        <AlertDialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('modelTypes.confirmDeleteModel')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('modelTypes.deleteModelWarning') || 'This action cannot be undone. This will permanently delete the model definition.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteModel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('modelTypes.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('modelTypes.deleteProviderWarning') || 'This action cannot be undone. This will permanently delete the provider and all its models.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProvider} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}