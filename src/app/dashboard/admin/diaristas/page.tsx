"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, Users } from "lucide-react"
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

interface Diarista {
    id: string
    nome: string
    cpf: string
    chavePix?: string
    ativo: boolean
}

export default function DiaristasPage() {
    const [diaristas, setDiaristas] = useState<Diarista[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDiarista, setEditingDiarista] = useState<Diarista | null>(null)
    const [formData, setFormData] = useState({ nome: "", cpf: "", chavePix: "", ativo: true })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchDiaristas()
    }, [])

    const fetchDiaristas = async () => {
        try {
            const res = await fetch("/api/admin/diaristas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setDiaristas(data)
        } catch (error) {
            toast.error("Erro ao carregar diaristas")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingDiarista) {
                // Update
                const res = await fetch(`/api/admin/diaristas/${editingDiarista.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error()
                toast.success("Diarista atualizado com sucesso")
            } else {
                // Create
                const res = await fetch("/api/admin/diaristas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error()
                toast.success("Diarista criado com sucesso")
            }
            setIsDialogOpen(false)
            fetchDiaristas()
        } catch (error) {
            toast.error("Erro ao salvar diarista")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingDiarista(null)
        setFormData({ nome: "", cpf: "", chavePix: "", ativo: true })
        setIsDialogOpen(true)
    }

    const openEdit = (diarista: Diarista) => {
        setEditingDiarista(diarista)
        setFormData({ nome: diarista.nome, cpf: diarista.cpf || "", chavePix: diarista.chavePix || "", ativo: diarista.ativo })
        setIsDialogOpen(true)
    }

    const deleteDiarista = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este diarista?")) return

        try {
            const res = await fetch(`/api/admin/diaristas/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Diarista excluído com sucesso")
            fetchDiaristas()
        } catch (error) {
            toast.error("Erro ao excluir (pode haver vínculos)")
        }
    }

    const filtered = diaristas.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Diaristas</h1>
                <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Diarista
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Profissionais Cadastrados
                    </CardTitle>
                    <div className="pt-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome..."
                                className="pl-8 max-w-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            Nenhum diarista encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{item.nome}</span>
                                                <span className="text-xs text-muted-foreground">{item.cpf}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.ativo ? 'Ativo' : 'Inativo'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                    <Pencil className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteDiarista(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-600" />
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDiarista ? "Editar Diarista" : "Novo Diarista"}</DialogTitle>
                        <DialogDescription>
                            Cadastro de profissionais disponíveis para cobertura.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="nome" className="text-right">Nome</Label>
                                <Input
                                    id="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cpf" className="text-right">CPF</Label>
                                <Input
                                    id="cpf"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    className="col-span-3"
                                    required
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="pix" className="text-right">Chave Pix</Label>
                                <Input
                                    id="pix"
                                    value={formData.chavePix}
                                    onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                                    className="col-span-3"
                                    placeholder="CPF, Email, Telefone..."
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="ativo" className="text-right">Ativo</Label>
                                <div className="flex items-center space-x-2 col-span-3">
                                    <Switch
                                        id="ativo"
                                        checked={formData.ativo}
                                        onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                                    />
                                    <Label htmlFor="ativo">{formData.ativo ? "Sim" : "Não"}</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
