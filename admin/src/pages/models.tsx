import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2, Plus } from "lucide-react";
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
import { useAuth } from "@/lib/auth";

import type { Provider, ProviderTypeConfig, ApiResponse, TestResult } from "@/components/instances/types";
import { ProviderList } from "@/components/instances/ProviderList";
import { ProviderDetail } from "@/components/instances/ProviderDetail";
import { AddProviderDialog } from "@/components/instances/AddProviderDialog";
import { EditProviderDialog } from "@/components/instances/EditProviderDialog";

export function ProvidersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_id === 'admin';
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
    secretId: "",
    secretKey: "",
    inputPrice: "",
    outputPrice: "",
    quotaLimit: "",
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
    secretId: "",
    secretKey: "",
    inputPrice: "",
    outputPrice: "",
    quotaLimit: "",
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

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
      const endpoint = isAdmin ? "/api/instances" : `/api/users/${user?.id}/instances`;
      const result = await apiGet<ApiResponse<Provider[]>>(endpoint);

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
        setGlobalError(result.message || "Failed to toggle provider");
        setErrorDialogOpen(true);
      }
    } catch (err) {
      setGlobalError("Network error: Failed to toggle provider");
      setErrorDialogOpen(true);
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
        setDeleteDialogOpen(false);
        setGlobalError(result.message || t('providers.saveFailed'));
        setErrorDialogOpen(true);
      }
    } catch (err) {
      setDeleteDialogOpen(false);
      setGlobalError(t('providers.networkError'));
      setErrorDialogOpen(true);
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
      model: defaults?.models[0]?.id || "",
      baseUrl: defaults?.base_url || "",
      priority: "10",
      endpoint: "",
      secretId: "",
      secretKey: "",
      inputPrice: "",
      outputPrice: "",
      quotaLimit: "",
    });
    setAddDialogOpen(true);
  };

  const handleProviderTypeChange = (type: string) => {
    const defaults = getProviderTypeConfig(type);
    if (defaults) {
      const firstModel = defaults.models[0];
      setAddForm({
        ...addForm,
        providerType: type,
        model: firstModel?.id || "",
        baseUrl: defaults.base_url,
        inputPrice: firstModel?.input_price?.toString() || "",
        outputPrice: firstModel?.output_price?.toString() || "",
      });
    }
  };

  const handleModelChange = (modelId: string) => {
    const config = getProviderTypeConfig(addForm.providerType);
    const modelInfo = config?.models.find((m) => m.id === modelId);
    if (modelInfo) {
      setAddForm({
        ...addForm,
        model: modelId,
        inputPrice: modelInfo.input_price?.toString() || "",
        outputPrice: modelInfo.output_price?.toString() || "",
      });
    } else {
      setAddForm({ ...addForm, model: modelId });
    }
  };

  const handleEditModelChange = (modelId: string) => {
    if (!editingProvider) return;
    const config = getProviderTypeConfig(editingProvider.provider_type);
    const modelInfo = config?.models.find((m) => m.id === modelId);
    if (modelInfo) {
      setEditForm({
        ...editForm,
        model: modelId,
        inputPrice: modelInfo.input_price?.toString() || "",
        outputPrice: modelInfo.output_price?.toString() || "",
      });
    } else {
      setEditForm({ ...editForm, model: modelId });
    }
  };

  const submitAddProvider = async () => {
    if (!addForm.name.trim()) {
      setAddError(t('providers.pleaseEnterName'));
      return;
    }
    if (addForm.providerType === 'tencent') {
      if (!addForm.secretId.trim() || !addForm.secretKey.trim()) {
        setAddError('Please enter both Secret ID and Secret Key for Tencent provider');
        return;
      }
    } else {
      if (!addForm.apiKey.trim()) {
        setAddError(t('providers.pleaseEnterApiKey'));
        return;
      }
    }
    if (addForm.providerType === 'volcengine' && !addForm.endpoint.trim()) {
      setAddError('Please enter Endpoint ID for Volcengine provider');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const payload: any = {
        name: addForm.name,
        provider_type: addForm.providerType,
        config: JSON.stringify({
          api_key: addForm.apiKey,
          model: addForm.model,
          base_url: addForm.baseUrl,
          input_price: parseFloat(addForm.inputPrice) || 0,
          output_price: parseFloat(addForm.outputPrice) || 0,
          quota_limit: addForm.quotaLimit ? parseInt(addForm.quotaLimit) : null,
        }),
        enabled: true,
        priority: parseInt(addForm.priority) || 10,
      };

      if (addForm.providerType === 'volcengine' && addForm.endpoint) {
        payload.endpoint = addForm.endpoint;
      }

      if (addForm.providerType === 'tencent') {
        payload.secret_id = addForm.secretId;
        payload.secret_key = addForm.secretKey;
      }

      const result = await apiPost<ApiResponse<Provider>>("/api/instances", payload);
      if (result.success && result.data) {
        setProviders([result.data, ...providers]);
        setSelectedProvider(result.data);
        setAddDialogOpen(false);
        setAddError(null);
      } else {
        setAddError(result.message || t('providers.saveFailed'));
      }
    } catch (err) {
      setAddError(t('providers.networkError'));
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

  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key;
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
  };

  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider);
    const config = JSON.parse(provider.config || "{}");
    setEditForm({
      name: provider.name,
      apiKey: maskApiKey(config.api_key || ""),
      model: config.model || "",
      baseUrl: config.base_url || "",
      priority: provider.priority.toString(),
      endpoint: provider.endpoint || "",
      secretId: maskApiKey(provider.secret_id || ""),
      secretKey: maskApiKey(provider.secret_key || ""),
      inputPrice: config.input_price?.toString() || "",
      outputPrice: config.output_price?.toString() || "",
      quotaLimit: config.quota_limit?.toString() || "",
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingProvider) return;
    setSaving(true);
    setEditError(null);
    try {
      const originalConfig = JSON.parse(editingProvider.config || "{}");

      const isMasked = (value: string) => value.includes('*');

      const payload: any = {
        name: editForm.name,
        config: JSON.stringify({
          api_key: isMasked(editForm.apiKey) ? originalConfig.api_key : editForm.apiKey,
          model: editForm.model,
          base_url: editForm.baseUrl,
          input_price: parseFloat(editForm.inputPrice) || 0,
          output_price: parseFloat(editForm.outputPrice) || 0,
          quota_limit: editForm.quotaLimit ? parseInt(editForm.quotaLimit) : null,
        }),
        priority: parseInt(editForm.priority) || 10,
      };

      if (editingProvider.provider_type === 'volcengine' && editForm.endpoint) {
        payload.endpoint = editForm.endpoint;
      }

      if (editingProvider.provider_type === 'tencent') {
        payload.secret_id = isMasked(editForm.secretId) ? editingProvider.secret_id : editForm.secretId;
        payload.secret_key = isMasked(editForm.secretKey) ? editingProvider.secret_key : editForm.secretKey;
      }

      const response = await fetch(`/api/instances/${editingProvider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setProviders(providers.map((p) => (p.id === editingProvider.id ? result.data : p)));
        setSelectedProvider(result.data);
        setEditDialogOpen(false);
        setEditError(null);
      } else {
        setEditError(result.message || t('providers.saveFailed'));
      }
    } catch {
      setEditError(t('providers.networkError'));
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
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <div className="flex-1 space-y-6 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title={t('nav.models')}
          subtitle={t('providers.description')}
          action={
            isAdmin ? (
              <Button size="sm" onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                {t('providers.addProvider')}
              </Button>
            ) : undefined
          }
        />
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
          <div className="flex gap-6 flex-1 min-h-0">
            <ProviderList
              providers={filteredProviders}
              selectedProvider={selectedProvider}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectProvider={setSelectedProvider}
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
              isAdmin={isAdmin}
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
        onModelChange={handleModelChange}
        onSubmit={submitAddProvider}
        adding={adding}
        error={addError}
        getProviderTypeConfig={getProviderTypeConfig}
      />

      <EditProviderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        providerType={editingProvider?.provider_type}
        providerTypeConfig={editingProvider ? getProviderTypeConfig(editingProvider.provider_type) : undefined}
        form={editForm}
        onFormChange={setEditForm}
        onModelChange={handleEditModelChange}
        onSubmit={saveEdit}
        saving={saving}
        error={editError}
      />

      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              {globalError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>
              {t('common.ok') || 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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