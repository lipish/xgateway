import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Server,
  Key,
  Link,
  Calendar,
  Settings,
  Activity,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Provider {
  id: number;
  name: string;
  provider_type: string;
  config: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// Provider 类型配置接口
interface ProviderTypeConfig {
  id: string;
  label: string;
  base_url: string;
  default_model: string;
  models: string[];
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 测试状态
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{
    id: number;
    success: boolean;
    message: string;
  } | null>(null);

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    apiKey: "",
    model: "",
    baseUrl: "",
    priority: "",
  });
  const [saving, setSaving] = useState(false);

  // 添加对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    providerType: "openai",
    apiKey: "",
    model: "",
    baseUrl: "",
    priority: "10",
  });
  const [adding, setAdding] = useState(false);

  // 选中的 Provider（用于右侧详情面板）
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );

  // Fetch providers and provider types from API
  useEffect(() => {
    fetchProviders();
    fetchProviderTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 检查 URL 参数，自动打开添加对话框
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setAddDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchProviderTypes = async () => {
    try {
      const result = await apiGet<ApiResponse<ProviderTypeConfig[]>>(
        "/api/provider-types",
      );
      if (result.success && result.data) {
        setProviderTypes(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch provider types:", e);
    }
  };

  // 获取当前选中类型的配置
  const getProviderTypeConfig = (
    typeId: string,
  ): ProviderTypeConfig | undefined => {
    return providerTypes.find((t) => t.id === typeId);
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const result = await apiGet<ApiResponse<Provider[]>>("/api/instances");

      if (result.success) {
        const data = result.data || [];
        setProviders(data);
        // 默认选中第一个 Provider
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
      const response = await fetch(`/api/instances/${id}/toggle`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        // Update the provider in the local state
        setProviders(providers.map((p) => (p.id === id ? result.data : p)));
        // 同步更新右侧详情面板
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
    if (!confirm(t('providers.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/instances/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        // Remove the provider from local state
        setProviders(providers.filter((p) => p.id !== id));
      } else {
        alert(result.message || t('providers.saveFailed'));
      }
    } catch (err) {
      alert(t('providers.networkError'));
      console.error("Error deleting provider:", err);
    }
  };

  // 打开添加对话框
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
    });
    setAddDialogOpen(true);
  };

  // 切换 Provider 类型时更新默认值
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

  // 提交添加
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
      const result = await apiPost<ApiResponse<Provider>>("/api/instances", {
        name: addForm.name,
        provider_type: addForm.providerType,
        config: JSON.stringify({
          api_key: addForm.apiKey,
          model: addForm.model,
          base_url: addForm.baseUrl,
        }),
        enabled: true,
        priority: parseInt(addForm.priority) || 10,
      });
      if (result.success && result.data) {
        setProviders([result.data, ...providers]);
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

  // 测试 Provider 连接
  const testProvider = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    const startTime = Date.now();
    const minLoadingTime = 800; // 最小加载时间，确保用户能看到加载动画
    try {
      const result = await apiPost<ApiResponse<null>>(
        `/api/instances/${id}/test`,
      );
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsed),
        );
      }
      setTestResult({
        id,
        success: result.success,
        message: result.message || (result.success ? t('providers.connectionSuccess') : t('providers.connectionFailed')),
      });
    } catch {
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsed),
        );
      }
      setTestResult({ id, success: false, message: t('providers.networkError') });
    } finally {
      setTestingId(null);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider);
    const config = JSON.parse(provider.config || "{}");
    setEditForm({
      name: provider.name,
      apiKey: config.api_key || "",
      model: config.model || "",
      baseUrl: config.base_url || "",
      priority: provider.priority.toString(),
    });
    setEditDialogOpen(true);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingProvider) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/instances/${editingProvider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          config: JSON.stringify({
            api_key: editForm.apiKey,
            model: editForm.model,
            base_url: editForm.baseUrl,
          }),
          priority: parseInt(editForm.priority) || 10,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setProviders(
          providers.map((p) => (p.id === editingProvider.id ? result.data : p)),
        );
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
        {/* Loading and Error States */}
        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">{t("common.loading")}</div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-destructive">{error}</div>
              <div className="text-center mt-2">
                <Button onClick={fetchProviders}>{t("common.confirm")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Master-Detail Layout */}
        {!loading && !error && (
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Left: Provider List (Master) */}
            <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col w-[65%]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("providers.search")}
                      className="pl-9 w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t('providers.total')} {filteredProviders.length} {t('providers.unit')}
                  </span>
                </div>
                <Button onClick={openAddDialog} size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  {t("providers.add")}
                </Button>
              </div>
              <div className="flex-1 overflow-auto border rounded-lg scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead className="text-center">{t("providers.name")}</TableHead>
                      <TableHead className="text-center">{t("providers.type")}</TableHead>
                      <TableHead className="text-center">{t("providers.status")}</TableHead>
                      <TableHead className="text-center">{t("providers.priority")}</TableHead>
                      <TableHead className="text-center w-[100px]">
                        {t("providers.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProviders.map((provider) => (
                      <TableRow
                        key={provider.id}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedProvider?.id === provider.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <TableCell className="text-center">
                          <span className="font-medium">{provider.name}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {provider.provider_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={provider.enabled ? "bg-primary/10 text-primary border-0" : ""}
                            variant={provider.enabled ? "outline" : "destructive"}
                          >
                            {provider.enabled
                              ? t("providers.enabled")
                              : t("providers.disabled")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{provider.priority}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={provider.enabled}
                              onCheckedChange={() =>
                                toggleProvider(provider.id)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('providers.testConnection')}
                              onClick={(e) => {
                                e.stopPropagation();
                                testProvider(provider.id);
                              }}
                              disabled={testingId === provider.id}
                            >
                              {testingId === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : testResult?.id === provider.id ? (
                                <Activity
                                  className={`h-4 w-4 ${testResult.success ? "text-primary" : "text-destructive"}`}
                                />
                              ) : (
                                <Activity className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={
                                provider.enabled
                                  ? t('providers.startChat')
                                  : t('providers.providerDisabled')
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/chat?provider=${provider.id}`);
                              }}
                              disabled={!provider.enabled}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right: Provider Detail (Detail) */}
            <div className="w-[35%] bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
              {selectedProvider ? (
                <>
                  <div className="p-4 border-b flex items-center justify-end">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(selectedProvider)}
                        title={t('providers.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          deleteProvider(selectedProvider.id);
                          setSelectedProvider(null);
                        }}
                        title={t('providers.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* 基本信息 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedProvider.enabled ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                        >
                          <Server className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">
                            {selectedProvider.name}
                          </h4>
                          <Badge variant="secondary">
                            {selectedProvider.provider_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          className={selectedProvider.enabled ? "bg-primary/10 text-primary border-0" : ""}
                          variant={selectedProvider.enabled ? "outline" : "destructive"}
                        >
                          {selectedProvider.enabled ? t('providers.enabled') : t('providers.disabled')}
                        </Badge>
                        <Badge variant="outline">
                          {t('providers.priority')}: {selectedProvider.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* 配置详情 */}
                    <div className="space-y-3 pt-3 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">
                        {t('providers.configInfo')}
                      </h5>
                      {(() => {
                        try {
                          const config = JSON.parse(selectedProvider.config);
                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <Link className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-muted-foreground">
                                    {t('providers.baseUrl')}
                                  </p>
                                  <p className="font-mono text-xs break-all">
                                    {config.base_url || "-"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-muted-foreground">{t('providers.model')}</p>
                                  <p className="font-medium">
                                    {config.model || "-"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-muted-foreground">
                                    API Key
                                  </p>
                                  <p className="font-mono text-xs">
                                    {config.api_key
                                      ? "••••••••" + config.api_key.slice(-4)
                                      : "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } catch {
                          return (
                            <p className="text-sm text-muted-foreground">
                              {t('providers.cannotParseConfig')}
                            </p>
                          );
                        }
                      })()}
                    </div>

                    {/* 时间信息 */}
                    <div className="space-y-2 pt-3 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">
                        {t('providers.timeInfo')}
                      </h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('providers.createdAt')}</span>
                          <span>
                            {new Date(
                              selectedProvider.created_at,
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('providers.updatedAt')}</span>
                          <span>
                            {new Date(
                              selectedProvider.updated_at,
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                  <Server className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">{t('providers.selectProvider')}</p>
                  <p className="text-xs mt-1">{t('providers.viewConfig')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 添加对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('providers.addProvider')}</DialogTitle>
            <DialogDescription>{t('providers.addProviderDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-type">{t('providers.providerType')}</Label>
                <Select
                  id="add-type"
                  value={addForm.providerType}
                  onChange={handleProviderTypeChange}
                  options={providerTypes.map((pt) => ({
                    value: pt.id,
                    label: pt.label,
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-model">{t('providers.model')}</Label>
                <Select
                  id="add-model"
                  value={addForm.model}
                  onChange={(val) => setAddForm({ ...addForm, model: val })}
                  options={
                    getProviderTypeConfig(addForm.providerType)?.models.map(
                      (m) => ({ value: m, label: m }),
                    ) || []
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-name">{t('providers.name')} *</Label>
                <Input
                  id="add-name"
                  placeholder={t('providers.namePlaceholder')}
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-priority">{t('providers.priorityRange')}</Label>
                <Input
                  id="add-priority"
                  type="number"
                  min="1"
                  max="100"
                  value={addForm.priority}
                  onChange={(e) =>
                    setAddForm({ ...addForm, priority: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-apiKey">API Key *</Label>
              <Input
                id="add-apiKey"
                type="password"
                placeholder="sk-..."
                value={addForm.apiKey}
                onChange={(e) =>
                  setAddForm({ ...addForm, apiKey: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-baseUrl">{t('providers.baseUrl')}</Label>
              <Input
                id="add-baseUrl"
                value={addForm.baseUrl}
                onChange={(e) =>
                  setAddForm({ ...addForm, baseUrl: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitAddProvider} disabled={adding}>
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('providers.editProvider')}</DialogTitle>
            <DialogDescription>{t('providers.editProviderDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('providers.name')}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-apiKey">API Key</Label>
              <Input
                id="edit-apiKey"
                type="password"
                value={editForm.apiKey}
                onChange={(e) =>
                  setEditForm({ ...editForm, apiKey: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-model">{t('providers.model')}</Label>
              <Input
                id="edit-model"
                value={editForm.model}
                onChange={(e) =>
                  setEditForm({ ...editForm, model: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-baseUrl">{t('providers.baseUrl')}</Label>
              <Input
                id="edit-baseUrl"
                value={editForm.baseUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, baseUrl: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">{t('providers.priority')}</Label>
              <Input
                id="edit-priority"
                type="number"
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm({ ...editForm, priority: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}