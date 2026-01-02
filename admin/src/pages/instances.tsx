import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Provider, ProviderTypeConfig, ApiResponse, TestResult } from "@/components/instances/types";
import { ProviderList } from "@/components/instances/ProviderList";
import { ProviderDetail } from "@/components/instances/ProviderDetail";
import { AddProviderDialog } from "@/components/instances/AddProviderDialog";
import { EditProviderDialog } from "@/components/instances/EditProviderDialog";

export function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    apiKey: "",
    model: "",
    baseUrl: "",
    priority: "",
    endpoint: "",
  });
  const [saving, setSaving] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    providerType: "openai",
    apiKey: "",
    model: "",
    baseUrl: "",
    priority: "10",
    endpoint: "",
  });
  const [adding, setAdding] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    fetchProviders();
    fetchProviderTypes();
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setAddDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
    
    const selectId = searchParams.get("select");
    if (selectId && providers.length > 0) {
      const id = parseInt(selectId);
      const provider = providers.find((p) => p.id === id);
      if (provider) {
        setSelectedProvider(provider);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, providers]);

  const fetchProviderTypes = async () => {
    try {
      const result = await apiGet<ApiResponse<ProviderTypeConfig[]>>("/api/provider-types");
      if (result.success && result.data) {
        setProviderTypes(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch provider types:", e);
    }
  };

  const getProviderTypeConfig = (typeId: string): ProviderTypeConfig | undefined => {
    return providerTypes.find((t) => t.id === typeId);
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const result = await apiGet<ApiResponse<Provider[]>>("/api/instances");

      if (result.success) {
        const data = result.data || [];
        setProviders(data);
        if (data.length > 0 && !selectedProvider) {
          setSelectedProvider(data[0]);
        }
        setError(null);
      } else {
        setError(result.message || "Failed to fetch providers");
      }
    } catch (err) {
      setError("Network error: Failed to fetch providers");
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = async (id: number) => {
    try {
      const response = await fetch(`/api/instances/${id}/toggle`, { method: "POST" });
      const result = await response.json();

      if (result.success) {
        setProviders(providers.map((p) => (p.id === id ? result.data : p)));
        if (selectedProvider?.id === id) {
          setSelectedProvider(result.data);
        }
      } else {
        alert(result.message || "Failed to toggle provider");
      }
    } catch (err) {
      alert("Network error: Failed to toggle provider");
      console.error("Error toggling provider:", err);
    }
  };

  const deleteProvider = async (id: number) => {
    const provider = providers.find((p) => p.id === id);
    if (!provider) return;
    
    setDeletingProvider(provider);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingProvider) return;

    try {
      const response = await fetch(`/api/instances/${deletingProvider.id}`, { method: "DELETE" });
      const result = await response.json();

      if (result.success) {
        setProviders(providers.filter((p) => p.id !== deletingProvider.id));
        setSelectedProvider(null);
        setDeleteDialogOpen(false);
        setDeletingProvider(null);
      } else {
        alert(result.message || t('providers.saveFailed'));
      }
    } catch (err) {
      alert(t('providers.networkError'));
      console.error("Error deleting provider:", err);
    }
  };

  const openAddDialog = () => {
    const defaultType = providerTypes[0]?.id || "openai";
    const defaults = getProviderTypeConfig(defaultType);
    setAddForm({
      name: "",
      providerType: defaultType,
      apiKey: "",
      model: defaults?.default_model || "",
      baseUrl: defaults?.base_url || "",
      priority: "10",
      endpoint: "",
    });
    setAddDialogOpen(true);
  };

  const handleProviderTypeChange = (type: string) => {
    const defaults = getProviderTypeConfig(type);
    if (defaults) {
      setAddForm({
        ...addForm,
        providerType: type,
        model: defaults.default_model,
        baseUrl: defaults.base_url,
      });
    }
  };

  const submitAddProvider = async () => {
    if (!addForm.name.trim()) {
      alert(t('providers.pleaseEnterName'));
      return;
    }
    if (!addForm.apiKey.trim()) {
      alert(t('providers.pleaseEnterApiKey'));
      return;
    }
    setAdding(true);
    try {
      const payload: any = {
        name: addForm.name,
        provider_type: addForm.providerType,
        config: JSON.stringify({
          api_key: addForm.apiKey,
          model: addForm.model,
          base_url: addForm.baseUrl,
        }),
        enabled: true,
        priority: parseInt(addForm.priority) || 10,
      };
      
      if (addForm.providerType === 'volcengine' && addForm.endpoint) {
        payload.endpoint = addForm.endpoint;
      }
      
      const result = await apiPost<ApiResponse<Provider>>("/api/instances", payload);
      if (result.success && result.data) {
        setProviders([result.data, ...providers]);
        setSelectedProvider(result.data);
        setAddDialogOpen(false);
      } else {
        alert(result.message || t('providers.saveFailed'));
      }
    } catch (err) {
      alert(t('providers.networkError'));
      console.error("Error adding provider:", err);
    } finally {
      setAdding(false);
    }
  };

  const testProvider = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    const startTime = Date.now();
    const minLoadingTime = 800;
    try {
      const result = await apiPost<ApiResponse<null>>(`/api/instances/${id}/test`);
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
      }
      setTestResult({
        id,
        success: result.success,
        message: result.message || (result.success ? t('providers.connectionSuccess') : t('providers.connectionFailed')),
      });
    } catch {
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
      }
      setTestResult({ id, success: false, message: t('providers.networkError') });
    } finally {
      setTestingId(null);
    }
  };

  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider);
    const config = JSON.parse(provider.config || "{}");
    setEditForm({
      name: provider.name,
      apiKey: config.api_key || "",
      model: config.model || "",
      baseUrl: config.base_url || "",
      priority: provider.priority.toString(),
      endpoint: provider.endpoint || "",
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingProvider) return;
    setSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        config: JSON.stringify({
          api_key: editForm.apiKey,
          model: editForm.model,
          base_url: editForm.baseUrl,
        }),
        priority: parseInt(editForm.priority) || 10,
      };
      
      if (editingProvider.provider_type === 'volcengine' && editForm.endpoint) {
        payload.endpoint = editForm.endpoint;
      }
      
      const response = await fetch(`/api/instances/${editingProvider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setProviders(providers.map((p) => (p.id === editingProvider.id ? result.data : p)));
        setEditDialogOpen(false);
      } else {
        alert(result.message || t('providers.saveFailed'));
      }
    } catch {
      alert(t('providers.networkError'));
    } finally {
      setSaving(false);
    }
  };

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.provider_type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-destructive">{error}</div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
            <ProviderList
              providers={filteredProviders}
              selectedProvider={selectedProvider}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectProvider={setSelectedProvider}
              onAddProvider={openAddDialog}
              onToggleProvider={toggleProvider}
            />

            <ProviderDetail
              provider={selectedProvider}
              providerTypeConfig={selectedProvider ? getProviderTypeConfig(selectedProvider.provider_type) : undefined}
              onEdit={openEditDialog}
              onDelete={deleteProvider}
              onTest={testProvider}
              onNavigateToChat={(id) => navigate(`/chat?provider=${id}`)}
              testingId={testingId}
              testResult={testResult}
            />
          </div>
        )}
      </div>

      <AddProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        providerTypes={providerTypes}
        form={addForm}
        onFormChange={setAddForm}
        onProviderTypeChange={handleProviderTypeChange}
        onSubmit={submitAddProvider}
        adding={adding}
        getProviderTypeConfig={getProviderTypeConfig}
      />

      <EditProviderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        providerType={editingProvider?.provider_type}
        form={editForm}
        onFormChange={setEditForm}
        onSubmit={saveEdit}
        saving={saving}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('providers.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProvider && (
                <>
                  {t('providers.confirmDeleteDesc')} <strong>{deletingProvider.name}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}