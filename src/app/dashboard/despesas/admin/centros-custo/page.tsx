"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, Landmark, Check, Users } from "lucide-react"
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

interface User {
    id: string
    nome: string
    email: string
    role: string
}

interface CentroCusto {
    id: string
    nome: string
    ativo: boolean
    aprovadorN1Id: string | null
    aprovadorN1: User | null
    aprovadorN2Id: string | null
    aprovadorN2: User | null
    financeiroId: string | null
    financeiro: User | null
    _count?: {
        users: number
        despesas: number
    }
}

export default function CentrosCustoPage() {
    const [centros, setCentros] = useState<CentroCusto[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        nome: "",
        aprovadorN1Id: "none",
        aprovadorN2Id: "none",
        financeiroId: "none",
        ativo: true
    })

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [centrosRes, usersRes] = await Promise.all([
                fetch("/api/admin/centros-custo"),
                fetch("/api/admin/usuarios")
            ])

            if (centrosRes.ok && usersRes.ok) {
                const centrosData = await centrosRes.json()
                const usersData = await usersRes.json()
                setCentros(centrosData)
                setUsers(usersData)
            } else {
                toast.error("Erro ao carregar dados do servidor.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro de conexão ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    const openNew = () => {
        setFormData({
            nome: "",
            aprovadorN1Id: "none",
            aprovadorN2Id: "none",
            financeiroId: "none",
            ativo: true
        })
        setEditingId(null)
        setIsDialogOpen(true)
    }

    const openEdit = (c: CentroCusto) => {
        setFormData({
            nome: c.nome,
            aprovadorN1Id: c.aprovadorN1Id || "none",
            aprovadorN2Id: c.aprovadorN2Id || "none",
            financeiroId: c.financeiroId || "none",
            ativo: c.ativo
        })
        setEditingId(c.id)
        setIsDialogOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const payload = {
            nome: formData.nome.trim(),
            aprovadorN1Id: formData.aprovadorN1Id === "none" ? null : formData.aprovadorN1Id,
            aprovadorN2Id: formData.aprovadorN2Id === "none" ? null : formData.aprovadorN2Id,
            financeiroId: formData.financeiroId === "none" ? null : formData.financeiroId,
            ativo: formData.ativo
        }

        try {
            const url = editingId ? `/api/admin/centros-custo/${editingId}` : "/api/admin/centros-custo"
            const method = editingId ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(editingId ? "Centro de Custo atualizado com sucesso!" : "Centro de Custo criado com sucesso!")
                setIsDialogOpen(false)
                fetchData()
            } else {
                toast.error(data.error || "Erro ao salvar Centro de Custo.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro de rede ao salvar Centro de Custo.")
        } finally {
            setSaving(false)
        }
    }

    const deleteCentro = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este Centro de Custo?")) return

        try {
            const res = await fetch(`/api/admin/centros-custo/${id}`, {
                method: "DELETE"
            })

            const data = await res.json()

            if (res.ok) {
                toast.success("Centro de Custo excluído com sucesso!")
                fetchData()
            } else {
                toast.error(data.error || "Erro ao excluir Centro de Custo.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro de rede ao excluir Centro de Custo.")
        }
    }

    const filtered = centros.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Centros de Custo</h1>
                    <p className="text-sm text-slate-500">Configure departamentos, aprovadores (N1/N2) e analistas financeiros dedicados.</p>
                </div>
                <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Novo Centro de Custo
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100/50 bg-slate-50/50">
                    <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-800">
                        <Landmark className="h-5 w-5 text-indigo-500" />
                        Departamentos e Áreas
                    </CardTitle>
                    <div className="pt-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar Centro de Custo..."
                                className="pl-8 max-w-sm border-slate-200 focus-visible:ring-indigo-500 rounded-xl bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-medium">
                            Nenhum centro de custo encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="pl-6">Nome</TableHead>
                                    <TableHead>Aprovador N1 (Gestor)</TableHead>
                                    <TableHead>Aprovador N2 (Diretor)</TableHead>
                                    <TableHead>Financeiro Responsável</TableHead>
                                    <TableHead className="text-center">Integrantes</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((c) => (
                                    <TableRow key={c.id} className="hover:bg-slate-50/30 transition-colors">
                                        <TableCell className="font-semibold text-slate-800 pl-6">{c.nome}</TableCell>
                                        <TableCell>
                                            {c.aprovadorN1 ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{c.aprovadorN1.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{c.aprovadorN1.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic font-medium">Não configurado</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {c.aprovadorN2 ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{c.aprovadorN2.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{c.aprovadorN2.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic font-medium">Não configurado</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {c.financeiro ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{c.financeiro.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{c.financeiro.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic font-medium">Não configurado</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-100 gap-1 text-[11px] font-bold">
                                                <Users className="h-3 w-3" />
                                                {c._count?.users || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={c.ativo ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}>
                                                {c.ativo ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1.5">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 hover:bg-indigo-50 rounded-lg">
                                                    <Pencil className="h-4 w-4 text-indigo-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteCentro(c.id)} className="h-8 w-8 hover:bg-rose-50 rounded-lg">
                                                    <Trash2 className="h-4 w-4 text-rose-500" />
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
                <DialogContent className="max-w-md bg-white rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900">{editingId ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
                        <DialogDescription className="text-slate-500">Insira as informações do departamento e atribua os responsáveis.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="nome" className="font-semibold text-slate-700">Nome do Centro de Custo</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Ex: Marketing, Comercial, TI"
                                className="border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="aprovadorN1" className="font-semibold text-slate-700">Aprovador N1 (Gestor da Área)</Label>
                            <Select value={formData.aprovadorN1Id} onValueChange={(v) => setFormData({ ...formData, aprovadorN1Id: v })}>
                                <SelectTrigger className="border-slate-200 focus-visible:ring-indigo-500 bg-white rounded-xl">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Fluxo geral)</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.nome} ({u.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="aprovadorN2" className="font-semibold text-slate-700">Aprovador N2 (Diretor / Aprovação Final)</Label>
                            <Select value={formData.aprovadorN2Id} onValueChange={(v) => setFormData({ ...formData, aprovadorN2Id: v })}>
                                <SelectTrigger className="border-slate-200 focus-visible:ring-indigo-500 bg-white rounded-xl">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Apenas N1)</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.nome} ({u.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="financeiro" className="font-semibold text-slate-700">Financeiro Dedicado</Label>
                            <Select value={formData.financeiroId} onValueChange={(v) => setFormData({ ...formData, financeiroId: v })}>
                                <SelectTrigger className="border-slate-200 focus-visible:ring-indigo-500 bg-white rounded-xl">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Qualquer financeiro)</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.nome} ({u.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="ativo" checked={formData.ativo} onCheckedChange={c => setFormData({ ...formData, ativo: c })} />
                            <Label htmlFor="ativo" className="font-semibold text-slate-700 cursor-pointer">Centro de Custo Ativo</Label>
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
