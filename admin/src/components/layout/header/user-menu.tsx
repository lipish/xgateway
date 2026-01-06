import { UserCircle, LogOut, Settings, KeyRound, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

export default function UserMenu() {
    const navigate = useNavigate();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-primary/20 text-muted-foreground hover:text-foreground">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="rounded-lg bg-transparent">
                        <UserCircle className="h-5 w-5" />
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={10}>
                <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 text-muted-foreground">
                            <AvatarImage src="" alt="Admin" />
                            <AvatarFallback className="rounded-lg bg-transparent">
                                <UserCircle className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{t('common.admin')}</span>
                            <span className="text-muted-foreground truncate text-xs">admin@xgateway.io</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t('nav.settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/help')}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>{t('nav.help')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>{t('settings.changePassword') || 'Change Password'}</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('common.logout') || 'Logout'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
