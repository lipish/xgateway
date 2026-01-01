import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  Loader2,
  Activity,
  MessageSquare,
} from "lucide-react"
import { t } from "@/lib/i18n"
import type { Provider, TestResult } from "./types"

interface ProviderListProps {
  providers: Provider[]
  selectedProvider: Provider | null
  searchQuery: string
  testingId: number | null
  testResult: TestResult | null
  onSearchChange: (query: string) => void
  onSelectProvider: (provider: Provider) => void
  onAddProvider: () => void
  onToggleProvider: (id: number) => void
  onTestProvider: (id: number) => void
  onNavigateToChat: (id: number) => void
}

export function ProviderList({
  providers,
  selectedProvider,
  searchQuery,
  testingId,
  testResult,
  onSearchChange,
  onSelectProvider,
  onAddProvider,
  onToggleProvider,
  onTestProvider,
  onNavigateToChat,
}: ProviderListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col w-[65%]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("providers.search")}
              className="pl-9 w-48"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {t('providers.total')} {providers.length} {t('providers.unit')}
          </span>
        </div>
        <Button onClick={onAddProvider} size="sm">
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
              <TableHead className="text-center w-[100px]">{t("providers.status")}</TableHead>
              <TableHead className="text-center">{t("providers.priority")}</TableHead>
              <TableHead className="text-center w-[100px]">
                {t("providers.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow
                key={provider.id}
                className={`cursor-pointer hover:bg-muted/50 ${selectedProvider?.id === provider.id ? "bg-muted" : ""}`}
                onClick={() => onSelectProvider(provider)}
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
                      onCheckedChange={() => onToggleProvider(provider.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('providers.testConnection')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTestProvider(provider.id);
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
                        onNavigateToChat(provider.id);
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
  )
}