"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, Save } from "lucide-react"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Posto {
    id: string
    nome: string
    ativo: boolean
}

export default function PostosPage() {
    const [postos, setPostos] = useState<Posto[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPosto, setEditingPosto] = useState<Posto | null>(null)
    const [formData, setFormData] = useState({ nome: "", ativo: true })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchPostos()
    }, [])

    const fetchPostos = async () => {
        try {
            const res = await fetch("/api/admin/postos")
            if (!res.ok) throw new Error("Falha ao carregar")
            const data = await res.json()
            setPostos(data)
        } catch (error) {
            toast.error("Erro ao carregar postos de trabalho")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingPosto) {
                // Update
                const res = await fetch(`/api/admin/postos/${editingPosto.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error()
                toast.success("Posto atualizado com sucesso")
            } else {
                // Create
                const res = await fetch("/api/admin/postos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error()
                toast.success("Posto criado com sucesso")
            }
            setIsDialogOpen(false)
            fetchPostos()
        } catch (error) {
            toast.error("Erro ao salvar posto")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingPosto(null)
        setFormData({ nome: "", ativo: true })
        setIsDialogOpen(true)
    }

    const openEdit = (posto: Posto) => {
        setEditingPosto(posto)
        setFormData({ nome: posto.nome, ativo: posto.ativo })
        setIsDialogOpen(true)
    }

    const deletePosto = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este posto?")) return

        try {
            const res = await fetch(`/api/admin/postos/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Posto excluído com sucesso")
            fetchPostos()
        } catch (error) {
            toast.error("Erro ao excluir posto (pode haver vínculos)")
        }
    }

    const filteredPostos = postos.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Postos de Trabalho</h1>
                <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Posto
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium">Lista de Unidades</CardTitle>
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
                                {filteredPostos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            Nenhum posto encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredPostos.map((posto) => (
                                    <TableRow key={posto.id}>
                                        <TableCell className="font-medium">{posto.nome}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${posto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {posto.ativo ? 'Ativo' : 'Inativo'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(posto)}>
                                                    <Pencil className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deletePosto(posto.id)}>
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
                        <DialogTitle>{editingPosto ? "Editar Posto" : "Novo Posto"}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados do posto de trabalho.
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
