"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Calendar, MapPin, User, FileText, Search, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Item {
    id: string
    data: string
    status: string
    posto: { nome: string }
    diarista: { nome: string }
    motivo: { descricao: string }
    reserva: { nome: string }
    cargaHoraria: { descricao: string }
    valor: string
    supervisor: { nome: string }
    observacao?: string
    diariasNoMes?: number
    faltasNoMes?: number
    meioPagamentoSolicitado?: { descricao: string }
    empresa?: { nome: string }
    createdAt?: string
    aprovadorN1?: { nome: string }
    justificativaAprovacaoN1?: string
}

export default function ApproverDashboard() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const [userRole, setUserRole] = useState("")

    useEffect(() => {
        fetchItems()
        fetch("/api/auth/session").then(res => res.json()).then((session: any) => {
            if (session?.user?.role) {
                setUserRole(session.user.role)
            }
        }).catch(() => { })
    }, [])

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/approver/items")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar pendências")
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item => {
        const term = searchTerm.toLowerCase()
        const matchesSearch = (
            item.posto.nome.toLowerCase().includes(term) ||
            item.diarista.nome.toLowerCase().includes(term) ||
            item.supervisor.nome.toLowerCase().includes(term) ||
            item.reserva?.nome.toLowerCase().includes(term) ||
            item.motivo.descricao.toLowerCase().includes(term)
        )

        if (startDate) {
            const itemDate = item.data.split('T')[0]
            if (itemDate < startDate) return false
        }
        if (endDate) {
            const itemDate = item.data.split('T')[0]
            if (itemDate > endDate) return false
        }

        return matchesSearch
    })

    // Action State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [detailItem, setDetailItem] = useState<Item | null>(null)
    const [actionType, setActionType] = useState<'APROVAR' | 'REPROVAR' | 'AJUSTE' | null>(null)
    const [justificativa, setJustificativa] = useState("")
    const [processing, setProcessing] = useState(false)

    // Grouping State
    const [groupBy, setGroupBy] = useState<'NONE' | 'DIARISTA' | 'POSTO' | 'EMPRESA' | 'RESERVA' | 'MOTIVO'>('NONE')
    const [selectedGroup, setSelectedGroup] = useState<{ type: string; name: string; items: Item[] } | null>(null)
    const [selectedItemIdsForBatch, setSelectedItemIdsForBatch] = useState<string[]>([])
    const [batchItemsToApprove, setBatchItemsToApprove] = useState<Item[] | null>(null)

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

    const handleQuickApprove = async (item: Item, e: React.MouseEvent) => {
        e.stopPropagation()
        openActionDialog(item, 'APROVAR', e)
    }

    const openActionDialog = (item: Item, type: 'APROVAR' | 'REPROVAR' | 'AJUSTE', e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedItem(item)
        setActionType(type)
        setJustificativa("")
    }

    const submitAction = async (id: string, acao: string, justif?: string) => {
        setProcessing(true)
        try {
            const res = await fetch("/api/approver/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, acao, justificativa: justif })
            })
            if (!res.ok) throw new Error()

            toast.success(`Sucesso: ${acao}`)
            setSelectedItem(null)
            fetchItems() // Refresh list
        } catch {
            toast.error("Erro ao processar ação")
        } finally {
            setProcessing(false)
        }
    }

    const submitBatchAction = async (justif?: string) => {
        if (!batchItemsToApprove || batchItemsToApprove.length === 0) return
        setProcessing(true)
        
        let successCount = 0
        let failCount = 0

        for (const item of batchItemsToApprove) {
            try {
                const res = await fetch("/api/approver/items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: item.id, acao: 'APROVAR', justificativa: justif })
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
            toast.success(`${successCount} itens aprovados com sucesso!`)
        }
        if (failCount > 0) {
            toast.error(`Erro ao aprovar ${failCount} itens.`)
        }

        setBatchItemsToApprove(null)
        setSelectedGroup(null)
        setSelectedItemIdsForBatch([])
        fetchItems()
        setProcessing(false)
    }

    const toggleItemSelection = (id: string) => {
        setSelectedItemIdsForBatch(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAllItems = () => {
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
                key = item.empresa?.nome || 'Sem Empresa'
            } else if (groupBy === 'RESERVA') {
                key = item.reserva?.nome || 'Vaga em Aberto'
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

    const getStatusCircleIcon = (status: string) => {
        const iconMap: any = {
            'PENDENTE': <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />,
            'APROVADO_N1': <CheckCircle className="h-4 w-4 text-primary animate-pulse" />,
            'APROVADO': <CheckCircle className="h-4 w-4 text-green-500" />,
            'REPROVADO': <XCircle className="h-4 w-4 text-red-500" />,
        }
        const bgMap: any = {
            'PENDENTE': 'bg-yellow-50 border-yellow-100',
            'APROVADO_N1': 'bg-blue-50 border-blue-100',
            'APROVADO': 'bg-green-50 border-green-100',
            'REPROVADO': 'bg-red-50 border-red-100',
        }
        return (
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${bgMap[status] || 'bg-slate-50 border-slate-100'} border`}>
                {iconMap[status] || <Clock className="h-4 w-4 text-slate-400" />}
            </div>
        )
    }

    const getStatusTextLabel = (status: string) => {
        const map: any = {
            'PENDENTE': 'PENDENTE',
            'APROVADO_N1': 'APROVADO N1',
            'APROVADO': 'APROVADO',
            'REPROVADO': 'REPROVADO',
        }
        return map[status] || status
    }

    const getStatusTextColorClass = (status: string) => {
        const map: any = {
            'PENDENTE': 'text-yellow-600',
            'APROVADO_N1': 'text-primary',
            'APROVADO': 'text-green-600',
            'REPROVADO': 'text-red-600',
        }
        return map[status] || 'text-slate-400'
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-32 px-1 md:px-0">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 md:gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                        Controle de <span className="text-primary italic">Aprovação</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Análise e validação de plantões</p>
                </div>
                {!loading && (
                    <>
                        {/* Mobile Compact Total Bar */}
                        <div className="flex md:hidden items-center justify-between bg-white/60 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-slate-100/50 w-full shadow-2xs">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total sob análise</span>
                            <span className="text-sm font-black text-slate-900 tracking-tight">
                                {formatCurrency(filteredItems.reduce((acc: number, item: Item) => acc + Number(item.valor), 0))}
                            </span>
                        </div>

                        {/* Desktop Premium Metric Card */}
                        <div className="hidden md:flex items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm shrink-0">
                            <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total sob análise</span>
                                <div className="text-3xl font-black text-slate-900 tracking-tighter mt-1">
                                    {formatCurrency(filteredItems.reduce((acc: number, item: Item) => acc + Number(item.valor), 0))}
                                </div>
                            </div>
                            <div className="h-10 w-0.5 bg-slate-200 rounded-full" />
                            <div className="bg-primary/5 p-2.5 rounded-xl">
                                <CheckCircle className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Filters Area */}
            <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-end max-w-4xl px-1">
                    {/* Search */}
                    <div className="relative group flex-1 space-y-1 md:space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtro de busca</label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Buscar posto, diarista, colaborador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 md:h-12 pl-10 md:pl-12 bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-xs md:text-sm text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Datas lado a lado no celular, juntas ocupando o espaço restante no desktop */}
                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-4 shrink-0">
                        {/* Data Início */}
                        <div className="space-y-1 md:space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Período (Início)</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-10 md:h-12 bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl px-2.5 md:px-4 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-xs md:text-sm text-slate-700 w-full md:w-44"
                            />
                        </div>

                        {/* Data Fim */}
                        <div className="space-y-1 md:space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Período (Término)</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-10 md:h-12 bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl px-2.5 md:px-4 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-xs md:text-sm text-slate-700 w-full md:w-44"
                            />
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

                {(searchTerm || startDate || endDate || groupBy !== 'NONE') && (
                    <div className="flex justify-start gap-2 px-1">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearchTerm("")
                                setStartDate("")
                                setEndDate("")
                                setGroupBy("NONE")
                                setSelectedGroup(null)
                            }}
                            className="text-[10px] text-slate-500 hover:text-primary font-bold uppercase tracking-wider h-8 rounded-lg px-3 bg-slate-100 hover:bg-slate-200/50 transition-all cursor-pointer"
                        >
                            Limpar Filtros & Agrupamentos
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredItems.length === 0 ? (
                <Card className="bg-slate-50 border-dashed py-10 rounded-2xl">
                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-8">
                        {searchTerm || startDate || endDate ? "Nenhum resultado para a busca." : "Nenhuma pendência encontrada."}
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
                                            setSelectedItemIdsForBatch(group.items.map(i => i.id)) // select all by default
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
                                    setSelectedItemIdsForBatch(group.items.map(i => i.id)) // select all by default
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
                                    <th className="py-4.5 px-6">Data</th>
                                    <th className="py-4.5 px-6">Posto de Trabalho</th>
                                    <th className="py-4.5 px-6">Quem Faltou</th>
                                    <th className="py-4.5 px-6">Quem Cobriu</th>
                                    <th className="py-4.5 px-6 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {filteredItems.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setDetailItem(item)}
                                        className="hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700"
                                    >
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
                                                {item.empresa?.nome && (
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block pl-5">
                                                        {item.empresa.nome}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4.5 px-6">
                                            {item.reserva?.nome ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[11px] font-bold">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                                                    {item.reserva.nome}
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-bold">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                                    Vaga em Aberto
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4.5 px-6">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                                                <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                {item.diarista.nome}
                                            </div>
                                        </td>
                                        <td className="py-4.5 px-6 text-right">
                                            <span className="font-black text-slate-900 tracking-tight text-base">
                                                {formatCurrency(item.valor)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Extrato List View */}
                    <div className="block md:hidden bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mx-1">
                        {filteredItems.map((item, idx) => (
                            <div
                                key={item.id}
                                onClick={() => setDetailItem(item)}
                                className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer ${idx !== filteredItems.length - 1 ? 'border-b border-slate-100/80' : ''}`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Círculo do Status */}
                                    {getStatusCircleIcon(item.status)}
                                    
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{item.posto.nome}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider truncate">
                                            {item.diarista.nome} &bull; {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0 ml-3 space-y-0.5">
                                    <p className="text-xs font-black text-slate-900 tracking-tight">
                                        {formatCurrency(item.valor)}
                                    </p>
                                    <p className={`text-[8px] font-black uppercase tracking-widest ${getStatusTextColorClass(item.status)}`}>
                                        {getStatusTextLabel(item.status)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Dialog for Reject/Adjust */}
            <Dialog open={!!selectedItem || !!batchItemsToApprove} onOpenChange={(open) => {
                if (!open) {
                    setSelectedItem(null)
                    setBatchItemsToApprove(null)
                }
            }}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-slate-900">
                            {batchItemsToApprove
                                ? `Aprovar em Lote (${batchItemsToApprove.length} itens)`
                                : (actionType === 'REPROVAR' ? 'Reprovar Cobertura' : actionType === 'APROVAR' ? `Aprovar Cobertura (${userRole === 'APROVADOR_N1' ? 'N1' : 'N2'})` : 'Solicitar Ajuste')
                            }
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {batchItemsToApprove
                                ? `Insira a justificativa/parecer que será aplicado a todas as ${batchItemsToApprove.length} coberturas selecionadas.`
                                : (actionType === 'REPROVAR'
                                    ? 'Justifique a reprovação. O item será cancelado.'
                                    : actionType === 'APROVAR'
                                        ? 'Por favor, insira uma justificativa/parecer obrigatório para prosseguir com a aprovação.'
                                        : 'Descreva o que precisa ser corrigido. O supervisor será notificado.')
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 ml-1">Justificativa / Motivo</Label>
                        <Textarea
                            value={justificativa}
                            onChange={e => setJustificativa(e.target.value)}
                            placeholder="Digite aqui..."
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-semibold text-slate-700 min-h-[100px]"
                        />
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 w-full mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (batchItemsToApprove) {
                                    setBatchItemsToApprove(null)
                                } else {
                                    setDetailItem(selectedItem) // Reopen detail modal
                                    setSelectedItem(null)
                                }
                            }}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={(actionType === 'REPROVAR' && !batchItemsToApprove) ? 'destructive' : 'default'}
                            onClick={() => {
                                if (batchItemsToApprove) {
                                    submitBatchAction(justificativa)
                                } else if (selectedItem) {
                                    submitAction(selectedItem.id, actionType!, justificativa)
                                }
                            }}
                            disabled={processing || !justificativa.trim()}
                            className="w-full sm:w-auto cursor-pointer"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 shrink-0 text-left">
                        <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">Detalhes do Lançamento</DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">Informações completas do plantão sob análise</DialogDescription>
                    </DialogHeader>
                    {detailItem && (
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-none">
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
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block sm:mb-0.5">Valor do Reembolso</span>
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
                                        {detailItem.empresa?.nome && (
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Empresa / Grupo</span>
                                                <span className="font-bold text-slate-700 text-xs">{detailItem.empresa.nome}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Carga Horária</span>
                                            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mt-0.5">
                                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                {detailItem.cargaHoraria?.descricao || '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Escala de Plantão */}
                                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                        <User className="h-3.5 w-3.5 text-purple-600" />
                                        Escala de Plantão
                                    </h4>
                                    <div className="space-y-3">
                                        {/* Quem Faltou Container */}
                                        <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100/50">
                                            <span className="text-[9px] font-black text-purple-600/80 uppercase tracking-wider block mb-1">Quem Faltou</span>
                                            {detailItem.reserva?.nome ? (
                                                <span className="font-bold text-purple-950 text-sm block">
                                                    {detailItem.reserva.nome}
                                                </span>
                                            ) : (
                                                <span className="font-bold text-purple-900/60 text-sm italic block">
                                                    Vaga em Aberto
                                                </span>
                                            )}
                                        </div>

                                        {/* Quem Cobriu Container */}
                                        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                            <span className="text-[9px] font-black text-blue-600/80 uppercase tracking-wider block mb-1">Quem Cobriu (Diarista)</span>
                                            <span className="font-bold text-blue-950 text-sm block">
                                                {detailItem.diarista.nome}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Fluxo e Pagamento */}
                            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    Fluxo e Pagamento
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Motivo</span>
                                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{detailItem.motivo.descricao}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Forma de Pagamento</span>
                                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{detailItem.meioPagamentoSolicitado?.descricao || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Solicitado Por</span>
                                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{detailItem.supervisor.nome}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Observação */}
                            {detailItem.observacao && (
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80 space-y-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Observação do Supervisor</span>
                                    <p className="text-sm text-slate-600 italic block">"{detailItem.observacao}"</p>
                                </div>
                            )}

                            {/* Parecer N1 */}
                            {detailItem.justificativaAprovacaoN1 && (
                                <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100/60 space-y-1 text-blue-900">
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Parecer Aprovador N1 ({detailItem.aprovadorN1?.nome || 'N/A'})</span>
                                    <p className="text-sm text-blue-800 italic block">"{detailItem.justificativaAprovacaoN1}"</p>
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
                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
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
                                    onClick={(e) => {
                                        openActionDialog(detailItem, 'REPROVAR', e)
                                        setDetailItem(null)
                                    }}
                                >
                                    <XCircle className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Reprovar
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 w-full sm:w-auto cursor-pointer text-[10px] sm:text-xs font-black uppercase tracking-wider"
                                    onClick={(e) => {
                                        openActionDialog(detailItem, 'AJUSTE', e)
                                        setDetailItem(null)
                                    }}
                                >
                                    <AlertTriangle className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Ajuste
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto cursor-pointer text-[10px] sm:text-xs font-black uppercase tracking-wider"
                                    onClick={(e) => {
                                        openActionDialog(detailItem, 'APROVAR', e)
                                        setDetailItem(null)
                                    }}
                                >
                                    <CheckCircle className="mr-1 h-3.5 w-3.5 hidden sm:inline" /> Aprovar
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group Extrato Modal */}
            <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
                <DialogContent className="max-w-3xl rounded-3xl border-none shadow-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 shrink-0 text-left">
                        <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">
                            Extrato - {selectedGroup?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">
                            Visualização agrupada por {selectedGroup?.type} • {selectedGroup?.items.length} diárias pendentes
                        </DialogDescription>
                    </DialogHeader>

                    {selectedGroup && (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-none">
                            {/* Checklist Header */}
                            <div className="flex justify-between items-center px-1 pb-2 border-b border-slate-100/65">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIdsForBatch.length === selectedGroup.items.length}
                                        onChange={toggleAllItems}
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
                                            onClick={() => toggleItemSelection(item.id)}
                                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-all rounded-2xl border border-slate-100/80 cursor-pointer select-none ${isSelected ? 'bg-primary/[0.01] border-primary/20 shadow-2xs' : 'bg-white'}`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation() // Prevent row click trigger
                                                        toggleItemSelection(item.id)
                                                    }}
                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                                                />
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-100 text-[8px] font-black uppercase tracking-wider">
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                                        {groupBy !== 'POSTO' && `${item.posto.nome}`}
                                                        {groupBy !== 'DIARISTA' && ` • Cobriu: ${item.diarista.nome}`}
                                                        {groupBy !== 'RESERVA' && item.reserva?.nome && ` • Faltou: ${item.reserva.nome}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-sm font-black text-slate-900 tracking-tight">
                                                    {formatCurrency(item.valor)}
                                                </span>
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

                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
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
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-105 disabled:text-slate-400 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 w-full sm:w-auto cursor-pointer"
                                onClick={() => {
                                    const selectedItems = selectedGroup.items.filter(item => selectedItemIdsForBatch.includes(item.id))
                                    setBatchItemsToApprove(selectedItems)
                                    setActionType('APROVAR')
                                    setJustificativa("")
                                }}
                            >
                                <CheckCircle className="mr-1.5 h-4 w-4 hidden sm:inline" /> Aprovar Selecionados ({selectedItemIdsForBatch.length}) em Lote
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
