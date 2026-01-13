"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Loader2, List, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Motivo {
    id: string
    descricao: string
    ativo: boolean
}

export default function ConfigsPage() {
    const [activeTab, setActiveTab] = useState("motivos")
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

            <Tabs defaultValue="motivos" className="w-full" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="motivos">Motivos de Cobertura</TabsTrigger>
                    <TabsTrigger value="maintenance" className="text-red-600 data-[state=active]:text-red-700">Manutenção de Dados</TabsTrigger>
                    <TabsTrigger value="outros">Outros Cadastros</TabsTrigger>
                </TabsList>
                <TabsContent value="motivos" className="mt-4">
                    <MotivosTab />
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4">
                    <MaintenanceTab />
                </TabsContent>
                <TabsContent value="outros" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Em breve</CardTitle>
                            <CardDescription>Outras configurações (Cargas, Pagamentos) virão aqui.</CardDescription>
                        </CardHeader>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MotivosTab() {
    const [motivos, setMotivos] = useState<Motivo[]>([])
    const [loading, setLoading] = useState(true)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMotivo, setEditingMotivo] = useState<Motivo | null>(null)
    const [formData, setFormData] = useState({ descricao: "", ativo: true })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchMotivos()
    }, [])

    const fetchMotivos = async () => {
        try {
            const res = await fetch("/api/admin/motivos")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setMotivos(data)
        } catch {
            toast.error("Erro ao carregar motivos")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingMotivo) {
                await fetch(`/api/admin/motivos/${editingMotivo.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Motivo atualizado")
            } else {
                await fetch("/api/admin/motivos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Motivo criado")
            }
            setIsDialogOpen(false)
            fetchMotivos()
        } catch {
            toast.error("Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingMotivo(null)
        setFormData({ descricao: "", ativo: true })
        setIsDialogOpen(true)
    }

    const openEdit = (m: Motivo) => {
        setEditingMotivo(m)
        setFormData({ descricao: m.descricao, ativo: m.ativo })
        setIsDialogOpen(true)
    }

    const deleteMotivo = async (id: string) => {
        if (!confirm("Excluir motivo?")) return
        try {
            await fetch(`/api/admin/motivos/${id}`, { method: "DELETE" })
            toast.success("Excluído")
            fetchMotivos()
        } catch {
            toast.error("Erro ao excluir")
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Motivos de Cobertura</CardTitle>
                        <CardDescription>Justificativas para as coberturas (Falta, Atestado, etc).</CardDescription>
                    </div>
                    <Button onClick={openNew}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Motivo
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {motivos.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-medium">{m.descricao}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {m.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteMotivo(m.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
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
                        <DialogTitle>{editingMotivo ? 'Editar' : 'Novo'} Motivo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="desc">Descrição</Label>
                            <Input id="desc" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="ativo" checked={formData.ativo} onCheckedChange={c => setFormData({ ...formData, ativo: c })} />
                            <Label htmlFor="ativo">Ativo</Label>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={saving}>Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

function MaintenanceTab() {
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleReset = async () => {
        if (confirmText !== "ZERAR") return
        setLoading(true)
        try {
            const res = await fetch("/api/admin/maintenance/reset", { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Dados limpos com sucesso!")
            setOpen(false)
        } catch {
            toast.error("Erro ao limpar dados.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
                <div className="flex items-center gap-2 text-red-700">
                    <TriangleAlert className="h-5 w-5" />
                    <CardTitle>Zona de Perigo</CardTitle>
                </div>
                <CardDescription className="text-red-600/80">
                    Ações irreversíveis que afetam todo o sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white">
                    <div>
                        <h3 className="font-medium text-red-900">Zerar Lançamentos</h3>
                        <p className="text-sm text-red-700/70">
                            Remove <strong>TODAS</strong> as coberturas, históricos e anexos vinculados.<br />
                            Mantém usuários, postos, diaristas e motivos.
                        </p>
                    </div>
                    <Button variant="destructive" onClick={() => { setConfirmText(""); setOpen(true); }}>
                        Limpar Tudo
                    </Button>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-red-700 flex items-center gap-2">
                                <TriangleAlert className="h-5 w-5" />
                                Confirmação Crítica
                            </DialogTitle>
                            <DialogDescription>
                                Esta ação apagará permanentemente todos os lançamentos do sistema. Não pode ser desfeita.
                                <br /><br />
                                Digite <strong>ZERAR</strong> abaixo para confirmar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-2">
                            <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Digite ZERAR"
                                className="border-red-300 focus-visible:ring-red-500"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button
                                variant="destructive"
                                disabled={confirmText !== "ZERAR" || loading}
                                onClick={handleReset}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Limpeza"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
