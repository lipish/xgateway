import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

export default function Notifications() {
    const [hasNotifications, setHasNotifications] = useState(false);

    // 模拟检查是否有新通知
    useEffect(() => {
        // 这里可以调用API检查是否有新通知
        // 暂时设置为false，表示没有新通知
        setHasNotifications(false);
    }, []);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                    {hasNotifications && (
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>{t('notifications.title')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="py-2 px-4 text-sm text-muted-foreground text-center">
                    {t('notifications.noNew')}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}