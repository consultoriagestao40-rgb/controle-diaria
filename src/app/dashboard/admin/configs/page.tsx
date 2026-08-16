"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Loader2, List, TriangleAlert, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Building2, Key, Layers, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

import { useSearchParams } from "next/navigation"

interface Motivo {
    id: string
    descricao: string
    ativo: boolean
}

interface CargaHoraria {
    id: string
    descricao: string
    ativo: boolean
}

export default function ConfigsPage() {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab")
    const [activeTab, setActiveTab] = useState(tabParam || "motivos")

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="motivos">Motivos de Cobertura</TabsTrigger>
                    <TabsTrigger value="cargas">Cargas Horárias</TabsTrigger>
                    <TabsTrigger value="empresas">Empresas</TabsTrigger>
                    <TabsTrigger value="contaazul" className="bg-sky-50 text-sky-700 hover:bg-sky-100 data-[state=active]:bg-sky-600 data-[state=active]:text-white font-bold">
                        ERP Conta Azul (4 Empresas)
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="text-red-600 data-[state=active]:text-red-700">Manutenção de Dados</TabsTrigger>
                    <TabsTrigger value="outros">Outros Cadastros</TabsTrigger>
                </TabsList>
                <TabsContent value="motivos" className="mt-4">
                    <MotivosTab />
                </TabsContent>
                <TabsContent value="cargas" className="mt-4">
                    <CargasTab />
                </TabsContent>
                <TabsContent value="empresas" className="mt-4">
                    <EmpresasTab />
                </TabsContent>
                <TabsContent value="contaazul" className="mt-4">
                    <ContaAzulTab />
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

function CargasTab() {
    const [cargas, setCargas] = useState<CargaHoraria[]>([])
    const [loading, setLoading] = useState(true)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<CargaHoraria | null>(null)
    const [formData, setFormData] = useState({ descricao: "", ativo: true })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchCargas()
    }, [])

    const fetchCargas = async () => {
        try {
            const res = await fetch("/api/admin/cargas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setCargas(data)
        } catch {
            toast.error("Erro ao carregar cargas")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingItem) {
                await fetch(`/api/admin/cargas/${editingItem.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Carga atualizada")
            } else {
                await fetch("/api/admin/cargas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Carga criada")
            }
            setIsDialogOpen(false)
            fetchCargas()
        } catch {
            toast.error("Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingItem(null)
        setFormData({ descricao: "", ativo: true })
        setIsDialogOpen(true)
    }

    const openEdit = (item: CargaHoraria) => {
        setEditingItem(item)
        setFormData({ descricao: item.descricao, ativo: item.ativo })
        setIsDialogOpen(true)
    }

    const deleteItem = async (id: string) => {
        if (!confirm("Excluir carga?")) return
        try {
            await fetch(`/api/admin/cargas/${id}`, { method: "DELETE" })
            toast.success("Excluída")
            fetchCargas()
        } catch {
            toast.error("Erro ao excluir. Pode estar em uso.")
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Cargas Horárias</CardTitle>
                        <CardDescription>Turnos de trabalho disponíveis (08:00, 12x36, etc).</CardDescription>
                    </div>
                    <Button onClick={openNew}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Carga
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
                                {cargas.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.descricao}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
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
                        <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Carga</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="desc-carga">Descrição (Ex: 08:00)</Label>
                            <Input id="desc-carga" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="ativo-carga" checked={formData.ativo} onCheckedChange={c => setFormData({ ...formData, ativo: c })} />
                            <Label htmlFor="ativo-carga">Ativo</Label>
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

function EmpresasTab() {
    const [empresas, setEmpresas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any | null>(null)
    const [formData, setFormData] = useState({ nome: "", ativo: true })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchEmpresas()
    }, [])

    const fetchEmpresas = async () => {
        try {
            const res = await fetch("/api/admin/empresas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setEmpresas(data)
        } catch {
            toast.error("Erro ao carregar empresas")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingItem) {
                await fetch(`/api/admin/empresas/${editingItem.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Empresa atualizada")
            } else {
                await fetch("/api/admin/empresas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                toast.success("Empresa criada")
            }
            setIsDialogOpen(false)
            fetchEmpresas()
        } catch {
            toast.error("Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    const openNew = () => {
        setEditingItem(null)
        setFormData({ nome: "", ativo: true })
        setIsDialogOpen(true)
    }

    const openEdit = (item: any) => {
        setEditingItem(item)
        setFormData({ nome: item.nome, ativo: item.ativo })
        setIsDialogOpen(true)
    }

    const deleteItem = async (id: string) => {
        if (!confirm("Excluir empresa?")) return
        try {
            await fetch(`/api/admin/empresas/${id}`, { method: "DELETE" })
            toast.success("Excluída")
            fetchEmpresas()
        } catch {
            toast.error("Erro ao excluir. Pode estar em uso.")
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Empresas do Grupo</CardTitle>
                        <CardDescription>Cadastro de empresas para vincular aos lançamentos.</CardDescription>
                    </div>
                    <Button onClick={openNew}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Empresa
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
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
                                {empresas.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.nome}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
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
                        <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Empresa</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="nome-empresa">Nome da Empresa</Label>
                            <Input id="nome-empresa" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="ativo-empresa" checked={formData.ativo} onCheckedChange={c => setFormData({ ...formData, ativo: c })} />
                            <Label htmlFor="ativo-empresa">Ativa</Label>
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

function ContaAzulTab() {
    const [empresas, setEmpresas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncingAll, setSyncingAll] = useState(false)
    const [syncingId, setSyncingId] = useState<string | null>(null)
    const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null)
    const [formData, setFormData] = useState<any>({})
    const [savingEmpresaId, setSavingEmpresaId] = useState<string | null>(null)

    useEffect(() => {
        fetchConfigs()

        // Checar parâmetros de URL pós-OAuth callback
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const status = urlParams.get("status")
            const msg = urlParams.get("message")
            if (status === "success") {
                toast.success("Conta Azul conectado com sucesso para a empresa selecionada!")
                window.history.replaceState({}, document.title, window.location.pathname + "?tab=contaazul")
            } else if (status === "error") {
                toast.error(`Falha na conexão Conta Azul: ${msg || "Erro desconhecido"}`)
                window.history.replaceState({}, document.title, window.location.pathname + "?tab=contaazul")
            }
        }
    }, [])

    const fetchConfigs = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/contaazul/config")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setEmpresas(data)
        } catch {
            toast.error("Erro ao carregar configurações do Conta Azul")
        } finally {
            setLoading(false)
        }
    }

    const handleSyncAll = async () => {
        setSyncingAll(true)
        try {
            const res = await fetch("/api/contaazul/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message || "Sincronização concluída com sucesso!")
                fetchConfigs()
            } else {
                toast.error(data.error || "Erro na sincronização.")
            }
        } catch {
            toast.error("Erro de conexão ao sincronizar.")
        } finally {
            setSyncingAll(false)
        }
    }

    const handleSyncEmpresa = async (empresaId: string, empresaNome: string) => {
        setSyncingId(empresaId)
        try {
            const res = await fetch("/api/contaazul/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresaId })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Sincronização de ${empresaNome} concluída: ${data.coberturasAtualizadas} diárias e ${data.despesasAtualizadas} despesas atualizadas.`)
                fetchConfigs()
            } else {
                toast.error(data.error || "Erro na sincronização.")
            }
        } catch {
            toast.error("Erro de conexão ao sincronizar.")
        } finally {
            setSyncingId(null)
        }
    }

    const startEditing = (empresa: any) => {
        setEditingEmpresaId(empresa.id)
        setFormData({
            clientId: empresa.config?.clientId || "",
            clientSecret: "",
            redirectUri: empresa.config?.redirectUri || "",
            ativo: empresa.config?.ativo !== false,
            autoCriarAoAprovar: empresa.config?.autoCriarAoAprovar !== false,
            categoriaDiariaId: empresa.config?.categoriaDiariaId || "",
            categoriaDiariaNome: empresa.config?.categoriaDiariaNome || "",
            categoriaReembolsoId: empresa.config?.categoriaReembolsoId || "",
            categoriaReembolsoNome: empresa.config?.categoriaReembolsoNome || "",
            categoriaAdiantamentoId: empresa.config?.categoriaAdiantamentoId || "",
            categoriaAdiantamentoNome: empresa.config?.categoriaAdiantamentoNome || "",
            centroCustoPadraoId: empresa.config?.centroCustoPadraoId || "",
            centroCustoPadraoNome: empresa.config?.centroCustoPadraoNome || "",
            contaFinanceiraPadraoId: empresa.config?.contaFinanceiraPadraoId || "",
            contaFinanceiraPadraoNome: empresa.config?.contaFinanceiraPadraoNome || ""
        })
    }

    const handleSaveEmpresa = async (empresaId: string) => {
        setSavingEmpresaId(empresaId)
        try {
            const res = await fetch("/api/contaazul/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresaId,
                    ...formData
                })
            })
            if (!res.ok) throw new Error()
            toast.success("Configurações salvas com sucesso!")
            setEditingEmpresaId(null)
            fetchConfigs()
        } catch {
            toast.error("Erro ao salvar configurações.")
        } finally {
            setSavingEmpresaId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                <p className="text-sm font-medium text-slate-600">Carregando status do ERP Conta Azul...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Geral */}
            <Card className="border-sky-200 bg-linear-to-r from-sky-50 via-white to-sky-50 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">⚡</span>
                            <CardTitle className="text-xl font-bold text-sky-950">Integração ERP Conta Azul (Multi-Empresas)</CardTitle>
                        </div>
                        <CardDescription className="text-slate-600 mt-1">
                            Conecte e automatize o envio de <strong>Diárias</strong>, <strong>Reembolsos</strong> e <strong>Adiantamentos</strong> para as 4 empresas do grupo.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            onClick={handleSyncAll}
                            disabled={syncingAll}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm w-full md:w-auto"
                        >
                            {syncingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Sincronizar Todas as Empresas
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-sky-100">
                        <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span><strong>1. Aprovação:</strong> Criação automática de Contas a Pagar na empresa da diária.</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span><strong>2. Baixa no ERP:</strong> Identifica quitações e marca como <code>PAGO</code>.</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span><strong>3. Comprovantes:</strong> Vinculação automática do comprovante no histórico.</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grid das 4 Empresas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {empresas.map((empresa) => {
                    const isEditing = editingEmpresaId === empresa.id
                    const isSaving = savingEmpresaId === empresa.id
                    const isSyncing = syncingId === empresa.id

                    return (
                        <Card key={empresa.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-sky-600" />
                                            <CardTitle className="text-lg font-bold text-slate-900">{empresa.nome}</CardTitle>
                                        </div>
                                        <p className="text-xs text-slate-500">ID: <code className="bg-slate-100 px-1 py-0.5 rounded">{empresa.id.slice(0, 8)}...</code></p>
                                    </div>
                                    <div>
                                        {empresa.isConnected ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold hover:bg-emerald-100">
                                                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Conectado OAuth
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold">
                                                <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" /> Pendente Conexão
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4 pt-4 text-sm flex-1">
                                {/* Status e Ações Rápidas */}
                                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Status da Integração</span>
                                        <span className="text-xs text-slate-700">
                                            {empresa.config?.ultimaSincronizacao ? `Última sincronização: ${new Date(empresa.config.ultimaSincronizacao).toLocaleString("pt-BR")}` : "Nenhuma sincronização realizada ainda."}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={`/api/contaazul/auth?empresaId=${empresa.id}`} target="_self">
                                            <Button size="sm" variant={empresa.isConnected ? "outline" : "default"} className={!empresa.isConnected ? "bg-sky-600 hover:bg-sky-700 text-white font-bold" : ""}>
                                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                {empresa.isConnected ? "Reconectar OAuth" : "Conectar Conta Azul"}
                                            </Button>
                                        </a>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleSyncEmpresa(empresa.id, empresa.nome)}
                                            disabled={isSyncing || !empresa.isConnected}
                                            title="Sincronizar baixas e comprovantes desta empresa"
                                        >
                                            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Modo de Edição ou Visualização */}
                                {isEditing ? (
                                    <div className="space-y-4 border border-sky-100 rounded-xl p-4 bg-sky-50/30">
                                        <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                <Key className="h-4 w-4 text-sky-600" /> Configuração e Mapeamento
                                            </h4>
                                        </div>

                                        {/* Credenciais Opcionais do App */}
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor={`client-id-${empresa.id}`} className="text-xs">Client ID</Label>
                                                <Input
                                                    id={`client-id-${empresa.id}`}
                                                    value={formData.clientId}
                                                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                                    placeholder="Deixe em branco para usar o padrão global"
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`client-secret-${empresa.id}`} className="text-xs">Client Secret</Label>
                                                <Input
                                                    id={`client-secret-${empresa.id}`}
                                                    type="password"
                                                    value={formData.clientSecret}
                                                    onChange={e => setFormData({ ...formData, clientSecret: e.target.value })}
                                                    placeholder="Deixe em branco para manter o atual"
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Mapeamentos de Categorias */}
                                        <div className="space-y-3 pt-2 border-t border-sky-100">
                                            <span className="text-xs font-bold text-slate-700 block">Mapeamento de Categorias (Plano de Contas)</span>
                                            
                                            <div>
                                                <Label htmlFor={`cat-diaria-${empresa.id}`} className="text-xs">Categoria para Diárias / Coberturas</Label>
                                                {empresa.categories && empresa.categories.length > 0 ? (
                                                    <select
                                                        id={`cat-diaria-${empresa.id}`}
                                                        value={formData.categoriaDiariaId}
                                                        onChange={e => {
                                                            const selected = empresa.categories.find((c: any) => c.id === e.target.value)
                                                            setFormData({
                                                                ...formData,
                                                                categoriaDiariaId: e.target.value,
                                                                categoriaDiariaNome: selected ? (selected.name || selected.nome) : ""
                                                            })
                                                        }}
                                                        className="w-full text-xs h-8 border rounded-md px-2 bg-white"
                                                    >
                                                        <option value="">Selecione a Categoria no Conta Azul...</option>
                                                        {empresa.categories.map((c: any) => (
                                                            <option key={c.id} value={c.id}>{c.name || c.nome || c.descricao || c.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={`cat-diaria-${empresa.id}`}
                                                        value={formData.categoriaDiariaId}
                                                        onChange={e => setFormData({ ...formData, categoriaDiariaId: e.target.value })}
                                                        placeholder="ID da Categoria de Diárias no Conta Azul"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor={`cat-reembolso-${empresa.id}`} className="text-xs">Categoria para Reembolsos</Label>
                                                {empresa.categories && empresa.categories.length > 0 ? (
                                                    <select
                                                        id={`cat-reembolso-${empresa.id}`}
                                                        value={formData.categoriaReembolsoId}
                                                        onChange={e => {
                                                            const selected = empresa.categories.find((c: any) => c.id === e.target.value)
                                                            setFormData({
                                                                ...formData,
                                                                categoriaReembolsoId: e.target.value,
                                                                categoriaReembolsoNome: selected ? (selected.name || selected.nome) : ""
                                                            })
                                                        }}
                                                        className="w-full text-xs h-8 border rounded-md px-2 bg-white"
                                                    >
                                                        <option value="">Selecione a Categoria no Conta Azul...</option>
                                                        {empresa.categories.map((c: any) => (
                                                            <option key={c.id} value={c.id}>{c.name || c.nome || c.descricao || c.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={`cat-reembolso-${empresa.id}`}
                                                        value={formData.categoriaReembolsoId}
                                                        onChange={e => setFormData({ ...formData, categoriaReembolsoId: e.target.value })}
                                                        placeholder="ID da Categoria de Reembolso no Conta Azul"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor={`cat-adiantamento-${empresa.id}`} className="text-xs">Categoria para Adiantamentos</Label>
                                                {empresa.categories && empresa.categories.length > 0 ? (
                                                    <select
                                                        id={`cat-adiantamento-${empresa.id}`}
                                                        value={formData.categoriaAdiantamentoId}
                                                        onChange={e => {
                                                            const selected = empresa.categories.find((c: any) => c.id === e.target.value)
                                                            setFormData({
                                                                ...formData,
                                                                categoriaAdiantamentoId: e.target.value,
                                                                categoriaAdiantamentoNome: selected ? (selected.name || selected.nome) : ""
                                                            })
                                                        }}
                                                        className="w-full text-xs h-8 border rounded-md px-2 bg-white"
                                                    >
                                                        <option value="">Selecione a Categoria no Conta Azul...</option>
                                                        {empresa.categories.map((c: any) => (
                                                            <option key={c.id} value={c.id}>{c.name || c.nome || c.descricao || c.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={`cat-adiantamento-${empresa.id}`}
                                                        value={formData.categoriaAdiantamentoId}
                                                        onChange={e => setFormData({ ...formData, categoriaAdiantamentoId: e.target.value })}
                                                        placeholder="ID da Categoria de Adiantamento no Conta Azul"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Centro de Custo e Conta Financeira */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sky-100">
                                            <div>
                                                <Label htmlFor={`centro-custo-${empresa.id}`} className="text-xs">Centro de Custo Padrão</Label>
                                                {empresa.costCenters && empresa.costCenters.length > 0 ? (
                                                    <select
                                                        id={`centro-custo-${empresa.id}`}
                                                        value={formData.centroCustoPadraoId}
                                                        onChange={e => {
                                                            const selected = empresa.costCenters.find((cc: any) => cc.id === e.target.value)
                                                            setFormData({
                                                                ...formData,
                                                                centroCustoPadraoId: e.target.value,
                                                                centroCustoPadraoNome: selected ? (selected.name || selected.nome) : ""
                                                            })
                                                        }}
                                                        className="w-full text-xs h-8 border rounded-md px-2 bg-white"
                                                    >
                                                        <option value="">(Opcional) Selecione...</option>
                                                        {empresa.costCenters.map((cc: any) => (
                                                            <option key={cc.id} value={cc.id}>{cc.name || cc.nome || cc.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={`centro-custo-${empresa.id}`}
                                                        value={formData.centroCustoPadraoId}
                                                        onChange={e => setFormData({ ...formData, centroCustoPadraoId: e.target.value })}
                                                        placeholder="ID Centro de Custo"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor={`conta-banco-${empresa.id}`} className="text-xs">Conta Bancária / Financeira</Label>
                                                {empresa.bankAccounts && empresa.bankAccounts.length > 0 ? (
                                                    <select
                                                        id={`conta-banco-${empresa.id}`}
                                                        value={formData.contaFinanceiraPadraoId}
                                                        onChange={e => {
                                                            const selected = empresa.bankAccounts.find((ba: any) => ba.id === e.target.value)
                                                            setFormData({
                                                                ...formData,
                                                                contaFinanceiraPadraoId: e.target.value,
                                                                contaFinanceiraPadraoNome: selected ? (selected.name || selected.nome) : ""
                                                            })
                                                        }}
                                                        className="w-full text-xs h-8 border rounded-md px-2 bg-white"
                                                    >
                                                        <option value="">(Opcional) Selecione...</option>
                                                        {empresa.bankAccounts.map((ba: any) => (
                                                            <option key={ba.id} value={ba.id}>{ba.name || ba.nome || ba.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={`conta-banco-${empresa.id}`}
                                                        value={formData.contaFinanceiraPadraoId}
                                                        onChange={e => setFormData({ ...formData, contaFinanceiraPadraoId: e.target.value })}
                                                        placeholder="ID Conta Bancária"
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Switches de Automação */}
                                        <div className="space-y-2 pt-2 border-t border-sky-100">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`auto-criar-${empresa.id}`} className="text-xs">Criar Contas a Pagar ao Aprovar</Label>
                                                <Switch
                                                    id={`auto-criar-${empresa.id}`}
                                                    checked={formData.autoCriarAoAprovar}
                                                    onCheckedChange={c => setFormData({ ...formData, autoCriarAoAprovar: c })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`ativo-${empresa.id}`} className="text-xs">Integração Ativa</Label>
                                                <Switch
                                                    id={`ativo-${empresa.id}`}
                                                    checked={formData.ativo}
                                                    onCheckedChange={c => setFormData({ ...formData, ativo: c })}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingEmpresaId(null)}>Cancelar</Button>
                                            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" disabled={isSaving} onClick={() => handleSaveEmpresa(empresa.id)}>
                                                {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null} Salvar Configurações
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="text-slate-400 font-medium block">Categoria Diárias:</span>
                                                <span className="font-semibold text-slate-800 truncate block">
                                                    {empresa.config?.categoriaDiariaNome || empresa.config?.categoriaDiariaId || "Não configurada"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="text-slate-400 font-medium block">Categoria Reembolsos:</span>
                                                <span className="font-semibold text-slate-800 truncate block">
                                                    {empresa.config?.categoriaReembolsoNome || empresa.config?.categoriaReembolsoId || "Não configurada"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="text-slate-400 font-medium block">Categoria Adiantamentos:</span>
                                                <span className="font-semibold text-slate-800 truncate block">
                                                    {empresa.config?.categoriaAdiantamentoNome || empresa.config?.categoriaAdiantamentoId || "Não configurada"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="text-slate-400 font-medium block">Envio Automático:</span>
                                                <span className={`font-semibold ${empresa.config?.autoCriarAoAprovar !== false ? "text-emerald-600" : "text-slate-500"}`}>
                                                    {empresa.config?.autoCriarAoAprovar !== false ? "Ativado na Aprovação" : "Desativado"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {!isEditing && (
                                <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
                                    <Button size="sm" variant="outline" onClick={() => startEditing(empresa)} className="text-xs font-semibold text-slate-700">
                                        <Pencil className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Configurar Mapeamentos & Categorias
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
