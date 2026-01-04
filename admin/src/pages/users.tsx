import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { useI18n, t } from "@/lib/i18n"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, RefreshCw, User as UserIcon, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

interface Provider {
    id: number
    name: string
}

interface UserInstance {
    id: number
    user_id: number
    provider_id: number
    granted_at: string
}

interface User {
    id: number
    username: string
    role_id: string
    status: string
    created_at: string
}

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [providers, setProviders] = useState<Provider[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showGrantDialog, setShowGrantDialog] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [userInstances, setUserInstances] = useState<UserInstance[]>([])
    const [newUser, setNewUser] = useState({ username: '', password: '', role_id: 'user' })
    const [grantData, setGrantData] = useState({ provider_id: '' })
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchUsers()
        fetchProviders()
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

    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/instances')
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setProviders(data.data || [])
                }
            }
        } catch (err) {
            console.error('Failed to fetch providers:', err)
        }
    }

    const fetchUserInstances = async (userId: number) => {
        try {
            const response = await fetch(`/api/users/${userId}/instances`)
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setUserInstances(data.data || [])
                }
            }
        } catch (err) {
            console.error('Failed to fetch user instances:', err)
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
                    role_id: newUser.role_id
                })
            })
            const data = await response.json()
            if (data.success) {
                setShowCreateDialog(false)
                setNewUser({ username: '', password: '', role_id: 'user' })
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

    const handleGrantInstance = async () => {
        if (!selectedUser || !grantData.provider_id) return
        try {
            const response = await fetch(`/api/users/${selectedUser.id}/instances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_id: parseInt(grantData.provider_id)
                })
            })
            const data = await response.json()
            if (data.success) {
                fetchUserInstances(selectedUser.id)
                setGrantData({ provider_id: '' })
            }
        } catch (err) {
            console.error('Failed to grant instance:', err)
        }
    }

    const handleRevokeInstance = async (providerId: number) => {
        if (!selectedUser) return
        try {
            const response = await fetch(`/api/users/${selectedUser.id}/instances/${providerId}`, {
                method: 'DELETE'
            })
            const data = await response.json()
            if (data.success) {
                fetchUserInstances(selectedUser.id)
            }
        } catch (err) {
            console.error('Failed to revoke instance:', err)
        }
    }

    const handleManageInstances = (user: User) => {
        setSelectedUser(user)
        setShowGrantDialog(true)
        fetchUserInstances(user.id)
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
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setShowCreateDialog(true)}
                        title={t('users.create')}
                    >
                        <Plus className="h-4 w-4" />
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
                                                    {user.role_id === 'user' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleManageInstances(user)}
                                                            title="Manage instances"
                                                        >
                                                            <Server className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
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
                            <div className="grid gap-2">
                                <Label htmlFor="role">{t('users.role')}</Label>
                                <Select
                                    id="role"
                                    value={newUser.role_id}
                                    onChange={(value) => setNewUser({ ...newUser, role_id: value })}
                                    options={[
                                        { value: 'user', label: 'User' },
                                        { value: 'admin', label: 'Administrator' }
                                    ]}
                                    placeholder="Select role"
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

                <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Manage Instance Access - {selectedUser?.username}</DialogTitle>
                            <DialogDescription>
                                Grant or revoke access to provider instances for this user
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Grant New Instance</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={grantData.provider_id}
                                        onChange={(value) => setGrantData({ provider_id: value })}
                                        options={providers
                                            .filter(p => !userInstances.find(ui => ui.provider_id === p.id))
                                            .map(p => ({ value: p.id.toString(), label: p.name }))}
                                        placeholder="Select instance"
                                        className="flex-1"
                                    />
                                    <Button onClick={handleGrantInstance} disabled={!grantData.provider_id}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Grant
                                    </Button>
                                </div>
                            </div>
                            <div className="border rounded-lg">
                                <div className="p-4 border-b bg-muted/50">
                                    <h4 className="font-medium text-sm">Granted Instances</h4>
                                </div>
                                <div className="divide-y max-h-64 overflow-y-auto">
                                    {userInstances.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No instances granted yet
                                        </div>
                                    ) : (
                                        userInstances.map((ui) => {
                                            const provider = providers.find(p => p.id === ui.provider_id)
                                            return (
                                                <div key={ui.id} className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-2">
                                                        <Server className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{provider?.name || `Instance #${ui.provider_id}`}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(ui.granted_at).toLocaleDateString()}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRevokeInstance(ui.provider_id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div >
    )
}