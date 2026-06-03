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
                </div>

                {(searchTerm || startDate || endDate) && (
                    <div className="flex justify-start px-1">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearchTerm("")
                                setStartDate("")
                                setEndDate("")
                            }}
                            className="text-[10px] text-slate-500 hover:text-primary font-bold uppercase tracking-wider h-8 rounded-lg px-3 bg-slate-100 hover:bg-slate-200/50 transition-all cursor-pointer"
                        >
                            Limpar Filtros
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
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-slate-900">
                            {actionType === 'REPROVAR' ? 'Reprovar Cobertura' : actionType === 'APROVAR' ? `Aprovar Cobertura (${userRole === 'APROVADOR_N1' ? 'N1' : 'N2'})` : 'Solicitar Ajuste'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {actionType === 'REPROVAR'
                                ? 'Justifique a reprovação. O item será cancelado.'
                                : actionType === 'APROVAR'
                                    ? 'Por favor, insira uma justificativa/parecer obrigatório para prosseguir com a aprovação.'
                                    : 'Descreva o que precisa ser corrigido. O supervisor será notificado.'
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
                                setDetailItem(selectedItem) // Reopen detail modal
                                setSelectedItem(null)
                            }}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={actionType === 'REPROVAR' ? 'destructive' : 'default'}
                            onClick={() => selectedItem && submitAction(selectedItem.id, actionType!, justificativa)}
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
        </div>
    )
}
