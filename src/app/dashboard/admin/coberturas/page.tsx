"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Search, Filter, Download, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"

interface Item {
    id: string
    data: string
    status: string
    valor: string
    posto: { nome: string }
    diarista: { nome: string }
    reserva?: { nome: string }
    motivo: { descricao: string }
    supervisor: { nome: string }
    aprovador?: { nome: string }
    financeiro?: { nome: string }
    createdAt: string
    dataAprovacao?: string
    dataPagamento?: string
}

export default function AdminCoberturasPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Date Filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const [status, setStatus] = useState("ALL")

    // New Filters State
    const [filters, setFilters] = useState({
        diaristaId: "ALL",
        postoId: "ALL",
        reservaId: "ALL",
        motivoId: "ALL",
        supervisorId: "ALL"
    })

    const [editingItem, setEditingItem] = useState<Item | null>(null)
    const [editForm, setEditForm] = useState({
        data: "",
        postoId: "",
        empresaId: "",
        diaristaId: "",
        reservaId: "",
        motivoId: "",
        valor: ""
    })
    const [saving, setSaving] = useState(false)

    const [options, setOptions] = useState({
        postos: [],
        diaristas: [],
        motivos: [],
        reservas: [],
        supervisores: [],
        empresas: []
    })

    useEffect(() => {
        fetchOptions()
        fetchItems()
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) setOptions(await res.json())
        } catch (e) {
            console.error("Failed to load options")
        }
    }

    const fetchItems = async () => {
        setLoading(true)
        try {
            let url = "/api/admin/coberturas"
            const params = new URLSearchParams()

            if (startDate && endDate) {
                params.append("start", startDate)
                params.append("end", endDate)
            }

            if (status && status !== "ALL") params.append("status", status)
            if (filters.diaristaId !== "ALL") params.append("diaristaId", filters.diaristaId)
            if (filters.postoId !== "ALL") params.append("postoId", filters.postoId)
            if (filters.reservaId !== "ALL") params.append("reservaId", filters.reservaId)
            if (filters.motivoId !== "ALL") params.append("motivoId", filters.motivoId)
            if (filters.supervisorId !== "ALL") params.append("supervisorId", filters.supervisorId)

            if (params.toString()) {
                url += `?${params.toString()}`
            }

            const res = await fetch(url)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar coberturas")
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setStartDate("")
        setEndDate("")
        setStatus("ALL")
        setFilters({
            diaristaId: "ALL",
            postoId: "ALL",
            reservaId: "ALL",
            motivoId: "ALL",
            supervisorId: "ALL"
        })
        fetchItems()
        window.location.reload()
    }

    const filteredItems = items.filter(item =>
        item.diarista.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.posto.nome.toLowerCase().includes(search.toLowerCase()) ||
        (item.reserva?.nome && item.reserva.nome.toLowerCase().includes(search.toLowerCase()))
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>
            case 'APROVADO': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aprovado</Badge>
            case 'PAGO': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>
            case 'REPROVADO': return <Badge variant="destructive">Reprovado</Badge>
            case 'AJUSTE': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Ajuste</Badge>
            case 'CANCELADO': return <Badge variant="secondary">Cancelado</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return null
        try {
            return new Date(dateStr).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            })
        } catch { return dateStr }
    }

    const handleEdit = (item: Item) => {
        setEditingItem(item)
        let formattedDate = ""
        try {
            formattedDate = item.data ? new Date(item.data).toISOString().split('T')[0] : ""
        } catch (e) { console.error("Bad date", e) }

        setEditForm({
            data: formattedDate,
            postoId: (item as any).postoId || "",
            empresaId: (item as any).empresaId || "",
            diaristaId: (item as any).diaristaId || "",
            reservaId: (item as any).reservaId || "",
            motivoId: (item as any).motivoId || "",
            valor: String(item.valor || "")
        })
    }

    const saveEdit = async () => {
        if (!editingItem) return
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/coberturas/${editingItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: editForm.data,
                    postoId: editForm.postoId,
                    empresaId: editForm.empresaId === "NULL" ? null : editForm.empresaId,
                    diaristaId: editForm.diaristaId,
                    reservaId: editForm.reservaId,
                    motivoId: editForm.motivoId,
                    valor: Number(editForm.valor)
                })
            })

            if (!res.ok) throw new Error()
            toast.success("Cobertura atualizada com sucesso!")
            setEditingItem(null)
            fetchItems()
        } catch {
            toast.error("Erro ao salvar alterações")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Todas as Coberturas</h1>
                    <p className="text-muted-foreground">Visão geral de todos os lançamentos do sistema.</p>
                </div>
            </div>

            <Card>
                <div className="flex flex-col gap-4 p-6">
                    {/* New Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Select value={filters.diaristaId} onValueChange={(v) => setFilters(prev => ({ ...prev, diaristaId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Diarista" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas Diaristas</SelectItem>
                                {options.diaristas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.reservaId} onValueChange={(v) => setFilters(prev => ({ ...prev, reservaId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Colaboradores</SelectItem>
                                {options.reservas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.motivoId} onValueChange={(v) => setFilters(prev => ({ ...prev, motivoId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Motivos</SelectItem>
                                {options.motivos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.postoId} onValueChange={(v) => setFilters(prev => ({ ...prev, postoId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Posto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Postos</SelectItem>
                                {options.postos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.supervisorId} onValueChange={(v) => setFilters(prev => ({ ...prev, supervisorId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Supervisores</SelectItem>
                                {options.supervisores.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Existing Date/Status/Search Row */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 max-w-sm w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por texto..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <Input
                                type="date"
                                className="w-[150px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="date"
                                className="w-[150px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Status: Todos</SelectItem>
                                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                                    <SelectItem value="PAGO">Pago</SelectItem>
                                    <SelectItem value="REPROVADO">Reprovado</SelectItem>
                                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={fetchItems} disabled={loading}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                            <Button variant="ghost" onClick={clearFilters}>
                                Limpar
                            </Button>
                            <Button variant="outline" onClick={() => {
                                const params = new URLSearchParams()
                                if (startDate && endDate) {
                                    params.append("start", startDate)
                                    params.append("end", endDate)
                                }
                                if (status && status !== "ALL") params.append("status", status)
                                if (filters.diaristaId !== "ALL") params.append("diaristaId", filters.diaristaId)
                                if (filters.postoId !== "ALL") params.append("postoId", filters.postoId)
                                if (filters.reservaId !== "ALL") params.append("reservaId", filters.reservaId)
                                if (filters.motivoId !== "ALL") params.append("motivoId", filters.motivoId)
                                if (filters.supervisorId !== "ALL") params.append("supervisorId", filters.supervisorId)

                                window.open(`/api/finance/export?${params.toString()}`, '_blank')
                            }}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Excel
                            </Button>
                        </div>
                    </div>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Posto</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Diarista</TableHead>
                                    <TableHead>Quem Faltou</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Solicitante (Criado)</TableHead>
                                    <TableHead>Fluxo (Aprov/Baixa)</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{new Date(item.data).toLocaleDateString()}</TableCell>
                                        <TableCell>{item.posto.nome}</TableCell>
                                        <TableCell className="text-muted-foreground">{(item as any).empresa?.nome || '-'}</TableCell>
                                        <TableCell className="font-medium">{item.diarista.nome}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.reserva?.nome || '-'}</TableCell>
                                        <TableCell>{item.motivo.descricao}</TableCell>
                                        <TableCell>{formatCurrency(item.valor)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                {getStatusBadge(item.status)}
                                                {item.status === 'PAGO' && item.dataPagamento && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Pago: {formatDateTime(item.dataPagamento)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium">{item.supervisor.nome}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Criado: {formatDateTime(item.createdAt)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {item.aprovador && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-muted-foreground">Aprov: {item.aprovador.nome}</span>
                                                        <span className="text-[10px] text-muted-foreground">{formatDateTime(item.dataAprovacao)}</span>
                                                    </div>
                                                )}
                                                {item.financeiro && item.status === 'PAGO' && (
                                                    <div className="flex flex-col mt-1">
                                                        <span className="text-[10px] text-muted-foreground">Baixa: {item.financeiro.nome}</span>
                                                    </div>
                                                )}
                                                {!item.aprovador && !item.financeiro && <span className="text-muted-foreground text-xs">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                                    <TableCell className="font-bold">
                                        {formatCurrency(filteredItems.reduce((acc, item) => acc + Number(item.valor), 0))}
                                    </TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
