"use client"

import { useState, useEffect } from "react"
import { CheckCircle, DollarSign, Loader2, Calendar, MapPin, User, FileText, CreditCard, Upload, Download, Search, AlertTriangle, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

interface Item {
    id: string
    data: string
    horaInicio?: string
    horaFim?: string
    posto: { nome: string }
    diarista: { nome: string; chavePix?: string }
    motivo: { descricao: string }
    valor: string
    supervisor: { nome: string }
    meioPagamentoSolicitado: { id: string; descricao: string }
    observacao?: string
    aprovadorN1?: { nome: string }
    justificativaAprovacaoN1?: string
    dataAprovacaoN1?: string
    aprovador?: { nome: string }
    justificativaAprovacaoN2?: string
    dataAprovacao?: string
    createdAt?: string
}

interface Meio {
    id: string
    descricao: string
}

const formatDateToBr = (dateStr: string) => {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    if (!year || !month || !day) return dateStr
    return `${day}/${month}/${year}`
}

export default function FinanceDashboard() {
    const [items, setItems] = useState<Item[]>([])
    const [meios, setMeios] = useState<Meio[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Date filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    // Grouping & Batching states
    const [groupBy, setGroupBy] = useState<'NONE' | 'DIARISTA' | 'POSTO' | 'EMPRESA' | 'RESERVA' | 'MOTIVO'>('NONE')
    const [selectedGroup, setSelectedGroup] = useState<{ type: string; name: string; items: Item[] } | null>(null)
    const [selectedItemIdsForBatch, setSelectedItemIdsForBatch] = useState<string[]>([])
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [batchItemsToPay, setBatchItemsToPay] = useState<Item[] | null>(null)
    const [detailItem, setDetailItem] = useState<Item | null>(null)

    // Payment Dialog State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [payData, setPayData] = useState({
        date: new Date().toISOString().split('T')[0],
        methodId: "",
        obs: ""
    })
    const [file, setFile] = useState<File | null>(null)
    const [processing, setProcessing] = useState(false)
    const [actionDialogOpen, setActionDialogOpen] = useState(false)
    const [actionType, setActionType] = useState<'REPROVAR' | 'AJUSTE' | null>(null)
    const [actionJustification, setActionJustification] = useState("")

    // Export Dialog State
    const [exportOpen, setExportOpen] = useState(false)
    const [exportDates, setExportDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchItems()
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Sync open group items when the main items list changes
    useEffect(() => {
        if (selectedGroup && items.length > 0) {
            const updatedItems = items.filter(newItem => 
                selectedGroup.items.some(oldItem => oldItem.id === newItem.id)
            )
            if (updatedItems.length === 0) {
                setSelectedGroup(null)
                setSelectedItemIdsForBatch([])
            } else {
                setSelectedGroup(prev => prev ? { ...prev, items: updatedItems } : null)
                setSelectedItemIdsForBatch(prev => prev.filter(id => updatedItems.some(i => i.id === id)))
            }
        }
    }, [items])

    const fetchItems = async () => {
        try {
            const res = await fetch(`/api/finance/payable?search=${encodeURIComponent(search)}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data.items)
            setMeios(data.meios)
        } catch {
            toast.error("Erro ao carregar pagamentos pendentes")
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item => {
        if (startDate) {
            const itemDate = item.data.split('T')[0]
            if (itemDate < startDate) return false
        }
        if (endDate) {
            const itemDate = item.data.split('T')[0]
            if (itemDate > endDate) return false
        }
        return true
    })

    const openPayDialog = (item: Item) => {
        setSelectedItem(item)
        setBatchItemsToPay(null)
        setPayData({
            date: new Date().toISOString().split('T')[0],
            methodId: item.meioPagamentoSolicitado.id,
            obs: ""
        })
        setFile(null)
    }

    const openBatchPayDialog = (selectedItems: Item[]) => {
        if (selectedItems.length === 0) return
        setSelectedItem(null)
        setBatchItemsToPay(selectedItems)
        setPayData({
            date: new Date().toISOString().split('T')[0],
            methodId: selectedItems[0]?.meioPagamentoSolicitado?.id || meios[0]?.id || "",
            obs: ""
        })
        setFile(null)
    }

    const submitPayment = async () => {
        if (!selectedItem && (!batchItemsToPay || batchItemsToPay.length === 0)) return
        setProcessing(true)

        const itemsToProcess = batchItemsToPay ? batchItemsToPay : [selectedItem!]
        let successCount = 0
        let failCount = 0

        for (const item of itemsToProcess) {
            try {
                const formData = new FormData()
                formData.append("id", item.id)
                formData.append("acao", "PAGO")
                formData.append("dataPagamento", payData.date)
                formData.append("meioPagamentoId", payData.methodId)
                formData.append("justificativa", payData.obs)
                if (file) {
                    formData.append("comprovante", file)
                }

                const res = await fetch("/api/finance/payable", {
                    method: "POST",
                    body: formData
                })
                if (res.ok) {
                    successCount++
                } else {
                    failCount++
                }
            } catch {
                failCount++
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} pagamentos registrados com sucesso!`)
        }
        if (failCount > 0) {
            toast.error(`Erro ao registrar ${failCount} pagamentos.`)
        }

        setSelectedItem(null)
        setBatchItemsToPay(null)
        setSelectedGroup(null)
        setSelectedItemIds([])
        setSelectedItemIdsForBatch([])
        setFile(null)
        fetchItems()
        setProcessing(false)
    }

    const openActionDialog = (item: Item, type: 'REPROVAR' | 'AJUSTE') => {
        setSelectedItem(item)
        setActionType(type)
        setActionJustification("")
        setActionDialogOpen(true)
    }

    const submitAction = async () => {
        if (!selectedItem || !actionType) return
        setProcessing(true)

        try {
            const formData = new FormData()
            formData.append("id", selectedItem.id)
            formData.append("acao", actionType)
            formData.append("justificativa", actionJustification)

            const res = await fetch("/api/finance/payable", {
                method: "POST",
                body: formData
            })
            if (!res.ok) throw new Error()

            toast.success(`${actionType === 'REPROVAR' ? 'Reprovação' : 'Ajuste'} solicitado com sucesso!`)
            setActionDialogOpen(false)
            setSelectedItem(null)
            setDetailItem(null)
            fetchItems()
        } catch {
            toast.error("Erro ao processar ação")
        } finally {
            setProcessing(false)
        }
    }

    const handleExport = () => {
        const url = `/api/finance/export?start=${exportDates.start}&end=${exportDates.end}`
        window.open(url, '_blank')
        setExportOpen(false)
    }

    const toggleItemSelection = (id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAllItems = () => {
        if (selectedItemIds.length === filteredItems.length) {
            setSelectedItemIds([])
        } else {
            setSelectedItemIds(filteredItems.map(i => i.id))
        }
    }

    const toggleGroupItemSelection = (id: string) => {
        setSelectedItemIdsForBatch(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAllGroupItems = () => {
        if (!selectedGroup) return
        if (selectedItemIdsForBatch.length === selectedGroup.items.length) {
            setSelectedItemIdsForBatch([])
        } else {
            setSelectedItemIdsForBatch(selectedGroup.items.map(i => i.id))
        }
    }

    const getGroupedItems = () => {
        if (groupBy === 'NONE') return []

        const groups: { [key: string]: Item[] } = {}

        filteredItems.forEach(item => {
            let key = ""
            if (groupBy === 'DIARISTA') {
                key = item.diarista.nome
            } else if (groupBy === 'POSTO') {
                key = item.posto.nome
            } else if (groupBy === 'EMPRESA') {
                key = (item as any).empresa?.nome || (item as any).posto?.empresa?.nome || 'Sem Empresa'
            } else if (groupBy === 'RESERVA') {
                key = (item as any).reserva?.nome || 'Vaga em Aberto'
            } else if (groupBy === 'MOTIVO') {
                key = item.motivo.descricao
            }

            if (!groups[key]) {
                groups[key] = []
            }
            groups[key].push(item)
        })

        return Object.entries(groups).map(([name, groupItems]) => {
            const totalVal = groupItems.reduce((acc, item) => acc + Number(item.valor), 0)
            return {
                name,
                items: groupItems,
                count: groupItems.length,
                totalValue: totalVal
            }
        }).sort((a, b) => b.totalValue - a.totalValue)
    }

    const groupedItems = getGroupedItems()

    const getGroupIcon = () => {
        if (groupBy === 'DIARISTA') return <User className="h-4 w-4 text-blue-500" />
        if (groupBy === 'POSTO') return <MapPin className="h-4 w-4 text-primary" />
        if (groupBy === 'EMPRESA') return <FileText className="h-4 w-4 text-indigo-500" />
        if (groupBy === 'RESERVA') return <User className="h-4 w-4 text-purple-500" />
        if (groupBy === 'MOTIVO') return <FileText className="h-4 w-4 text-slate-500" />
        return <User className="h-4 w-4 text-slate-500" />
    }

    const getGroupTypeLabel = () => {
        if (groupBy === 'DIARISTA') return "Diarista"
        if (groupBy === 'POSTO') return "Posto de Trabalho"
        if (groupBy === 'EMPRESA') return "Empresa (Grupo)"
        if (groupBy === 'RESERVA') return "Quem Faltou"
        if (groupBy === 'MOTIVO') return "Motivo"
        return ""
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-32 px-1 md:px-0">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 md:gap-6 w-full">
                <div className="relative -mt-8 -mx-4 lg:mt-0 lg:mx-0 p-6 lg:p-0 bg-slate-950 lg:bg-transparent text-white lg:text-slate-900 border-b lg:border-none border-emerald-500/20 overflow-hidden shadow-lg lg:shadow-none lg:space-y-1 lg:block flex flex-col justify-center w-[calc(100%+2rem)] lg:w-auto">
                    {/* Glows for App View */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 lg:hidden" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 lg:hidden" />
                    
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight text-white lg:text-slate-900">
                        Controle de <span className="text-emerald-400 lg:text-primary italic">Pagamentos</span>
                    </h1>
                    <p className="text-emerald-500/60 lg:text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1 lg:mt-0">Gestão financeira de diárias e coberturas</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {!loading && (
                        <>
                            {/* Mobile Compact Total Bar */}
                            <div className="flex md:hidden items-center justify-between bg-white/60 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-slate-100/50 w-full shadow-2xs">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total à pagar</span>
                                <span className="text-sm font-black text-slate-900 tracking-tight">
                                    {formatCurrency(items.reduce((acc, item) => acc + Number(item.valor), 0))}
                                </span>
                            </div>

                            {/* Desktop Premium Metric Card */}
                            <div className="hidden md:flex items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm shrink-0">
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total à pagar</span>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter mt-1">
                                        {formatCurrency(items.reduce((acc, item) => acc + Number(item.valor), 0))}
                                    </div>
                                </div>
                                <div className="h-10 w-0.5 bg-slate-200 rounded-full" />
                                <div className="bg-primary/5 p-2.5 rounded-xl">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        <Button variant="outline" className="flex-1 sm:flex-none h-10 rounded-xl" onClick={() => setExportOpen(true)}>
                            <Download className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                        <Link href="/dashboard/financeiro/historico" className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full h-10 rounded-xl">
                                <Calendar className="mr-2 h-4 w-4" /> Histórico
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filters Area */}
            <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-end max-w-5xl px-1">
                    {/* Search */}
                    <div className="relative group flex-1 space-y-1 md:space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtro de busca</label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Pesquisar posto, diarista, colaborador..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 md:h-12 pl-10 md:pl-12 bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-xs md:text-sm text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Datas lado a lado no celular, juntas ocupando o espaço restante no desktop */}
                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-4 shrink-0">
                        {/* Data Início */}
                        <div className="space-y-1 md:space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Período (Início)</label>
                            <div className="relative w-full md:w-44 group">
                                <div className="absolute inset-0 bg-white border border-slate-200 group-hover:border-slate-300 shadow-xs rounded-xl px-3 md:px-4 flex items-center justify-between pointer-events-none transition-all font-semibold text-xs md:text-sm text-slate-700 group-focus-within:ring-2 group-focus-within:ring-primary/10 group-focus-within:border-primary">
                                    <span className={startDate ? "text-slate-700" : "text-slate-300 font-medium"}>
                                        {formatDateToBr(startDate) || "dd/mm/aaaa"}
                                    </span>
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                </div>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-10 md:h-12 w-full opacity-0 cursor-pointer block"
                                />
                            </div>
                        </div>

                        {/* Data Fim */}
                        <div className="space-y-1 md:space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Período (Término)</label>
                            <div className="relative w-full md:w-44 group">
                                <div className="absolute inset-0 bg-white border border-slate-200 group-hover:border-slate-300 shadow-xs rounded-xl px-3 md:px-4 flex items-center justify-between pointer-events-none transition-all font-semibold text-xs md:text-sm text-slate-700 group-focus-within:ring-2 group-focus-within:ring-primary/10 group-focus-within:border-primary">
                                    <span className={endDate ? "text-slate-700" : "text-slate-300 font-medium"}>
                                        {formatDateToBr(endDate) || "dd/mm/aaaa"}
                                    </span>
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                </div>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-10 md:h-12 w-full opacity-0 cursor-pointer block"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Agrupar por */}
                    <div className="space-y-1 md:space-y-1.5 w-full md:w-52">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Visualização (Agrupar)</label>
                        <select
                            value={groupBy}
                            onChange={(e: any) => {
                                setGroupBy(e.target.value)
                                setSelectedGroup(null)
                                setSelectedItemIds([])
                                setSelectedItemIdsForBatch([])
                            }}
                            className="h-10 md:h-12 bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl px-3 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-xs md:text-sm text-slate-700 w-full outline-none appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                        >
                            <option value="NONE">Sem Agrupamento (Padrão)</option>
                            <option value="DIARISTA">Agrupar por Diarista</option>
                            <option value="POSTO">Agrupar por Posto de Trabalho</option>
                            <option value="EMPRESA">Agrupar por Empresa (Grupo)</option>
                            <option value="RESERVA">Agrupar por Quem Faltou</option>
                            <option value="MOTIVO">Agrupar por Motivo</option>
                        </select>
                    </div>
                </div>

                {(search || startDate || endDate || groupBy !== 'NONE') && (
                    <div className="flex justify-start gap-2 px-1">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearch("")
                                setStartDate("")
                                setEndDate("")
                                setGroupBy("NONE")
                                setSelectedGroup(null)
                                setSelectedItemIds([])
                                setSelectedItemIdsForBatch([])
                            }}
                            className="text-[10px] text-slate-500 hover:text-primary font-bold uppercase tracking-wider h-8 rounded-lg px-3 bg-slate-100 hover:bg-slate-200/50 transition-all cursor-pointer"
                        >
                            Limpar Filtros & Agrupamentos
                        </Button>
                    </div>
                )}
            </div>

            {/* Batch Action Bar (for standard list view) */}
            {selectedItemIds.length > 0 && groupBy === 'NONE' && (
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl flex items-center justify-between mx-1 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-xs font-bold text-slate-700 ml-1">
                        {selectedItemIds.length} {selectedItemIds.length === 1 ? 'item selecionado' : 'itens selecionados'} para pagamento
                    </span>
                    <Button
                        onClick={() => {
                            const selectedItems = filteredItems.filter(item => selectedItemIds.includes(item.id))
                            openBatchPayDialog(selectedItems)
                        }}
                        className="bg-slate-900 hover:bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-xl h-10 px-4 cursor-pointer"
                    >
                        <DollarSign className="mr-1 h-4 w-4" /> Registrar Pagamento em Lote
                    </Button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <Card className="bg-slate-50 border-dashed py-14 flex flex-col items-center justify-center rounded-2xl">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-slate-300" />
                    </div>
                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-2">
                        {search || startDate || endDate ? "Nenhum resultado para a busca." : "Nenhuma pendência encontrada."}
                    </div>
                </Card>
            ) : groupBy !== 'NONE' ? (
                <>
                    {/* Desktop Grouped Table View */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4.5 px-6">{getGroupTypeLabel()}</th>
                                    <th className="py-4.5 px-6 text-center">Qtd. Plantões</th>
                                    <th className="py-4.5 px-6 text-right">Valor Acumulado</th>
                                    <th className="py-4.5 px-6 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {groupedItems.map(group => (
                                    <tr
                                        key={group.name}
                                        onClick={() => {
                                            setSelectedGroup({ type: getGroupTypeLabel(), name: group.name, items: group.items })
                                            setSelectedItemIdsForBatch(group.items.map(i => i.id))
                                        }}
                                        className="hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700"
                                    >
                                        <td className="py-4.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                    {getGroupIcon()}
                                                </div>
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {group.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4.5 px-6 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                                {group.count} {group.count === 1 ? 'plantão' : 'plantões'}
                                            </span>
                                        </td>
                                        <td className="py-4.5 px-6 text-right">
                                            <span className="font-black text-slate-900 tracking-tight text-base">
                                                {formatCurrency(group.totalValue)}
                                            </span>
                                        </td>
                                        <td className="py-4.5 px-6 text-right">
                                            <Button
                                                variant="ghost"
                                                className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/5"
                                            >
                                                Abrir Extrato
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Grouped Feed View */}
                    <div className="block md:hidden space-y-3 mx-1">
                        {groupedItems.map(group => (
                            <div
                                key={group.name}
                                onClick={() => {
                                    setSelectedGroup({ type: getGroupTypeLabel(), name: group.name, items: group.items })
                                    setSelectedItemIdsForBatch(group.items.map(i => i.id))
                                }}
                                className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer flex justify-between items-center"
                            >
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {getGroupIcon()}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                            {getGroupTypeLabel()}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-sm truncate">{group.name}</h4>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100">
                                        {group.count} {group.count === 1 ? 'plantão' : 'plantões'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 ml-3 space-y-1">
                                    <span className="font-black text-slate-900 text-base tracking-tight block">
                                        {formatCurrency(group.totalValue)}
                                    </span>
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest block">
                                        Extrato &rarr;
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4.5 px-6 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedItemIds.length === filteredItems.length}
                                            onChange={toggleAllItems}
                                            className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                                        />
                                    </th>
                                    <th className="py-4.5 px-6">Data</th>
                                    <th className="py-4.5 px-6">Posto de Trabalho</th>
                                    <th className="py-4.5 px-6">Diarista (Quem Cobriu)</th>
                                    <th className="py-4.5 px-6">Meio Pago</th>
                                    <th className="py-4.5 px-6 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {filteredItems.map(item => {
                                    const isSelected = selectedItemIds.includes(item.id)
                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => setDetailItem(item)}
                                            className={`hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700 ${isSelected ? 'bg-primary/[0.01]' : ''}`}
                                        >
                                            <td className="py-4.5 px-6" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleItemSelection(item.id)}
                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-4.5 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-700">
                                                        {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4.5 px-6">
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                                        {item.posto.nome}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4.5 px-6">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                                                    <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                    {item.diarista.nome}
                                                </div>
                                            </td>
                                            <td className="py-4.5 px-6">
                                                <div className="flex items-center gap-1 text-slate-500 font-semibold">
                                                    <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    {item.meioPagamentoSolicitado.descricao}
                                                </div>
                                            </td>
                                            <td className="py-4.5 px-6 text-right">
                                                <span className="font-black text-slate-900 tracking-tight text-base">
                                                    {formatCurrency(item.valor)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Extrato List View */}
                    <div className="block md:hidden bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mx-1">
                        {filteredItems.map((item, idx) => {
                            const isSelected = selectedItemIds.includes(item.id)
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setDetailItem(item)}
                                    className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer ${idx !== filteredItems.length - 1 ? 'border-b border-slate-100/80' : ''} ${isSelected ? 'bg-primary/[0.01]' : ''}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div onClick={(e) => e.stopPropagation()} className="shrink-0 mr-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleItemSelection(item.id)}
                                                className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                                            />
                                        </div>
                                        
                                        <div className="min-w-0 space-y-0.5">
                                            <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{item.posto.nome}</p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider truncate">
                                                {item.diarista.nome} &bull; {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                                        <p className="text-xs font-black text-slate-900 tracking-tight">
                                            {formatCurrency(item.valor)}
                                        </p>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-yellow-50 border border-yellow-100 text-[8px] font-black uppercase tracking-wider text-yellow-600">
                                            PENDENTE
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Payment Dialog */}
            <Dialog open={(!!selectedItem || !!batchItemsToPay) && !actionDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setSelectedItem(null)
                    setBatchItemsToPay(null)
                }
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {batchItemsToPay
                                ? `Registrar Pagamento em Lote (${batchItemsToPay.length} itens)`
                                : 'Registrar Pagamento'
                            }
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Data do Pagamento</Label>
                            <Input
                                type="date"
                                value={payData.date}
                                onChange={e => setPayData({ ...payData, date: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Meio de Pagamento</Label>
                            <Select
                                value={payData.methodId}
                                onValueChange={v => setPayData({ ...payData, methodId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {meios.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Comprovante (Imagem/PDF)</Label>
                            <Input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>

                        <div>
                            <Label>Observações (Opcional)</Label>
                            <Textarea
                                value={payData.obs}
                                onChange={e => setPayData({ ...payData, obs: e.target.value })}
                                placeholder="Ex: Código do comprovante..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => {
                            setSelectedItem(null)
                            setBatchItemsToPay(null)
                        }}>Cancelar</Button>
                        <Button
                            onClick={submitPayment}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject/Revision Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={(open) => !open && setActionDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'REPROVAR' ? 'Reprovar Cobertura' : 'Solicitar Ajuste/Revisão'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'REPROVAR'
                                ? 'Justifique a reprovação. O item será cancelado definitivamente.'
                                : 'Descreva o que precisa ser revisado pelo supervisor.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label>Justificativa / Observação</Label>
                        <Textarea
                            value={actionJustification}
                            onChange={e => setActionJustification(e.target.value)}
                            placeholder="Digite aqui..."
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
                        <Button
                            variant={actionType === 'REPROVAR' ? 'destructive' : 'default'}
                            onClick={submitAction}
                            disabled={processing || !actionJustification.trim()}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white">
                    <DialogHeader>
                        <DialogTitle>Exportar Relatório</DialogTitle>
                        <DialogDescription>
                            Selecione o período para exportação.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                            <Label>Data Inicial</Label>
                            <Input
                                type="date"
                                value={exportDates.start}
                                onChange={e => setExportDates({ ...exportDates, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Data Final</Label>
                            <Input
                                type="date"
                                value={exportDates.end}
                                onChange={e => setExportDates({ ...exportDates, end: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setExportOpen(false)}>Cancelar</Button>
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Baixar .xlsx
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent showCloseButton={false} className="max-w-2xl rounded-3xl border-none shadow-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 shrink-0 text-left bg-white relative">
                        <div className="pr-10">
                            <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">Detalhes do Lançamento</DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">Informações completas do plantão para pagamento</DialogDescription>
                        </div>
                        <DialogClose className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-all cursor-pointer shrink-0 absolute top-5 right-5">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>
                    {detailItem && (
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-none bg-slate-50">
                            {/* Top Premium Banner */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-slate-900/5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary/75" />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Data do Plantão</span>
                                    </div>
                                    <span className="text-lg font-black tracking-tight block">
                                        {format(new Date(detailItem.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-left sm:text-right w-full sm:w-auto shrink-0 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block sm:mb-0.5">Valor do Pagamento</span>
                                    <span className="text-xl font-black text-emerald-400 tracking-tight">
                                        {formatCurrency(detailItem.valor)}
                                    </span>
                                </div>
                            </div>

                            {/* Info Grid (Local vs Escala) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Card 1: Local e Logística */}
                                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                        Local e Logística
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Posto de Trabalho</span>
                                            <span className="font-bold text-slate-800 text-sm">{detailItem.posto.nome}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Diarista (Quem Cobriu)</span>
                                            <span className="font-bold text-slate-800 text-sm block">{detailItem.diarista.nome}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Informações de Chave PIX e Pagamento */}
                                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                        <CreditCard className="h-3.5 w-3.5 text-orange-500" />
                                        Informações de PIX
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Chave PIX do Diarista</span>
                                            <span className="font-mono font-bold text-slate-900 text-xs bg-slate-50 border px-2.5 py-1.5 rounded-lg block mt-1">
                                                {detailItem.diarista.chavePix || "Nenhuma chave PIX cadastrada"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Meio de Pagamento Solicitado</span>
                                            <span className="font-bold text-slate-800 text-xs block">{detailItem.meioPagamentoSolicitado.descricao}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Fluxo de Aprovações e Informações */}
                            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    Fluxo e Validação
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {detailItem.aprovadorN1 && (
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Aprovação N1</span>
                                            <span className="font-bold text-slate-700 text-xs block">{detailItem.aprovadorN1.nome}</span>
                                            {detailItem.dataAprovacaoN1 && (
                                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                                    {new Date(detailItem.dataAprovacaoN1).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {detailItem.justificativaAprovacaoN1 && (
                                                <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">"{detailItem.justificativaAprovacaoN1}"</p>
                                            )}
                                        </div>
                                    )}
                                    {detailItem.aprovador && (
                                        <div className="p-3 rounded-xl bg-primary/[0.02] border border-primary/10">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-wider block mb-1">Aprovação N2</span>
                                            <span className="font-bold text-slate-700 text-xs block">{detailItem.aprovador.nome}</span>
                                            {detailItem.dataAprovacao && (
                                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                                    {new Date(detailItem.dataAprovacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {detailItem.justificativaAprovacaoN2 && (
                                                <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">"{detailItem.justificativaAprovacaoN2}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Observação */}
                            {detailItem.observacao && (
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80 space-y-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Observação do Supervisor</span>
                                    <p className="text-sm text-slate-600 italic block">"{detailItem.observacao}"</p>
                                </div>
                            )}

                            {/* Lançamento Date */}
                            {detailItem.createdAt && (
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right px-1">
                                    Lançado em: {new Date(detailItem.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                        <Button 
                            variant="ghost" 
                            onClick={() => setDetailItem(null)} 
                            className="w-full sm:w-auto order-last sm:order-first font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-100"
                        >
                            Fechar
                        </Button>
                        {detailItem && (
                            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="destructive"
                                    className="w-full sm:w-auto cursor-pointer text-[10px] sm:text-xs font-black uppercase tracking-wider"
                                    onClick={() => {
                                        openActionDialog(detailItem, 'REPROVAR')
                                        setDetailItem(null)
                                    }}
                                >
                                    <XCircle className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Reprovar
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 w-full sm:w-auto cursor-pointer text-[10px] sm:text-xs font-black uppercase tracking-wider"
                                    onClick={() => {
                                        openActionDialog(detailItem, 'AJUSTE')
                                        setDetailItem(null)
                                    }}
                                >
                                    <AlertTriangle className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Ajuste
                                </Button>
                                <Button
                                    className="bg-slate-900 hover:bg-primary text-white w-full sm:w-auto cursor-pointer text-[10px] sm:text-xs font-black uppercase tracking-wider"
                                    onClick={() => {
                                        openPayDialog(detailItem)
                                        setDetailItem(null)
                                    }}
                                >
                                    <DollarSign className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Pagar
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group Extrato Modal */}
            <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
                <DialogContent showCloseButton={false} className="max-w-3xl rounded-3xl border-none shadow-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 shrink-0 text-left bg-white relative">
                        <div className="pr-10">
                            <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">
                                Extrato - {selectedGroup?.name}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">
                                Visualização agrupada por {selectedGroup?.type} • {selectedGroup?.items.length} pagamentos pendentes
                            </DialogDescription>
                        </div>
                        <DialogClose className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-all cursor-pointer shrink-0 absolute top-5 right-5">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>

                    {selectedGroup && (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-none bg-slate-50">
                            {/* Checklist Header */}
                            <div className="flex justify-between items-center px-1 pb-2 border-b border-slate-100/65">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIdsForBatch.length === selectedGroup.items.length}
                                        onChange={toggleAllGroupItems}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                                    />
                                    Selecionar Todos ({selectedItemIdsForBatch.length}/{selectedGroup.items.length})
                                </label>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Total: {formatCurrency(selectedGroup.items.reduce((acc, item) => acc + Number(item.valor), 0))}
                                </span>
                            </div>

                            {/* Group list */}
                            <div className="space-y-2">
                                {selectedGroup.items.map(item => {
                                    const isSelected = selectedItemIdsForBatch.includes(item.id)
                                    return (
                                        <div 
                                            key={item.id}
                                            onClick={() => toggleGroupItemSelection(item.id)}
                                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-all rounded-2xl border border-slate-100/80 cursor-pointer select-none ${isSelected ? 'bg-primary/[0.01] border-primary/20 shadow-2xs' : 'bg-white'}`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation()
                                                        toggleGroupItemSelection(item.id)
                                                    }}
                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer shrink-0"
                                                />
                                                <div className="min-w-0 space-y-0.5">
                                                    <span className="text-xs font-bold text-slate-800 block">
                                                        {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                                        {groupBy !== 'POSTO' && `${item.posto.nome}`}
                                                        {groupBy !== 'DIARISTA' && ` • Cobriu: ${item.diarista.nome}`}
                                                        {groupBy !== 'RESERVA' && (item as any).reserva?.nome && ` • Faltou: ${(item as any).reserva.nome}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">
                                                        {formatCurrency(item.valor)}
                                                    </span>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-yellow-50 border border-yellow-100 text-[8px] font-black uppercase tracking-wider text-yellow-600">
                                                        PENDENTE
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setDetailItem(item)
                                                    }}
                                                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                        <Button 
                            variant="ghost" 
                            onClick={() => setSelectedGroup(null)} 
                            className="w-full sm:w-auto font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-100"
                        >
                            Fechar
                        </Button>
                        {selectedGroup && (
                            <Button
                                disabled={selectedItemIdsForBatch.length === 0}
                                className="bg-slate-900 hover:bg-primary disabled:bg-slate-100 disabled:text-slate-400 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 w-full sm:w-auto cursor-pointer"
                                onClick={() => {
                                    const selectedItems = selectedGroup.items.filter(item => selectedItemIdsForBatch.includes(item.id))
                                    openBatchPayDialog(selectedItems)
                                }}
                            >
                                <DollarSign className="mr-1.5 h-4 w-4 hidden sm:inline" /> Baixar Selecionados ({selectedItemIdsForBatch.length}) em Lote
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
