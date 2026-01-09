"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, UserCog, Check } from "lucide-react"
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

interface Posto {
    id: string
    nome: string
}

interface Supervisor {
    id: string
    nome: string
    email: string
    ativo: boolean
    postosAutorizados: Posto[]
}

export default function SupervisoresPage() {
    const [supervisores, setSupervisores] = useState<Supervisor[]>([])
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
        ativo: true,
        postosIds: [] as string[]
    })

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [resSup, resPostos] = await Promise.all([
                fetch("/api/admin/supervisores"),
                fetch("/api/admin/postos")
            ])

            if (!resSup.ok || !resPostos.ok) throw new Error("Erro ao carregar dados")

            setSupervisores(await resSup.json())
            setPostos(await resPostos.json())
        } catch {
            toast.error("Erro ao carregar supervisores")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = editingId
                ? `/api/admin/supervisores/${editingId}`
                : "/api/admin/supervisores"

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

            toast.success(editingId ? "Supervisor atualizado" : "Supervisor criado")
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
        setFormData({ nome: "", email: "", password: "", ativo: true, postosIds: [] })
        setIsDialogOpen(true)
    }

    const openEdit = (s: Supervisor) => {
        setEditingId(s.id)
        setFormData({
            nome: s.nome,
            email: s.email,
            password: "", // Don't show password
            ativo: s.ativo,
            postosIds: s.postosAutorizados.map(p => p.id)
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

    const deleteSupervisor = async (id: string) => {
        if (!confirm("Excluir este supervisor?")) return
        try {
            await fetch(`/api/admin/supervisores/${id}`, { method: "DELETE" })
            toast.success("Excluído")
            fetchData()
        } catch {
            toast.error("Erro ao excluir")
        }
    }

    const filtered = supervisores.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Supervisores</h1>
                <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Supervisor
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
                                    <TableHead>Postos Liberados</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.nome}</TableCell>
                                        <TableCell>{s.email}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {s.postosAutorizados.length > 0 ? (
                                                    s.postosAutorizados.slice(0, 3).map(p => (
                                                        <Badge key={p.id} variant="secondary" className="text-[10px]">
                                                            {p.nome}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Nenhum</span>
                                                )}
                                                {s.postosAutorizados.length > 3 && (
                                                    <Badge variant="outline" className="text-[10px]">+{s.postosAutorizados.length - 3}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${s.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {s.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                                    <Pencil className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteSupervisor(s.id)}>
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
                        <DialogTitle>{editingId ? "Editar Supervisor" : "Novo Supervisor"}</DialogTitle>
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

                        <div>
                            <Label htmlFor="pass">{editingId ? "Nova Senha (opcional)" : "Senha Inicial"}</Label>
                            <Input
                                id="pass"
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required={!editingId}
                                placeholder={editingId ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Postos Autorizados</Label>
                            <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto grid grid-cols-2 gap-2">
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

                        <div className="flex items-center space-x-2">
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
