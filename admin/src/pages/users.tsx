import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { useI18n, t } from "@/lib/i18n"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, RefreshCw, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface User {
    id: number
    username: string
    role_id: string
    status: string
    created_at: string
}

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [newUser, setNewUser] = useState({ username: '', password: '' })
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setUsers(data.data || [])
                }
            }
        } catch (err) {
            console.error('Failed to fetch users:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) return

        try {
            setCreating(true)
            setError(null)
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUser.username,
                    password_hash: newUser.password, // In real app, hash this
                    role_id: 'developer'
                })
            })
            const data = await response.json()
            if (data.success) {
                setShowCreateDialog(false)
                setNewUser({ username: '', password: '' })
                fetchUsers()
            } else {
                setError(data.message || 'Failed to create user')
            }
        } catch (err) {
            setError(t('common.networkError'))
        } finally {
            setCreating(false)
        }
    }

    const toggleUserStatus = async (user: User) => {
        try {
            const response = await fetch(`/api/users/${user.id}/toggle`, {
                method: 'POST'
            })
            const data = await response.json()
            if (data.success) {
                fetchUsers()
            }
        } catch (err) {
            console.error('Failed to toggle user status:', err)
        }
    }

    const [userToDelete, setUserToDelete] = useState<number | null>(null)

    const handleDelete = async () => {
        if (!userToDelete) return
        try {
            const response = await fetch(`/api/users/${userToDelete}`, {
                method: 'DELETE'
            })
            const data = await response.json()
            if (data.success) {
                fetchUsers()
            }
        } catch (err) {
            console.error('Failed to delete user:', err)
        } finally {
            setUserToDelete(null)
        }
    }

    return (
        <div className="flex flex-col page-transition">
            <Header
                title={t('nav.users')}
                subtitle={t('users.description')}
                onRefresh={fetchUsers}
                loading={loading}
                actions={
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('users.create')}
                    </Button>
                }
            />
            <div className="flex-1 space-y-4 max-w-[1600px] mx-auto w-full">

                <Card>
                    <CardContent className="pt-6">
                        {loading ? (
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
                                ))}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>{t('users.noUsers')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('users.username')}</TableHead>
                                        <TableHead>{t('users.role')}</TableHead>
                                        <TableHead>{t('users.status')}</TableHead>
                                        <TableHead>{t('users.createdAt')}</TableHead>
                                        <TableHead className="text-right">{t('users.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <UserIcon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span>{user.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">{user.role_id}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={cn(
                                                        "cursor-pointer",
                                                        user.status === 'active' ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"
                                                    )}
                                                    onClick={() => toggleUserStatus(user)}
                                                    title={t('common.toggleStatus')}
                                                >
                                                    {user.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setUserToDelete(user.id)}
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('users.create')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">{t('users.username')}</Label>
                                <Input
                                    id="username"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    placeholder={t('users.usernamePlaceholder')}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('users.password')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder={t('users.passwordPlaceholder')}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleCreate} disabled={creating}>
                                {creating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                {t('common.confirm')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('users.confirmDelete')}</DialogTitle>
                            <DialogDescription>
                                {t('users.deleteWarning') || 'This action cannot be undone. This will permanently delete the user account.'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setUserToDelete(null)}>
                                {t('common.cancel')}
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                {t('common.delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div >
    )
}
