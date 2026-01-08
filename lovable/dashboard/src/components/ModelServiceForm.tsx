import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModelServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const providers = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

const models: Record<string, { value: string; label: string }[]> = {
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-coder", label: "DeepSeek Coder" },
  ],
  openai: [
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3", label: "Claude 3" },
    { value: "claude-2", label: "Claude 2" },
  ],
  google: [
    { value: "gemini-pro", label: "Gemini Pro" },
    { value: "gemini-ultra", label: "Gemini Ultra" },
  ],
};

export function ModelServiceForm({ open, onOpenChange }: ModelServiceFormProps) {
  const [provider, setProvider] = useState("deepseek");
  const [model, setModel] = useState("deepseek-chat");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("10");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [inputCost, setInputCost] = useState("0.00");
  const [outputCost, setOutputCost] = useState("0.00");
  const [tokenQuota, setTokenQuota] = useState("");

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const providerModels = models[value];
    if (providerModels && providerModels.length > 0) {
      setModel(providerModels[0].value);
    }
    
    // Update base URL based on provider
    const baseUrls: Record<string, string> = {
      deepseek: "https://api.deepseek.com/v1",
      openai: "https://api.openai.com/v1",
      anthropic: "https://api.anthropic.com/v1",
      google: "https://generativelanguage.googleapis.com/v1",
    };
    setBaseUrl(baseUrls[value] || "");
  };

  const handleSubmit = () => {
    console.log({
      provider,
      model,
      name,
      priority: Number(priority),
      apiKey,
      baseUrl,
      inputCost: Number(inputCost),
      outputCost: Number(outputCost),
      tokenQuota,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">添加模型服务</DialogTitle>
          <DialogDescription className="text-primary">
            配置一个新的 AI 模型服务
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Row 1: Provider and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">服务商类型</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="选择服务商" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {models[provider]?.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Name and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如：My OpenAI"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">优先级 (1-100)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="100"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Row 4: Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          {/* Row 5: Costs and Token Quota */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inputCost">输入 (¥/1M)</Label>
              <Input
                id="inputCost"
                type="number"
                step="0.01"
                min="0"
                value={inputCost}
                onChange={(e) => setInputCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputCost">输出 (¥/1M)</Label>
              <Input
                id="outputCost"
                type="number"
                step="0.01"
                min="0"
                value={outputCost}
                onChange={(e) => setOutputCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenQuota">Token 配额</Label>
              <Input
                id="tokenQuota"
                placeholder="无限制"
                value={tokenQuota}
                onChange={(e) => setTokenQuota(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
