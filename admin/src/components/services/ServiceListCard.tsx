import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import type { Service } from "./types"

interface ServiceListCardProps {
  loading: boolean
  services: Service[]
  selectedServiceId: string | null
  onSelectServiceId: (id: string) => void
  onEdit: (svc: Service) => void
  onRequestDelete: (id: string) => void
}

export function ServiceListCard({
  loading,
  services,
  selectedServiceId,
  onSelectServiceId,
  onEdit,
  onRequestDelete,
}: ServiceListCardProps) {
  return (
    <Card className="w-[520px] shrink-0 h-full flex flex-col">
      <CardContent className="flex-1 h-full overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">{t("services.empty")}</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("services.name")}</TableHead>
                <TableHead>{t("services.id")}</TableHead>
                <TableHead>{t("services.status")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => (
                <TableRow
                  key={svc.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedServiceId === svc.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40"
                  )}
                  onClick={() => onSelectServiceId(svc.id)}
                >
                  <TableCell className="font-medium">{svc.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{svc.id}</TableCell>
                  <TableCell>
                    <Badge variant={svc.enabled ? "success" : "outline"}>
                      {svc.enabled ? t("services.enabled") : t("services.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("common.actions") || "Actions"}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(svc)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onRequestDelete(svc.id)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
