"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Pencil, Trash2, Loader2, Save, Sparkles, Building2, CheckCircle2, AlertCircle, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Posto {
    id: string
    nome: string
    ativo: boolean
    centroCustoContaAzulId?: string | null
    centroCustoContaAzulNome?: string | null
}

export default function PostosPage() {
    const [postos, setPostos] = useState<Posto[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Centros de Custo Conta Azul
    const [centrosCusto, setCentrosCusto] = useState<any[]>([])
    const [loadingCc, setLoadingCc] = useState(false)
    const [autoLinking, setAutoLinking] = useState(false)

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPosto, setEditingPosto] = useState<Posto | null>(null)
    const [formData, setFormData] = useState({
        nome: "",
        ativo: true,
        centroCustoContaAzulId: "",
        centroCustoContaAzulNome: ""
    })
    const [saving, setSaving] = useState(false)
    const [ccSearch, setCcSearch] = useState("")

    useEffect(() => {
        fetchPostos()
        fetchCentrosCusto()
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

    const fetchCentrosCusto = async () => {
        setLoadingCc(true)
        try {
            // Busca empresa conectada
            const cfgRes = await fetch("/api/contaazul/config")
            const configs = await cfgRes.json()
            const connected = Array.isArray(configs) ? configs.find(c => c.isConnected) : null

            if (connected) {
                const optRes = await fetch(`/api/contaazul/options?empresaId=${connected.id}`)
                const optData = await optRes.json()
                if (optData.success && Array.isArray(optData.centrosCusto)) {
                    setCentrosCusto(optData.centrosCusto)
                }
            }
        } catch (error) {
            console.error("Erro ao carregar centros de custo do Conta Azul", error)
        } finally {
            setLoadingCc(false)
        }
    }

    const handleAutoLink = async () => {
        setAutoLinking(true)
        try {
            const res = await fetch("/api/admin/postos/auto-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`🎉 ${data.vinculados} postos vinculados automaticamente aos Centros de Custo do Conta Azul!`)
                fetchPostos()
            } else {
                toast.error(data.error || "Erro ao vincular centros de custo.")
            }
        } catch {
            toast.error("Erro de conexão ao executar auto-vinculação.")
        } finally {
            setAutoLinking(false)
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
                toast.success("Posto atualizado com sucesso!")
            } else {
                // Create
                const res = await fetch("/api/admin/postos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error()
                toast.success("Posto criado com sucesso!")
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
        setFormData({
            nome: "",
            ativo: true,
            centroCustoContaAzulId: "",
            centroCustoContaAzulNome: ""
        })
        setCcSearch("")
        setIsDialogOpen(true)
    }

    const openEdit = (posto: Posto) => {
        setEditingPosto(posto)
        setFormData({
            nome: posto.nome,
            ativo: posto.ativo,
            centroCustoContaAzulId: posto.centroCustoContaAzulId || "",
            centroCustoContaAzulNome: posto.centroCustoContaAzulNome || ""
        })
        setCcSearch("")
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

    const [filterVinculo, setFilterVinculo] = useState<"TODOS" | "VINCULADOS" | "SEM_VINCULO">("TODOS")

    const filteredPostos = postos.filter(p => {
        const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.centroCustoContaAzulNome && p.centroCustoContaAzulNome.toLowerCase().includes(searchTerm.toLowerCase()))
        
        if (!matchesSearch) return false

        if (filterVinculo === "VINCULADOS") return !!p.centroCustoContaAzulId
        if (filterVinculo === "SEM_VINCULO") return !p.centroCustoContaAzulId
        return true
    })

    const filteredCentrosCusto = centrosCusto.filter(cc =>
        cc.nome.toLowerCase().includes(ccSearch.toLowerCase()) ||
        (cc.codigo && cc.codigo.toLowerCase().includes(ccSearch.toLowerCase()))
    )

    const postosVinculadosCount = postos.filter(p => !!p.centroCustoContaAzulId).length

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Postos de Trabalho</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gerencie as unidades e seus respectivos <strong>Centros de Custo no Conta Azul</strong> para alocação financeira automática.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleAutoLink}
                        disabled={autoLinking}
                        className="border-sky-300 text-sky-700 hover:bg-sky-50 shadow-sm"
                    >
                        {autoLinking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4 text-sky-600" />
                        )}
                        Auto-Vincular Centros de Custo
                    </Button>
                    <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Novo Posto
                    </Button>
                </div>
            </div>

            {/* Card de Estatísticas de Vínculo (Clicáveis como filtro) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    onClick={() => setFilterVinculo("TODOS")}
                    className={`border shadow-sm transition-all cursor-pointer ${filterVinculo === "TODOS" ? "ring-2 ring-slate-900 border-slate-900 bg-slate-50/80" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Postos</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{postos.length}</p>
                        </div>
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                            <Building2 className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setFilterVinculo("VINCULADOS")}
                    className={`border shadow-sm transition-all cursor-pointer ${filterVinculo === "VINCULADOS" ? "ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/80" : "border-emerald-200 hover:border-emerald-300 bg-white"}`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Vinculados ao Conta Azul</p>
                            <p className="text-2xl font-black text-emerald-700 mt-1">{postosVinculadosCount}</p>
                        </div>
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setFilterVinculo("SEM_VINCULO")}
                    className={`border shadow-sm transition-all cursor-pointer ${filterVinculo === "SEM_VINCULO" ? "ring-2 ring-amber-600 border-amber-600 bg-amber-50/80" : "border-amber-200 hover:border-amber-300 bg-white"}`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sem Centro de Custo</p>
                            <p className="text-2xl font-black text-amber-700 mt-1">{postos.length - postosVinculadosCount}</p>
                        </div>
                        <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold text-slate-800">Lista de Postos</CardTitle>
                            {filterVinculo !== "TODOS" && (
                                <Badge variant="secondary" className="text-xs">
                                    {filterVinculo === "VINCULADOS" ? "Filtrado: Apenas Vinculados" : "Filtrado: Apenas Sem Vínculo"}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por posto ou centro de custo..."
                                    className="pl-9 w-full sm:w-80 bg-slate-50 focus:bg-white text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700">Posto de Trabalho</TableHead>
                                    <TableHead className="font-bold text-slate-700">Centro de Custo (Conta Azul)</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-700">Status</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPostos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                            Nenhum posto encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredPostos.map((posto) => (
                                    <TableRow key={posto.id} className="hover:bg-slate-50/80 transition-colors">
                                        <TableCell className="font-semibold text-slate-900">
                                            {posto.nome}
                                        </TableCell>
                                        <TableCell>
                                            {posto.centroCustoContaAzulNome ? (
                                                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 font-semibold gap-1.5 py-1">
                                                    <Building2 className="h-3.5 w-3.5 text-sky-600" />
                                                    {posto.centroCustoContaAzulNome}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 font-medium">
                                                    (Não vinculado)
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${posto.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {posto.ativo ? 'Ativo' : 'Inativo'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(posto)} className="hover:bg-sky-50 text-sky-700">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deletePosto(posto.id)} className="hover:bg-rose-50 text-rose-600">
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

            {/* Dialog de Criação / Edição */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {editingPosto ? "Editar Posto de Trabalho" : "Novo Posto de Trabalho"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Configure o nome do posto e selecione o Centro de Custo correspondente no Conta Azul.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nome" className="text-xs font-bold text-slate-700">Nome do Posto *</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Ex: Shopping Iguatemi, MJV Tecnologia..."
                                className="h-10 text-sm"
                                required
                            />
                        </div>

                        {/* Seletor de Centro de Custo Conta Azul */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-700">
                                    Centro de Custo no Conta Azul
                                </Label>
                                {formData.centroCustoContaAzulId && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, centroCustoContaAzulId: "", centroCustoContaAzulNome: "" })}
                                        className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5"
                                    >
                                        <X className="h-3 w-3" /> Limpar
                                    </button>
                                )}
                            </div>

                            {/* Campo de Busca do Centro de Custo */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    placeholder="Digitar para filtrar centros de custo..."
                                    value={ccSearch}
                                    onChange={(e) => setCcSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs bg-slate-50"
                                />
                            </div>

                            {/* Lista de Seleção */}
                            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                                {centrosCusto.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                        {loadingCc ? "Carregando centros de custo..." : "Nenhum centro de custo carregado do Conta Azul."}
                                    </div>
                                ) : filteredCentrosCusto.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                        Nenhum centro de custo encontrado com &quot;{ccSearch}&quot;.
                                    </div>
                                ) : (
                                    filteredCentrosCusto.map((cc: any) => {
                                        const isSelected = formData.centroCustoContaAzulId === cc.id
                                        return (
                                            <div
                                                key={cc.id}
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        centroCustoContaAzulId: cc.id,
                                                        centroCustoContaAzulNome: cc.nome
                                                    })
                                                }}
                                                className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "bg-sky-50 text-sky-900 font-bold" : "hover:bg-slate-50 text-slate-700"}`}
                                            >
                                                <span>{cc.nome}</span>
                                                {isSelected && <CheckCircle2 className="h-4 w-4 text-sky-600" />}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            {formData.centroCustoContaAzulNome && (
                                <p className="text-[11px] text-sky-700 font-medium bg-sky-50 p-2 rounded-md border border-sky-200">
                                    ✓ Selecionado: <strong>{formData.centroCustoContaAzulNome}</strong>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <Label htmlFor="ativo" className="text-xs font-bold text-slate-700">Posto Ativo</Label>
                            <Switch
                                id="ativo"
                                checked={formData.ativo}
                                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Posto
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
