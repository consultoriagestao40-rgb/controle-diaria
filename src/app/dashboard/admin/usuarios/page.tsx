"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, UserCog, Check, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Posto {
    id: string
    nome: string
}

interface User {
    id: string
    nome: string
    email: string
    role: string
    ativo: boolean
    postosAutorizados: Posto[]
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([])
    const [postos, setPostos] = useState<Posto[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        password: "", // Only for create or optional update
        role: "SUPERVISOR",
        ativo: true,
        postosIds: [] as string[]
    })

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [resUsers, resPostos] = await Promise.all([
                fetch("/api/admin/usuarios"),
                fetch("/api/admin/postos")
            ])

            if (!resUsers.ok || !resPostos.ok) throw new Error("Erro ao carregar dados")

            setUsers(await resUsers.json())
            setPostos(await resPostos.json())
        } catch {
            toast.error("Erro ao carregar usuários")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = editingId
                ? `/api/admin/usuarios/${editingId}`
                : "/api/admin/usuarios"

            const method = editingId ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg)
            }

            toast.success(editingId ? "Usuário atualizado" : "Usuário criado")
            setIsDialogOpen(false)
            fetchData()
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingId(null)
        setFormData({ nome: "", email: "", password: "", role: "SUPERVISOR", ativo: true, postosIds: [] })
        setIsDialogOpen(true)
    }

    const openEdit = (u: User) => {
        setEditingId(u.id)
        setFormData({
            nome: u.nome,
            email: u.email,
            password: "", // Don't show password
            role: u.role,
            ativo: u.ativo,
            postosIds: u.postosAutorizados.map(p => p.id)
        })
        setIsDialogOpen(true)
    }

    const togglePosto = (postoId: string) => {
        setFormData(prev => {
            const current = prev.postosIds
            if (current.includes(postoId)) {
                return { ...prev, postosIds: current.filter(id => id !== postoId) }
            } else {
                return { ...prev, postosIds: [...current, postoId] }
            }
        })
    }

    const deleteUser = async (id: string) => {
        if (!confirm("Excluir este usuário?")) return
        try {
            await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" })
            toast.success("Excluído")
            fetchData()
        } catch {
            toast.error("Erro ao excluir")
        }
    }

    const filtered = users.filter(u =>
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN': return <Badge>Admin</Badge>
            case 'SUPERVISOR': return <Badge variant="secondary">Supervisor</Badge>
            case 'APROVADOR': return <Badge variant="default" className="bg-purple-600">Aprovador</Badge>
            case 'FINANCEIRO': return <Badge variant="default" className="bg-green-600">Financeiro</Badge>
            case 'ENCARREGADO': return <Badge variant="outline" className="border-orange-500 text-orange-600">Encarregado</Badge>
            case 'RH': return <Badge variant="outline" className="border-cyan-500 text-cyan-600">Recursos Humanos</Badge>
            default: return <Badge variant="outline">{role}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
                <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Usuário
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-muted-foreground" />
                        Gestão de Acessos
                    </CardTitle>
                    <div className="pt-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou e-mail..."
                                className="pl-8 max-w-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Perfil</TableHead>
                                    <TableHead>Detalhes</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.nome}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                                        <TableCell>
                                            {(u.role === 'SUPERVISOR' || u.role === 'ENCARREGADO') && (
                                                <div className="flex flex-wrap gap-1">
                                                    {u.postosAutorizados.length > 0 ? (
                                                        u.postosAutorizados.slice(0, 2).map(p => (
                                                            <Badge key={p.id} variant="outline" className="text-[10px]">
                                                                {p.nome}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">Nenhum posto</span>
                                                    )}
                                                    {u.postosAutorizados.length > 2 && (
                                                        <Badge variant="outline" className="text-[10px]">+{u.postosAutorizados.length - 2}</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                                                    <Pencil className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="nome">Nome Completo</Label>
                                <Input id="nome" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
                            </div>
                            <div>
                                <Label htmlFor="email">E-mail (Login)</Label>
                                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="role">Perfil de Acesso</Label>
                                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Administrador</SelectItem>
                                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                                        <SelectItem value="APROVADOR">Aprovador</SelectItem>
                                        <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                                        <SelectItem value="ENCARREGADO">Encarregado</SelectItem>
                                        <SelectItem value="RH">Recursos Humanos (RH)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="pass">{editingId ? "Nova Senha (opcional)" : "Senha Inicial"}</Label>
                                <Input
                                    id="pass"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required={!editingId}
                                    placeholder={editingId ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                                />
                            </div>
                        </div>

                        {(formData.role === 'SUPERVISOR' || formData.role === 'ENCARREGADO') && (
                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Postos Autorizados (Supervisor/Encarregado)</Label>
                                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto grid grid-cols-2 gap-2 bg-amber-50/10">
                                    {postos.map(posto => {
                                        const isSelected = formData.postosIds.includes(posto.id)
                                        return (
                                            <div
                                                key={posto.id}
                                                className={`flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-muted ${isSelected ? 'border-primary bg-blue-50' : 'border-transparent'}`}
                                                onClick={() => togglePosto(posto.id)}
                                            >
                                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>
                                                <span className="text-sm">{posto.nome}</span>
                                            </div>
                                        )
                                    })}
                                    {postos.length === 0 && <span className="text-muted-foreground text-sm col-span-2">Nenhum posto cadastrado ainda.</span>}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 mt-4">
                            <Switch id="ativo" checked={formData.ativo} onCheckedChange={c => setFormData({ ...formData, ativo: c })} />
                            <Label htmlFor="ativo">Usuário Ativo</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
