import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { CreateUserDialog } from "@/components/users/CreateUserDialog"
import { GrantInstanceDialog } from "@/components/users/GrantInstanceDialog"
import { UserDetailCard } from "@/components/users/UserDetailCard"
import { UserListCard } from "@/components/users/UserListCard"
import type { Provider, User, UserInstance } from "@/components/users/types"
import { apiDelete, apiGet, apiPost } from "@/lib/api"
import { t } from "@/lib/i18n"
import { RefreshCw, UserPlus } from "lucide-react"

type ApiResponse<T> = {
    success: boolean
    data?: T
    message: string
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

    const fetchUsers = async (): Promise<User[]> => {
        try {
            setLoading(true)
            const data = await apiGet<ApiResponse<User[]>>('/api/users')
            if (!data.success) {
                setError(data.message || 'Failed to fetch users')
                return []
            }
            const list: User[] = data.data || []
            setUsers(list)

            if (list.length === 0) {
                setSelectedUser(null)
                setUserInstances([])
            } else {
                const hasValidSelection = selectedUser && list.some((u) => u.id === selectedUser.id)
                if (!hasValidSelection) {
                    setSelectedUser(list[0])
                    fetchUserInstances(list[0].id)
                }
            }

            return list
        } catch (err) {
            console.error('Failed to fetch users:', err)
            setError(t('common.networkError'))
            return []
        } finally {
            setLoading(false)
        }
    }

    const fetchProviders = async () => {
        try {
            const data = await apiGet<ApiResponse<Provider[]>>('/api/instances')
            if (!data.success) {
                setError(data.message || 'Failed to fetch providers')
                return
            }
            setProviders(data.data || [])
        } catch (err) {
            console.error('Failed to fetch providers:', err)
            setError(t('common.networkError'))
        }
    }

    const fetchUserInstances = async (userId: number) => {
        try {
            const data = await apiGet<ApiResponse<UserInstance[]>>(`/api/users/${userId}/instances`)
            if (!data.success) {
                setError(data.message || 'Failed to fetch user instances')
                return
            }
            setUserInstances(data.data || [])
        } catch (err) {
            console.error('Failed to fetch user instances:', err)
            setError(t('common.networkError'))
        }
    }

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) return

        try {
            setCreating(true)
            setError(null)
            const data = await apiPost<ApiResponse<unknown>>('/api/users', {
                username: newUser.username,
                password_hash: newUser.password, // In real app, hash this
                role_id: newUser.role_id,
            })
            if (data.success) {
                setShowCreateDialog(false)
                setNewUser({ username: '', password: '', role_id: 'user' })
                const createdUserId: number | null = typeof data.data === 'number' ? (data.data as number) : null
                const updatedUsers = await fetchUsers()
                if (createdUserId != null) {
                    const createdUser = updatedUsers.find(u => u.id === createdUserId) || null
                    if (createdUser) {
                        setSelectedUser(createdUser)
                        fetchUserInstances(createdUser.id)
                    }
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
            const data = await apiPost<ApiResponse<unknown>>(`/api/users/${user.id}/toggle`)
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
            const data = await apiDelete<ApiResponse<unknown>>(`/api/users/${userToDelete}`)
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
            const data = await apiPost<ApiResponse<unknown>>(`/api/users/${selectedUser.id}/instances`, {
                provider_id: parseInt(grantData.provider_id),
            })
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
            const data = await apiDelete<ApiResponse<unknown>>(`/api/users/${selectedUser.id}/instances/${providerId}`)
            if (data.success) {
                fetchUserInstances(selectedUser.id)
            }
        } catch (err) {
            console.error('Failed to revoke instance:', err)
        }
    }


    return (
        <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
            <PageHeader
                title={t('users.title')}
                subtitle={t('users.description')}
                action={
                    <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t('users.addUser')}
                    </Button>
                }
            />

            <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
                <div className="flex-1 min-h-0 flex flex-col h-full">
                    {!loading && users.length > 0 && (
                        <TwoPanelLayout
                            left={
                                <UserListCard
                                    users={users}
                                    selectedUserId={selectedUser?.id ?? null}
                                    onSelectUser={(user) => {
                                        setSelectedUser(user)
                                        fetchUserInstances(user.id)
                                    }}
                                />
                            }
                            right={
                                <DetailPanel
                                    scroll={false}
                                    className="flex-1 min-h-0"
                                    contentClassName="p-0 border-0 bg-transparent"
                                >
                                    <UserDetailCard
                                        user={selectedUser}
                                        providers={providers}
                                        userInstances={userInstances}
                                        onToggleStatus={toggleUserStatus}
                                        onRequestDelete={setUserToDelete}
                                        onOpenGrantDialog={() => setShowGrantDialog(true)}
                                        onRevokeInstance={handleRevokeInstance}
                                    />
                                </DetailPanel>
                            }
                        />
                    )}

                    {loading && (
                        <div className="flex-1 min-h-0">
                            <Card className="flex-1 h-full flex flex-col">
                                <CardContent className="flex-1 flex items-center justify-center p-6">
                                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <div className="flex-1 min-h-0">
                            <Card className="flex-1 h-full flex flex-col">
                                <CardContent className="flex-1 flex items-center justify-center p-6">
                                    <div className="text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">{t('users.noUsers')}</p>
                                        <p className="text-sm">Create your first user to get started.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <CreateUserDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    newUser={newUser}
                    onNewUserChange={setNewUser}
                    error={error}
                    creating={creating}
                    onCreate={handleCreate}
                />

                <ConfirmAlertDialog
                    open={userToDelete != null}
                    onOpenChange={(open) => !open && setUserToDelete(null)}
                    title={t('users.confirmDelete')}
                    description={t('users.deleteWarning') || 'This action cannot be undone. This will permanently delete the user account.'}
                    cancelText={t('common.cancel')}
                    confirmText={t('common.delete')}
                    onConfirm={handleDelete}
                    confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                />

                <GrantInstanceDialog
                    open={showGrantDialog}
                    onOpenChange={setShowGrantDialog}
                    username={selectedUser?.username}
                    providers={providers}
                    userInstances={userInstances}
                    grantData={grantData}
                    onGrantDataChange={setGrantData}
                    onGrant={handleGrantInstance}
                    onRevoke={handleRevokeInstance}
                />
            </div>
        </div>
    )
}