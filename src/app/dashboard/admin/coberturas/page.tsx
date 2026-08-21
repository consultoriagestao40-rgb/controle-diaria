"use client"

import { useState, useEffect, useMemo } from "react"
import {
    ArrowLeft,
    Loader2,
    Search,
    Filter,
    Download,
    Pencil,
    Trash,
    Receipt,
    Clock,
    CheckCircle,
    CheckCircle2,
    DollarSign,
    XCircle,
    RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"
import Link from "next/link"

interface Item {
    id: string
    data: string
    status: string
    valor: string
    posto: { nome: string }
    diarista: { nome: string }
    ponto?: {
        id: string
        status: string
        checkInAt: string
        checkOutAt: string | null
        latitude: number | null
        longitude: number | null
    } | null
    reserva?: { nome: string }
    motivo: { descricao: string }
    observacao?: string
    supervisor: { nome: string }
    aprovadorN1?: { nome: string }
    dataAprovacaoN1?: string
    justificativaAprovacaoN1?: string
    aprovador?: { nome: string }
    financeiro?: { nome: string }
    createdAt: string
    dataAprovacao?: string
    dataPagamento?: string
}

export default function AdminCoberturasPage() {
    const [isAdmin, setIsAdmin] = useState(false)
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Date Filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const [status, setStatus] = useState("ALL")

    // Filter selects state
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
        fetch("/api/auth/session").then(res => res.json()).then((session: any) => {
            if (session?.user?.role === 'ADMIN') {
                setIsAdmin(true)
            }
        }).catch(() => { })
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) setOptions(await res.json())
        } catch (e) {
            console.error("Failed to load options", e)
        }
    }

    const fetchItems = async () => {
        setLoading(true)
        try {
            let url = "/api/admin/coberturas"
            const params = new URLSearchParams()

            if (startDate) {
                params.append("start", startDate)
            }
            if (endDate) {
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
        setSearch("")
        setFilters({
            diaristaId: "ALL",
            postoId: "ALL",
            reservaId: "ALL",
            motivoId: "ALL",
            supervisorId: "ALL"
        })
        fetchItems()
    }

    const filteredItems = useMemo(() => {
        const term = search.toLowerCase()
        return items.filter(item => {
            if (!term) return true
            return (
                (item.diarista?.nome && item.diarista.nome.toLowerCase().includes(term)) ||
                (item.posto?.nome && item.posto.nome.toLowerCase().includes(term)) ||
                (item.reserva?.nome && item.reserva.nome.toLowerCase().includes(term)) ||
                (item.supervisor?.nome && item.supervisor.nome.toLowerCase().includes(term)) ||
                (item.motivo?.descricao && item.motivo.descricao.toLowerCase().includes(term)) ||
                ((item as any).empresa?.nome && (item as any).empresa.nome.toLowerCase().includes(term))
            )
        })
    }, [items, search])

    // KPI Metrics based on filtered items
    const metrics = useMemo(() => {
        let totalCount = filteredItems.length
        let totalValue = 0

        let pendenteCount = 0
        let pendenteValue = 0

        let aprovadoN1Count = 0
        let aprovadoN1Value = 0

        let aprovadoCount = 0
        let aprovadoValue = 0

        let pagoCount = 0
        let pagoValue = 0

        let reprovadoCount = 0
        let reprovadoValue = 0

        for (const item of filteredItems) {
            const val = Number(item.valor || 0)
            totalValue += val

            if (item.status === 'PENDENTE') {
                pendenteCount++
                pendenteValue += val
            } else if (item.status === 'APROVADO_N1') {
                aprovadoN1Count++
                aprovadoN1Value += val
            } else if (item.status === 'APROVADO') {
                aprovadoCount++
                aprovadoValue += val
            } else if (item.status === 'PAGO') {
                pagoCount++
                pagoValue += val
            } else if (item.status === 'REPROVADO') {
                reprovadoCount++
                reprovadoValue += val
            }
        }

        return {
            totalCount,
            totalValue,
            pendenteCount,
            pendenteValue,
            aprovadoN1Count,
            aprovadoN1Value,
            aprovadoCount,
            aprovadoValue,
            pagoCount,
            pagoValue,
            reprovadoCount,
            reprovadoValue
        }
    }, [filteredItems])

    const getStatusBadge = (itemStatus: string) => {
        switch (itemStatus) {
            case 'PENDENTE':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold text-[11px]">Pendente</Badge>
            case 'APROVADO_N1':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-[11px]">Aprovado N1</Badge>
            case 'APROVADO':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[11px]">Aprovado</Badge>
            case 'PAGO':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-[11px]">Pago</Badge>
            case 'REPROVADO':
                return <Badge variant="destructive" className="font-semibold text-[11px]">Reprovado</Badge>
            case 'AJUSTE':
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold text-[11px]">Ajuste</Badge>
            case 'CANCELADO':
                return <Badge variant="secondary" className="font-semibold text-[11px]">Cancelado</Badge>
            default:
                return <Badge variant="outline" className="text-[11px]">{itemStatus}</Badge>
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

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja EXCLUIR este lançamento? Esta ação não pode ser desfeita.")) return

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/coberturas/${id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error()
            toast.success("Lançamento excluído com sucesso")
            fetchItems()
        } catch {
            toast.error("Erro ao excluir lançamento")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-20 max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white shadow-xs">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Todas as Coberturas
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Visão analítica e operacional de todos os plantões do sistema.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            const params = new URLSearchParams()
                            if (startDate) params.append("start", startDate)
                            if (endDate) params.append("end", endDate)
                            if (status && status !== "ALL") params.append("status", status)
                            if (filters.diaristaId !== "ALL") params.append("diaristaId", filters.diaristaId)
                            if (filters.postoId !== "ALL") params.append("postoId", filters.postoId)
                            if (filters.reservaId !== "ALL") params.append("reservaId", filters.reservaId)
                            if (filters.motivoId !== "ALL") params.append("motivoId", filters.motivoId)
                            if (filters.supervisorId !== "ALL") params.append("supervisorId", filters.supervisorId)

                            window.open(`/api/finance/export?${params.toString()}`, '_blank')
                        }}
                        className="h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs shadow-xs"
                    >
                        <Download className="mr-2 h-4 w-4 text-emerald-600" />
                        Exportar Excel
                    </Button>
                </div>
            </div>

            {/* KPI Summary Totalizer Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {/* Total Geral */}
                <div
                    onClick={() => {
                        setStatus("ALL")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-slate-300",
                        status === "ALL" ? "ring-2 ring-primary/20 border-primary bg-primary/5" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Filtrado</span>
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Receipt className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {formatCurrency(metrics.totalValue)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                            {metrics.totalCount} {metrics.totalCount === 1 ? 'lançamento' : 'lançamentos'}
                        </div>
                    </div>
                </div>

                {/* Pendentes */}
                <div
                    onClick={() => {
                        setStatus(status === "PENDENTE" ? "ALL" : "PENDENTE")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-yellow-300",
                        status === "PENDENTE" ? "ring-2 ring-yellow-400/30 border-yellow-400 bg-yellow-50/50" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-yellow-700 uppercase tracking-wider">Pendentes</span>
                        <div className="h-7 w-7 rounded-lg bg-yellow-100/80 text-yellow-700 flex items-center justify-center">
                            <Clock className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-yellow-800 tracking-tight">
                            {formatCurrency(metrics.pendenteValue)}
                        </div>
                        <div className="text-[11px] font-semibold text-yellow-700/80">
                            {metrics.pendenteCount} {metrics.pendenteCount === 1 ? 'diária' : 'diárias'}
                        </div>
                    </div>
                </div>

                {/* Aprovados N1 */}
                <div
                    onClick={() => {
                        setStatus(status === "APROVADO_N1" ? "ALL" : "APROVADO_N1")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-amber-300",
                        status === "APROVADO_N1" ? "ring-2 ring-amber-400/30 border-amber-400 bg-amber-50/50" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Aprovados N1</span>
                        <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                            <CheckCircle className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-amber-800 tracking-tight">
                            {formatCurrency(metrics.aprovadoN1Value)}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-700/80">
                            {metrics.aprovadoN1Count} {metrics.aprovadoN1Count === 1 ? 'diária' : 'diárias'}
                        </div>
                    </div>
                </div>

                {/* Aprovados Final (N2) */}
                <div
                    onClick={() => {
                        setStatus(status === "APROVADO" ? "ALL" : "APROVADO")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-blue-300",
                        status === "APROVADO" ? "ring-2 ring-blue-400/30 border-blue-400 bg-blue-50/50" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Aprovados (N2)</span>
                        <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-blue-800 tracking-tight">
                            {formatCurrency(metrics.aprovadoValue)}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-700/80">
                            {metrics.aprovadoCount} {metrics.aprovadoCount === 1 ? 'diária' : 'diárias'}
                        </div>
                    </div>
                </div>

                {/* Total Pago */}
                <div
                    onClick={() => {
                        setStatus(status === "PAGO" ? "ALL" : "PAGO")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-emerald-300",
                        status === "PAGO" ? "ring-2 ring-emerald-400/30 border-emerald-400 bg-emerald-50/50" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Total Pago</span>
                        <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <DollarSign className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-emerald-800 tracking-tight">
                            {formatCurrency(metrics.pagoValue)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700/80">
                            {metrics.pagoCount} {metrics.pagoCount === 1 ? 'pago' : 'pagos'}
                        </div>
                    </div>
                </div>

                {/* Reprovados */}
                <div
                    onClick={() => {
                        setStatus(status === "REPROVADO" ? "ALL" : "REPROVADO")
                    }}
                    className={cn(
                        "bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-red-300",
                        status === "REPROVADO" ? "ring-2 ring-red-400/30 border-red-400 bg-red-50/50" : "border-slate-200/80"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Reprovados</span>
                        <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                            <XCircle className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black text-rose-800 tracking-tight">
                            {formatCurrency(metrics.reprovadoValue)}
                        </div>
                        <div className="text-[11px] font-semibold text-rose-700/80">
                            {metrics.reprovadoCount} {metrics.reprovadoCount === 1 ? 'item' : 'itens'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Control Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs space-y-4">
                {/* Selectors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Diarista */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Diarista</label>
                        <Select value={filters.diaristaId} onValueChange={(v) => setFilters(prev => ({ ...prev, diaristaId: v }))}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Todas Diaristas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas Diaristas</SelectItem>
                                {options.diaristas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Colaborador */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Quem Faltou</label>
                        <Select value={filters.reservaId} onValueChange={(v) => setFilters(prev => ({ ...prev, reservaId: v }))}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Todos Colaboradores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Colaboradores</SelectItem>
                                {options.reservas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Motivo */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Motivo</label>
                        <Select value={filters.motivoId} onValueChange={(v) => setFilters(prev => ({ ...prev, motivoId: v }))}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Todos Motivos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Motivos</SelectItem>
                                {options.motivos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Posto */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Posto de Trabalho</label>
                        <Select value={filters.postoId} onValueChange={(v) => setFilters(prev => ({ ...prev, postoId: v }))}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Todos Postos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Postos</SelectItem>
                                {options.postos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Supervisor */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Supervisor</label>
                        <Select value={filters.supervisorId} onValueChange={(v) => setFilters(prev => ({ ...prev, supervisorId: v }))}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Todos Supervisores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Supervisores</SelectItem>
                                {options.supervisores.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Second Row: Search, Date Range, Status, Action buttons */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between pt-2 border-t border-slate-100">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar posto, diarista, empresa..."
                            className="h-10 pl-10 rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700 placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Calendário Início e Fim */}
                        <div className="flex items-center gap-1.5">
                            <DatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Início"
                                variant="compact"
                                className="w-[125px] h-10"
                            />
                            <span className="text-slate-400 text-xs font-bold">-</span>
                            <DatePicker
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="Fim"
                                variant="compact"
                                className="w-[125px] h-10"
                            />
                        </div>

                        {/* Status Select */}
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-10 w-[150px] rounded-xl bg-slate-50/70 border-slate-200 font-semibold text-xs text-slate-700">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Status: Todos</SelectItem>
                                <SelectItem value="PENDENTE">Pendente</SelectItem>
                                <SelectItem value="APROVADO_N1">Aprovado N1</SelectItem>
                                <SelectItem value="APROVADO">Aprovado (N2)</SelectItem>
                                <SelectItem value="PAGO">Pago</SelectItem>
                                <SelectItem value="REPROVADO">Reprovado</SelectItem>
                                <SelectItem value="AJUSTE">Ajuste</SelectItem>
                                <SelectItem value="CANCELADO">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={fetchItems} disabled={loading} className="h-10 px-4 rounded-xl font-bold text-xs">
                            <Filter className="mr-1.5 h-3.5 w-3.5" />
                            Filtrar
                        </Button>

                        <Button variant="ghost" onClick={clearFilters} className="h-10 px-3 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100">
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Limpar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modern Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando lançamentos...</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                        <p className="text-base font-bold text-slate-700">Nenhum registro encontrado</p>
                        <p className="text-xs text-slate-400">Tente ajustar os filtros ou o período selecionado.</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                                    <th className="py-3.5 px-4">Data</th>
                                    <th className="py-3.5 px-4 min-w-[160px]">Posto</th>
                                    <th className="py-3.5 px-4 min-w-[140px]">Empresa</th>
                                    <th className="py-3.5 px-4 min-w-[150px]">Diarista</th>
                                    <th className="py-3.5 px-4 min-w-[140px]">Quem Faltou</th>
                                    <th className="py-3.5 px-4 min-w-[120px]">Motivo</th>
                                    <th className="py-3.5 px-4 min-w-[180px]">Obs / Justificativa</th>
                                    <th className="py-3.5 px-4 min-w-[100px] text-right">Valor</th>
                                    <th className="py-3.5 px-4 min-w-[110px]">Status</th>
                                    <th className="py-3.5 px-4 min-w-[130px]">Ponto (GPS)</th>
                                    <th className="py-3.5 px-4 min-w-[130px]">Solicitante</th>
                                    <th className="py-3.5 px-4 min-w-[120px]">Aprovador N1</th>
                                    <th className="py-3.5 px-4 min-w-[120px]">Aprov. Final</th>
                                    {isAdmin && <th className="py-3.5 px-4 w-20 text-center">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Data */}
                                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                            {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                        </td>

                                        {/* Posto */}
                                        <td className="py-3 px-4 font-bold text-slate-800">
                                            {item.posto.nome}
                                        </td>

                                        {/* Empresa */}
                                        <td className="py-3 px-4 text-slate-600 font-medium">
                                            {(item as any).empresa?.nome || '-'}
                                        </td>

                                        {/* Diarista */}
                                        <td className="py-3 px-4 font-black text-slate-900">
                                            {item.diarista.nome}
                                        </td>

                                        {/* Quem Faltou */}
                                        <td className="py-3 px-4 text-slate-500 font-medium">
                                            {item.reserva?.nome || '-'}
                                        </td>

                                        {/* Motivo */}
                                        <td className="py-3 px-4 text-slate-700 font-medium">
                                            {item.motivo.descricao}
                                        </td>

                                        {/* Observação */}
                                        <td className="py-3 px-4 max-w-[220px] text-[11px] text-slate-500 break-words leading-snug">
                                            {item.observacao || "-"}
                                        </td>

                                        {/* Valor */}
                                        <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                                            {formatCurrency(item.valor)}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5 items-start">
                                                {getStatusBadge(item.status)}
                                                {item.status === 'PAGO' && item.dataPagamento && (
                                                    <span className="text-[10px] font-semibold text-emerald-600">
                                                        {formatDateTime(item.dataPagamento)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Ponto GPS */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {item.ponto ? (
                                                <div className="flex flex-col gap-0.5 text-xs font-mono">
                                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                        🟢 In: {new Date(item.ponto.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {item.ponto.checkOutAt ? (
                                                        <span className="text-rose-600 font-bold flex items-center gap-1">
                                                            🔴 Out: {new Date(item.ponto.checkOutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 font-bold text-[10px]">
                                                            Em serviço
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">Não batido</span>
                                            )}
                                        </td>

                                        {/* Solicitante */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{item.supervisor.nome}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDateTime(item.createdAt)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Aprovador N1 */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {item.aprovadorN1 ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{item.aprovadorN1.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{formatDateTime(item.dataAprovacaoN1)}</span>
                                                    {item.justificativaAprovacaoN1 && (
                                                        <span className="text-[10px] text-amber-700 italic border-t border-slate-100 pt-0.5 mt-0.5 max-w-[140px] truncate" title={item.justificativaAprovacaoN1}>
                                                            "{item.justificativaAprovacaoN1}"
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>

                                        {/* Aprovador Final */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {item.aprovador ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{item.aprovador.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{formatDateTime(item.dataAprovacao)}</span>
                                                </div>
                                            ) : item.financeiro ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{item.financeiro.nome}</span>
                                                </div>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>

                                        {/* Ações */}
                                        {isAdmin && (
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table Footer / Summary Bar */}
                <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500">
                        Exibindo <span className="text-slate-900 font-bold">{filteredItems.length}</span> de <span className="text-slate-900 font-bold">{items.length}</span> lançamentos
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Selecionado:</span>
                        <span className="text-xl font-black text-emerald-600 tracking-tight">
                            {formatCurrency(metrics.totalValue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Cobertura</DialogTitle>
                        <DialogDescription>
                            Faça alterações nos dados do lançamento. Cuidado ao alterar valores financeiros.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                                type="date"
                                value={editForm.data}
                                onChange={e => setEditForm(prev => ({ ...prev, data: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Valor</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editForm.valor}
                                onChange={e => setEditForm(prev => ({ ...prev, valor: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Posto</Label>
                            <Select value={editForm.postoId} onValueChange={v => setEditForm(prev => ({ ...prev, postoId: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(options.postos || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Select value={editForm.empresaId || "NULL"} onValueChange={v => setEditForm(prev => ({ ...prev, empresaId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NULL">Sem empresa</SelectItem>
                                    {((options as any).empresas || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Diarista</Label>
                            <Select value={editForm.diaristaId} onValueChange={v => setEditForm(prev => ({ ...prev, diaristaId: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(options.diaristas || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Colaborador (Quem Faltou)</Label>
                            <Select value={editForm.reservaId} onValueChange={v => setEditForm(prev => ({ ...prev, reservaId: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(options.reservas || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo</Label>
                            <Select value={editForm.motivoId} onValueChange={v => setEditForm(prev => ({ ...prev, motivoId: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(options.motivos || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)} disabled={saving}>Cancelar</Button>
                        <Button onClick={saveEdit} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
