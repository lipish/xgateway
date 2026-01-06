import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { t } from "@/lib/i18n"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, RefreshCw, User as UserIcon, Server, UserPlus } from "lucide-react"
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
                await fetchUsers()
                // Select the newly created user
                if (data.data && data.data.id) {
                    const newUser = users.find(u => u.id === data.data.id) || data.data
                    setSelectedUser(newUser)
                    fetchUserInstances(newUser.id)
                }
            } else {
                setError(data.message || 'Failed to create user')
            }
        } catch {
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
            <div className="flex-1 space-y-6 max-w-[1400px] mx-auto w-full">
                <PageHeader
                    title={t('nav.users')}
                    subtitle={t('users.description')}
                    actions={
                        <Button
                            size="sm"
                            onClick={() => setShowCreateDialog(true)}
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            {t('users.create')}
                        </Button>
                    }
                />

                {!loading && users.length > 0 && (
                    <div className="flex gap-6 h-[calc(100vh-12rem)]">
                        {/* User List */}
                        <Card className="w-96 flex flex-col overflow-hidden">
                            <CardContent className="p-4 flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                                                selectedUser?.id === user.id ? "border-primary bg-primary/5" : "border-border"
                                            )}
                                            onClick={() => {
                                                setSelectedUser(user)
                                                fetchUserInstances(user.id)
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{user.username}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-xs font-normal">{user.role_id}</Badge>
                                                        <Badge
                                                            className={cn(
                                                                "text-xs",
                                                                user.status === 'active' ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"
                                                            )}
                                                        >
                                                            {user.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* User Detail */}
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardContent className="p-6 flex-1 overflow-y-auto">
                                {selectedUser ? (
                                    <div className="space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h2 className="text-2xl font-bold">{selectedUser.username}</h2>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="secondary">{selectedUser.role_id}</Badge>
                                                    <Badge
                                                        className={cn(
                                                            "cursor-pointer",
                                                            selectedUser.status === 'active' ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"
                                                        )}
                                                        onClick={() => toggleUserStatus(selectedUser)}
                                                    >
                                                        {selectedUser.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setUserToDelete(selectedUser.id)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg p-4 bg-muted/30">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div className="text-muted-foreground">{t('users.createdAt')}</div>
                                                    <div className="font-medium mt-1">
                                                        {new Date(selectedUser.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">User ID</div>
                                                    <div className="font-medium mt-1">#{selectedUser.id}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedUser.role_id === 'user' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold">Granted Instances</h3>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setShowGrantDialog(true)}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Grant Instance
                                                    </Button>
                                                </div>
                                                <div className="border rounded-lg divide-y">
                                                    {userInstances.length === 0 ? (
                                                        <div className="p-8 text-center text-muted-foreground">
                                                            <Server className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                            <p>No instances granted yet</p>
                                                        </div>
                                                    ) : (
                                                        userInstances.map((ui) => {
                                                            const provider = providers.find(p => p.id === ui.provider_id)
                                                            return (
                                                                <div key={ui.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <Server className="h-5 w-5 text-muted-foreground" />
                                                                        <div>
                                                                            <div className="font-medium">{provider?.name || `Instance #${ui.provider_id}`}</div>
                                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                                Granted on {new Date(ui.granted_at).toLocaleDateString()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                                        onClick={() => handleRevokeInstance(ui.provider_id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <UserIcon className="h-16 w-16 mb-4 opacity-20" />
                                        <p>Select a user to view details</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {loading && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center">
                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!loading && users.length === 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>{t('users.noUsers')}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('users.create')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-[1fr_auto] gap-4">
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
                                        className="w-40"
                                    />
                                </div>
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

                <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                    <DialogContent className="max-w-lg">
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