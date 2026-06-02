"use client"

import { useState, useEffect } from "react"
import { 
    Receipt, 
    Wallet, 
    FileText, 
    DollarSign, 
    Plus, 
    CalendarPlus, 
    Calendar,
    BarChart, 
    Loader2, 
    ArrowUpRight, 
    ArrowDownLeft,
    ChevronRight,
    CircleHelp,
    AlertCircle,
    Trash2,
    FileUp,
    CheckCircle,
    ArrowRight
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

interface DashboardPortalProps {
    user: { name?: string | null, role?: string }
    logoUrl?: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

export function DashboardPortal({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: DashboardPortalProps) {
    const [metrics, setMetrics] = useState<any>(null)
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isReembolsoOpen, setIsReembolsoOpen] = useState(false)
    const [isAdiantamentoOpen, setIsAdiantamentoOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        fetchMetrics()
        
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            const action = params.get("action")
            if (action === "reembolso") {
                setIsReembolsoOpen(true)
            } else if (action === "adiantamento") {
                setIsAdiantamentoOpen(true)
            }
        }
    }, [])

    const fetchMetrics = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/despesas/dashboard")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setMetrics(data.stats)
            setChartData(data.chartData)
        } catch {
            toast.error("Erro ao carregar dados do dashboard")
        } finally {
            setLoading(false)
        }
    }

    const handleSuccess = () => {
        fetchMetrics()
        router.refresh()
    }

    const handleCloseReembolso = () => {
        setIsReembolsoOpen(false)
        if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/dashboard")
        }
    }

    const handleCloseAdiantamento = () => {
        setIsAdiantamentoOpen(false)
        if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/dashboard")
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando seus dados...</p>
            </div>
        )
    }

    const initials = user.name
        ? user.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
        : "U"

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-16">
            {/* Header Banner - Estilo App Financeiro (Predominante Indigo/Slate) */}
            <div className="relative rounded-3xl bg-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xl font-black shadow-lg">
                            {initials}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                                Olá, {user.name?.split(" ")[0]}
                                <ArrowUpRight className="h-5 w-5 text-indigo-400 shrink-0" />
                            </h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {user.role === 'ADMIN' ? 'Administrador do Sistema' : `Colaborador (${user.role})`}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold px-3 py-1 text-[10px] uppercase tracking-wider rounded-xl">
                            Conta Verificada
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas (Estilo Nubank - Atalhos Redondos) */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ações Rápidas</h3>
                <div className="flex gap-4 sm:gap-6 overflow-x-auto py-2 scrollbar-hide shrink-0 snap-x">
                    
                    {acessoDespesas && (
                        <>
                            <button
                                onClick={() => setIsReembolsoOpen(true)}
                                className="flex flex-col items-center gap-2 group snap-center shrink-0 cursor-pointer text-center"
                            >
                                <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-16 text-center leading-tight">Novo Reembolso</span>
                            </button>

                            <button
                                onClick={() => setIsAdiantamentoOpen(true)}
                                className="flex flex-col items-center gap-2 group snap-center shrink-0 cursor-pointer text-center"
                            >
                                <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-20 text-center leading-tight">Novo Adiantamento</span>
                            </button>

                            <Link href="/dashboard/despesas" className="flex flex-col items-center gap-2 group snap-center shrink-0 text-center">
                                <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-16 text-center leading-tight">Prestar Contas</span>
                            </Link>
                        </>
                    )}

                    {acessoCoberturas && (
                        <>
                            <Link href="/dashboard/supervisor/nova" className="flex flex-col items-center gap-2 group snap-center shrink-0 text-center">
                                <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                    <CalendarPlus className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-16 text-center leading-tight">Nova Diária</span>
                            </Link>

                            <Link href="/dashboard/supervisor" className="flex flex-col items-center gap-2 group snap-center shrink-0 text-center">
                                <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-16 text-center leading-tight">Minhas Diárias</span>
                            </Link>
                        </>
                    )}

                    {user.role === 'ADMIN' && (
                        <Link href="/dashboard/despesas/admin/centros-custo" className="flex flex-col items-center gap-2 group snap-center shrink-0 text-center">
                            <div className="h-14 w-14 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 hover:border-indigo-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 shadow-md group-active:scale-95 transition-all duration-300">
                                <BarChart className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider w-16 text-center leading-tight">Centros Custo</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Números e Métricas Finanças (Estilo Nubank - Cards Minimalistas com borda leve e números grandes) */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Resumo de Despesas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1: Minhas Despesas (Geral) */}
                    <Card className="border border-slate-200/60 shadow-lg bg-white rounded-2xl hover:scale-[1.01] transition-transform duration-300">
                        <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Minhas Despesas</span>
                                    <h3 className="text-2xl font-black text-slate-900">R$ {metrics?.totalMinhasDespesas.toFixed(2)}</h3>
                                </div>
                                <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
                                    <Receipt className="h-4.5 w-4.5" />
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Acumulado total</span>
                        </CardContent>
                    </Card>

                    {/* Card 2: Despesa Mensal */}
                    <Card className="border border-slate-200/60 shadow-lg bg-white rounded-2xl hover:scale-[1.01] transition-transform duration-300">
                        <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Despesa Mensal</span>
                                    <h3 className="text-2xl font-black text-slate-900">R$ {metrics?.totalDespesaMensal.toFixed(2)}</h3>
                                </div>
                                <div className="h-9 w-9 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center text-cyan-500 shrink-0">
                                    <Wallet className="h-4.5 w-4.5" />
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gasto este mês</span>
                        </CardContent>
                    </Card>

                    {/* Card 3: Pendente de Prestação */}
                    <Card className="border border-slate-200/60 shadow-lg bg-white rounded-2xl hover:scale-[1.01] transition-transform duration-300">
                        <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">A Comprovar</span>
                                    <h3 className="text-2xl font-black text-amber-600">R$ {metrics?.totalPendentePrestacao.toFixed(2)}</h3>
                                </div>
                                <div className="h-9 w-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                                    <FileText className="h-4.5 w-4.5" />
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aguardando notas fiscais</span>
                        </CardContent>
                    </Card>

                    {/* Card 4: A Devolver (Desconto) */}
                    <Card className="border border-slate-200/60 shadow-lg bg-white rounded-2xl hover:scale-[1.01] transition-transform duration-300">
                        <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">A Devolver</span>
                                    <h3 className="text-2xl font-black text-rose-600">R$ {metrics?.totalPendenteDesconto.toFixed(2)}</h3>
                                </div>
                                <div className="h-9 w-9 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                                    <DollarSign className="h-4.5 w-4.5" />
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Desconto em folha / Pendência</span>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Comparativo Gráfico de Despesas (Área Interativa Recharts com Gradiente Indigo) */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Evolução Mensal de Gastos</h3>
                <Card className="border border-slate-200/60 shadow-xl bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-black text-slate-900">Evolução dos Últimos 6 Meses</CardTitle>
                        <CardDescription className="text-xs text-slate-500 font-medium">Comparativo mensal acumulado de solicitações de despesas realizadas por você.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="mes" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    fontWeight="bold" 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    fontWeight="bold" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(val) => `R$ ${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0f172a', 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        padding: '12px'
                                    }}
                                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']}
                                    labelStyle={{ color: '#94a3b8', paddingBottom: '4px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="valor" 
                                    stroke="#4f46e5" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorVal)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Modais de lançamento direto */}
            <ReembolsoModal 
                isOpen={isReembolsoOpen} 
                onClose={handleCloseReembolso} 
                onSuccess={handleSuccess}
                user={user}
            />

            <AdiantamentoModal 
                isOpen={isAdiantamentoOpen} 
                onClose={handleCloseAdiantamento} 
                onSuccess={handleSuccess}
                user={user}
            />
        </div>
    )
}

interface ReembolsoModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    user: any
}

function ReembolsoModal({ isOpen, onClose, onSuccess, user }: ReembolsoModalProps) {
    const [descricao, setDescricao] = useState("")
    const [anexos, setAnexos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [itens, setItens] = useState<any[]>([])
    const [categorias, setCategorias] = useState<string[]>([])
    
    const [itemCategoria, setItemCategoria] = useState("")
    const [itemDescricao, setItemDescricao] = useState("")
    const [itemData, setItemData] = useState("")
    const [itemQuantidade, setItemQuantidade] = useState("1")
    const [itemValorUnitario, setItemValorUnitario] = useState("")

    useEffect(() => {
        if (!isOpen) return
        setDescricao("")
        setAnexos([])
        setItens([])
        setItemCategoria("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        
        fetch("/api/politicas")
            .then(res => res.json())
            .then(data => {
                if (data.politicas && Array.isArray(data.politicas)) {
                    setCategorias(data.politicas.map((p: any) => p.categoria))
                } else {
                    setCategorias(["REFEICAO", "HOSPEDAGEM", "TRANSPORTE", "OUTROS"])
                }
            })
            .catch(() => {
                setCategorias(["REFEICAO", "HOSPEDAGEM", "TRANSPORTE", "OUTROS"])
            })
    }, [isOpen])

    const handleAddItem = () => {
        if (!itemCategoria || !itemDescricao || !itemData || !itemQuantidade || !itemValorUnitario) {
            toast.error("Por favor, preencha todos os campos do item.")
            return
        }

        const qty = parseInt(itemQuantidade)
        const valUnit = parseFloat(itemValorUnitario)

        if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
            toast.error("Quantidade e valor unitário do item devem ser maiores que zero.")
            return
        }

        const newItem = {
            categoria: itemCategoria,
            descricao: itemDescricao,
            data: itemData,
            quantidade: qty,
            valorUnitario: valUnit,
            valorTotal: qty * valUnit
        }

        setItens([...itens, newItem])
        
        setItemCategoria("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        
        toast.success("Item adicionado com sucesso!")
    }

    const handleRemoveItem = (idx: number) => {
        setItens(itens.filter((_, i) => i !== idx))
        toast.success("Item removido.")
    }

    const totalDespesa = itens.reduce((acc, item) => acc + item.valorTotal, 0)

    const handleFileSimulate = () => {
        setUploading(true)
        setTimeout(() => {
            const mockFile = {
                url: `/mock/comprovante_${Math.floor(Math.random() * 1000)}.pdf`,
                nomeOriginal: `nota_fiscal_${Date.now().toString().slice(-4)}.pdf`,
                tamanho: 1024 * Math.floor(Math.random() * 500 + 100),
                tipo: "application/pdf"
            }
            setAnexos([...anexos, mockFile])
            setUploading(false)
            toast.success("Comprovante anexado com sucesso!")
        }, 1500)
    }

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!descricao) {
            toast.error("Por favor, preencha a finalidade geral da solicitação.")
            return
        }

        if (itens.length === 0) {
            toast.error("É necessário adicionar pelo menos um item à despesa.")
            return
        }

        if (anexos.length === 0) {
            toast.error("Para solicitações de Reembolso, é obrigatório anexar pelo menos um comprovante.")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "REEMBOLSO",
                    descricao,
                    valorSolicitado: Math.round(totalDespesa * 100) / 100,
                    itens,
                    anexos,
                    enviarParaAprovacao
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao criar solicitação")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Solicitação de reembolso enviada para aprovação!"
                    : "Rascunho de reembolso salvo com sucesso!"
            )
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-slate-200">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Receipt className="h-6 w-6 text-indigo-500" />
                        Nova Solicitação de Reembolso
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs sm:text-sm font-medium">
                        Use essa modalidade se você já efetuou o gasto com recursos próprios e necessita do reembolso da empresa.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="desc-reemb" className="font-bold text-slate-700 text-xs sm:text-sm">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="desc-reemb"
                            placeholder="Descreva o propósito geral da despesa (ex: Viagem corporativa para Londrina - Visita técnica...)"
                            rows={2}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-55/10 transition-colors text-xs sm:text-sm"
                        />
                    </div>

                    {/* Detalhamento dos Itens */}
                    <div className="pt-4 border-t border-slate-100 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-1 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Itens / Lançamentos da Despesa</h3>
                        </div>

                        {/* Form para adicionar item */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adicionar Novo Lançamento</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {/* Categoria */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600">Categoria *</Label>
                                    <select
                                        value={itemCategoria}
                                        onChange={(e) => setItemCategoria(e.target.value)}
                                        className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {categorias.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Data */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600">Data do Evento *</Label>
                                    <Input
                                        type="date"
                                        value={itemData}
                                        onChange={(e) => setItemData(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                                    />
                                </div>

                                {/* Quantidade */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600">Quantidade *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={itemQuantidade}
                                        onChange={(e) => setItemQuantidade(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                    />
                                </div>

                                {/* Valor Unitario */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600">Valor Unitário (R$) *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            value={itemValorUnitario}
                                            onChange={(e) => setItemValorUnitario(e.target.value)}
                                            className="pl-9 h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Descrição do Item */}
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-600">Descrição / Justificativa *</Label>
                                    <Input
                                        placeholder="Ex: Almoço com cliente ou Hospedagem"
                                        value={itemDescricao}
                                        onChange={(e) => setItemDescricao(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="h-10 px-4 bg-slate-900 hover:bg-indigo-600 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" /> Adicionar Item
                                </Button>
                            </div>
                        </div>

                        {/* Lista de itens inseridos */}
                        {itens.length > 0 ? (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                <th className="py-2.5 px-3">Categoria</th>
                                                <th className="py-2.5 px-3">Data</th>
                                                <th className="py-2.5 px-3">Descrição</th>
                                                <th className="py-2.5 px-3 text-center">Qtd.</th>
                                                <th className="py-2.5 px-3 text-right">Unitário</th>
                                                <th className="py-2.5 px-3 text-right">Total</th>
                                                <th className="py-2.5 px-3 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itens.map((item, idx) => (
                                                <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50 text-xs font-semibold text-slate-600">
                                                    <td className="py-3 px-3 font-bold text-slate-900">{item.categoria}</td>
                                                    <td className="py-3 px-3">{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                                                    <td className="py-3 px-3 max-w-[150px] truncate">{item.descricao}</td>
                                                    <td className="py-3 px-3 text-center font-bold">{item.quantidade}</td>
                                                    <td className="py-3 px-3 text-right font-medium">R$ {Number(item.valorUnitario).toFixed(2)}</td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-800">R$ {Number(item.valorTotal).toFixed(2)}</td>
                                                    <td className="py-3 px-3 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg active:scale-95"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="bg-slate-50 p-3.5 border-t flex justify-between items-center text-xs font-black text-slate-800 uppercase tracking-wider">
                                    <span>Total da Solicitação:</span>
                                    <span className="text-base text-indigo-600 font-black">R$ {totalDespesa.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="border-dashed border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/30">
                                <Receipt className="h-8 w-8 text-slate-300 mb-2 animate-pulse" />
                                <p className="text-xs font-bold text-slate-400">Nenhum item adicionado à despesa ainda.</p>
                            </div>
                        )}
                    </div>

                    {/* Comprovantes */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                                <Label className="font-bold text-slate-700 text-xs sm:text-sm">
                                    Comprovantes & Notas Fiscais *
                                </Label>
                                <p className="text-[11px] text-slate-400">Anexe PDFs ou Imagens legíveis comprovando os gastos.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={handleFileSimulate}
                                className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileUp className="h-4 w-4 text-indigo-500" />
                                )}
                                Anexar Nota/Recibo
                            </Button>
                        </div>

                         {anexos.length > 0 ? (
                            <div className="grid gap-2.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                                {anexos.map((file, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                                                <CheckCircle className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{file.nomeOriginal}</p>
                                                <p className="text-[10px] text-slate-400">{(file.tamanho / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:flex-none sm:w-32">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Valor do Recibo"
                                                    value={file.valor || ""}
                                                    onChange={(e) => {
                                                        const updated = [...anexos]
                                                        updated[idx].valor = parseFloat(e.target.value) || 0
                                                        setAnexos(updated)
                                                    }}
                                                    className="pl-7 h-9 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[11px]"
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t border-slate-200/60 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px]">
                                    <div className="font-bold text-slate-700 uppercase tracking-wider">
                                        Soma dos Comprovantes: <span className="text-slate-900 font-black text-xs ml-1">R$ {anexos.reduce((acc, f) => acc + (f.valor || 0), 0).toFixed(2)}</span>
                                    </div>
                                    
                                    {(() => {
                                        const totalEvid = anexos.reduce((acc, f) => acc + (f.valor || 0), 0)
                                        const diff = Math.abs(totalEvid - totalDespesa)
                                        if (diff < 0.01) {
                                            return (
                                                <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-lg border border-green-200 text-[9px] uppercase tracking-wider">
                                                    ✅ Bate com itens!
                                                </span>
                                            )
                                        } else {
                                            return (
                                                <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200 text-[9px] uppercase tracking-wider">
                                                    ⚠️ Divergência: R$ {diff.toFixed(2)}
                                                </span>
                                            )
                                        }
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="border-dashed border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50">
                                <FileUp className="h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-[11px] font-medium text-slate-400">É obrigatório anexar os comprovantes fiscais dos itens lançados.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="h-12 px-6 rounded-2xl font-black uppercase tracking-wider text-[10px] border-slate-200 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Salvar Rascunho
                    </Button>
                    <Button
                        type="button"
                        disabled={loading || uploading}
                        onClick={() => handleSubmit(true)}
                        className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-black uppercase tracking-wider text-[10px] gap-2 active:scale-95 transition-all group cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                            <>
                                <span>Enviar para Aprovação</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface AdiantamentoModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    user: any
}

function AdiantamentoModal({ isOpen, onClose, onSuccess, user }: AdiantamentoModalProps) {
    const [descricao, setDescricao] = useState("")
    const [valorAdiantamento, setValorAdiantamento] = useState("")
    const [dataAdiantamento, setDataAdiantamento] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setDescricao("")
        setValorAdiantamento("")
        setDataAdiantamento("")
    }, [isOpen])

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!descricao) {
            toast.error("Por favor, preencha a finalidade geral da solicitação.")
            return
        }

        if (!dataAdiantamento) {
            toast.error("Por favor, selecione a data prevista da viagem/operação.")
            return
        }

        const val = parseFloat(valorAdiantamento)
        if (isNaN(val) || val <= 0) {
            toast.error("Por favor, insira um valor total previsto maior que zero.")
            return
        }

        setLoading(true)

        try {
            const roundedValorAdiantamento = Math.round(val * 100) / 100
            const finalItens = [{
                categoria: "VIAGEM",
                descricao: descricao,
                data: dataAdiantamento,
                quantidade: 1,
                valorUnitario: roundedValorAdiantamento,
                valorTotal: roundedValorAdiantamento
            }]

            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "ADIANTAMENTO",
                    descricao,
                    valorSolicitado: roundedValorAdiantamento,
                    itens: finalItens,
                    anexos: [],
                    enviarParaAprovacao
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao criar solicitação")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Solicitação de adiantamento enviada para aprovação!"
                    : "Rascunho de adiantamento salvo com sucesso!"
            )
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-slate-200">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-indigo-500" />
                        Nova Solicitação de Adiantamento
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs sm:text-sm font-medium">
                        Use essa modalidade para prever um gasto corporativo e receber o valor adiantado (sujeito a prestação de contas posterior).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="desc-adiant" className="font-bold text-slate-700 text-xs sm:text-sm">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="desc-adiant"
                            placeholder="Descreva o propósito geral da viagem/operação (ex: Participação na feira de tecnologia em SP...)"
                            rows={3}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors text-xs sm:text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Data Prevista */}
                        <div className="space-y-2">
                            <Label htmlFor="dataAdiantamento" className="font-bold text-slate-700 text-xs sm:text-sm">Data Prevista *</Label>
                            <Input
                                id="dataAdiantamento"
                                type="date"
                                value={dataAdiantamento}
                                onChange={(e) => setDataAdiantamento(e.target.value)}
                                className="rounded-xl border-slate-200 focus:border-indigo-55 focus:ring-indigo-500/10 transition-colors h-11 text-xs"
                            />
                        </div>

                        {/* Valor Solicitado */}
                        <div className="space-y-2">
                            <Label htmlFor="valorAdiantamento" className="font-bold text-slate-700 text-xs sm:text-sm">Valor Total Previsto *</Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                                <Input
                                    id="valorAdiantamento"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valorAdiantamento}
                                    onChange={(e) => setValorAdiantamento(e.target.value)}
                                    className="pl-8 rounded-xl border-slate-200 focus:border-indigo-55 focus:ring-indigo-500/10 transition-colors h-11 text-xs font-black"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="h-12 px-6 rounded-2xl font-black uppercase tracking-wider text-[10px] border-slate-200 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Salvar Rascunho
                    </Button>
                    <Button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-black uppercase tracking-wider text-[10px] gap-2 active:scale-95 transition-all group cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                            <>
                                <span>Enviar para Aprovação</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

