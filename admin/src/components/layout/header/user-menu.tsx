import { UserCircle, LogOut, Settings, KeyRound, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function UserMenu() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const roleLabel = user?.role_id ? t(`users.role.${user.role_id}`) || user.role_id : t("users.roleUser");
    const userLabel = user?.username || "-";
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleChangePassword = async () => {
        setError("");
        
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError(t("settings.changePasswordAllFields"));
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError(t("settings.changePasswordMismatch"));
            return;
        }
        
        if (newPassword.length < 6) {
            setError(t("settings.changePasswordMinLength"));
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement change password API call
            // const response = await fetch('/api/users/change-password', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ oldPassword, newPassword })
            // });
            
            setShowPasswordDialog(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            // Show success message
        } catch {
            setError(t("settings.changePasswordFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-primary/20 text-muted-foreground hover:text-foreground">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="rounded-lg bg-transparent">
                        <UserCircle className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="end" sideOffset={10}>
                <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                        <Avatar className="h-4 w-4 text-muted-foreground">
                            <AvatarImage src="" alt="Admin" />
                            <AvatarFallback className="rounded-md bg-transparent">
                                <UserCircle className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{roleLabel}</span>
                            <span className="text-muted-foreground truncate text-xs">{userLabel}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t('nav.settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/help')} className="justify-start">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>{t('nav.help')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowPasswordDialog(true)} className="justify-start">
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>{t('settings.changePassword') || 'Change Password'}</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive justify-start" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('common.logout') || 'Logout'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>

            {/* Change Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('settings.changePassword') || 'Change Password'}</DialogTitle>
                        <DialogDescription>
                            {t("settings.changePasswordDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="old-password">{t("settings.currentPassword")}</Label>
                            <Input
                                id="old-password"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder={t("settings.currentPasswordPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t("settings.newPasswordPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">{t("settings.confirmNewPassword")}</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t("settings.confirmNewPasswordPlaceholder")}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleChangePassword} disabled={loading}>
                            {loading ? t("settings.changingPassword") : t("settings.changePassword")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DropdownMenu>
    );
}
