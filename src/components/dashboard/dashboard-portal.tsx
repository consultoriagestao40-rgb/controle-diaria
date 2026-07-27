"use client"

import { useState, useEffect } from "react"
import { 
    Receipt, 
    Wallet, 
    FileText, 
    DollarSign, 
    CalendarPlus, 
    Calendar,
    BarChart, 
    Loader2, 
    AlertCircle,
    Camera,
    Settings,
    Zap,
    Users,
    Activity,
    TrendingUp,
    Filter,
    RefreshCw
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
import { useRouter, useSearchParams } from "next/navigation"
import { ReembolsoModal } from "./reembolso-modal"
import { AdiantamentoModal } from "./adiantamento-modal"
import { ProfileDialog } from "./profile-dialog"
import { cn, formatCurrency } from "@/lib/utils"

interface DashboardPortalProps {
    user: { name?: string | null, role?: string, avatarUrl?: string | null, cargo?: string | null }
    logoUrl?: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

export function DashboardPortal({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: DashboardPortalProps) {
    const [activeTab, setActiveTab] = useState<"coberturas" | "despesas">("coberturas")
    const [metrics, setMetrics] = useState<any>(null)
    const [chartData, setChartData] = useState<any[]>([])
    const [coberturasStats, setCoberturasStats] = useState<any>(null)
    const [filterOptions, setFilterOptions] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Filtros de Plantões & Coberturas
    const [filterDiarista, setFilterDiarista] = useState("ALL")
    const [filterReserva, setFilterReserva] = useState("ALL")
    const [filterMotivo, setFilterMotivo] = useState("ALL")
    const [filterPosto, setFilterPosto] = useState("ALL")
    const [filterSupervisor, setFilterSupervisor] = useState("ALL")

    const [isReembolsoOpen, setIsReembolsoOpen] = useState(false)
    const [isAdiantamentoOpen, setIsAdiantamentoOpen] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    // Profile & Avatar State
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    useEffect(() => {
        fetchMetrics()
    }, [filterDiarista, filterReserva, filterMotivo, filterPosto, filterSupervisor])

    useEffect(() => {
        const action = searchParams.get("action")
        if (action === "reembolso") {
            setIsReembolsoOpen(true)
            setActiveTab("despesas")
        } else if (action === "adiantamento") {
            setIsAdiantamentoOpen(true)
            setActiveTab("despesas")
        }
    }, [searchParams])

    const fetchMetrics = async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams()
            if (filterDiarista !== "ALL") query.append("diaristaId", filterDiarista)
            if (filterReserva !== "ALL") query.append("reservaId", filterReserva)
            if (filterMotivo !== "ALL") query.append("motivoId", filterMotivo)
            if (filterPosto !== "ALL") query.append("postoId", filterPosto)
            if (filterSupervisor !== "ALL") query.append("supervisorId", filterSupervisor)

            const res = await fetch(`/api/despesas/dashboard?${query.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setMetrics(data.stats)
            setChartData(data.chartData)
            setCoberturasStats(data.coberturasStats)
            setFilterOptions(data.filterOptions)
        } catch {
            toast.error("Erro ao carregar dados do dashboard")
        } finally {
            setLoading(false)
        }
    }

    const handleClearFilters = () => {
        setFilterDiarista("ALL")
        setFilterReserva("ALL")
        setFilterMotivo("ALL")
        setFilterPosto("ALL")
        setFilterSupervisor("ALL")
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

    if (loading && !metrics) {
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

    const isAnyFilterActive = filterDiarista !== "ALL" || filterReserva !== "ALL" || filterMotivo !== "ALL" || filterPosto !== "ALL" || filterSupervisor !== "ALL"
    const totalGeralCoberturas = coberturasStats?.totalValor || 0

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6 pb-16 font-sans">
            {/* Header Banner - Exibido apenas no Mobile */}
            <div className="relative -mt-4 -mx-4 rounded-none bg-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border-b border-white/5 md:hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsProfileOpen(true)}
                            className="h-16 w-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xl font-black shadow-lg overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all group/avatar relative shrink-0"
                            title="Alterar foto de perfil"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={user.name || "Perfil"} className="h-full w-full object-cover" />
                            ) : (
                                <span>{initials}</span>
                            )}
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                <Camera className="h-4 w-4 text-white" />
                            </div>
                        </button>
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                                Olá, {user.name?.split(" ")[0]}
                                <button 
                                    onClick={() => setIsProfileOpen(true)}
                                    className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer border border-white/5"
                                    title="Editar Perfil"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                </button>
                            </h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {user.cargo || (user.role === 'ADMIN' ? 'Administrador' : user.role === 'APROVADOR_N1' ? 'Aprovador N1' : user.role === 'APROVADOR_N2' ? 'Aprovador N2' : user.role === 'APROVADOR' ? 'Aprovador N2' : user.role === 'SUPERVISOR' ? 'Supervisor' : user.role === 'FINANCEIRO' ? 'Financeiro' : user.role === 'ENCARREGADO' ? 'Encarregado' : user.role === 'RH' ? 'Recursos Humanos' : user.role)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas - Exibido apenas no Mobile */}
            <div className="space-y-3 md:hidden">
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
                </div>
            </div>

            {/* SELETOR DE ABAS PRINCIPAIS DO DASHBOARD */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab("coberturas")}
                    className={cn(
                        "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-black transition-all cursor-pointer shadow-xs border",
                        activeTab === "coberturas"
                            ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                            : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200"
                    )}
                >
                    <Calendar className={cn("h-4 w-4", activeTab === "coberturas" ? "text-cyan-400" : "text-slate-400")} />
                    <span>Plantões & Coberturas</span>
                    {coberturasStats?.totalQtd > 0 && (
                        <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-extrabold",
                            activeTab === "coberturas" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-100 text-slate-600"
                        )}>
                            {coberturasStats.totalQtd}
                        </span>
                    )}
                </button>

                {acessoDespesas && (
                    <button
                        type="button"
                        onClick={() => setActiveTab("despesas")}
                        className={cn(
                            "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-black transition-all cursor-pointer shadow-xs border",
                            activeTab === "despesas"
                                ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                                : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200"
                        )}
                    >
                        <Receipt className={cn("h-4 w-4", activeTab === "despesas" ? "text-indigo-400" : "text-slate-400")} />
                        <span>Reembolsos & Despesas</span>
                    </button>
                )}
            </div>

            {/* CONTEÚDO DA ABA 1: PLANTÕES & COBERTURAS (PRIMEIRA ABA / DEFAULT) */}
            {activeTab === "coberturas" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* BARRA DE FILTROS LARGURA TOTAL COMPACTA */}
                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-cyan-600" />
                                    Filtros de Pesquisa
                                </span>
                                {isAnyFilterActive && (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {/* 1. Diarista */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Diarista</label>
                                    <select
                                        value={filterDiarista}
                                        onChange={(e) => setFilterDiarista(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    >
                                        <option value="ALL">Todos</option>
                                        {filterOptions?.diaristas?.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Colaborador (Reserva) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Colaborador</label>
                                    <select
                                        value={filterReserva}
                                        onChange={(e) => setFilterReserva(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    >
                                        <option value="ALL">Todos</option>
                                        {filterOptions?.reservas?.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Motivo */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Motivo</label>
                                    <select
                                        value={filterMotivo}
                                        onChange={(e) => setFilterMotivo(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    >
                                        <option value="ALL">Todos</option>
                                        {filterOptions?.motivos?.map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.descricao}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. Posto */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Posto</label>
                                    <select
                                        value={filterPosto}
                                        onChange={(e) => setFilterPosto(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    >
                                        <option value="ALL">Todos</option>
                                        {filterOptions?.postos?.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 5. Supervisor */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Supervisor</label>
                                    <select
                                        value={filterSupervisor}
                                        onChange={(e) => setFilterSupervisor(e.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    >
                                        <option value="ALL">Todos</option>
                                        {filterOptions?.supervisores?.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 1º: GRÁFICO DE LINHA DA FOTO SUBIDO PARA FICAR ACIMA DOS CARDS */}
                    <Card className="rounded-3xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-5 sm:p-6 pb-1 sm:pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                                        Evolução Mensal de Plantões ({coberturasStats?.anoVigente || 2026})
                                    </CardTitle>
                                    <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                                        Valores totais acumulados mês a mês com a visão completa do ano vigente.
                                    </CardDescription>
                                </div>
                                <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 font-black text-xs px-3 py-1 rounded-xl shadow-xs">
                                    Ano Vigente
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 sm:p-6 pt-3 sm:pt-4">
                            <div className="h-64 sm:h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={coberturasStats?.chartDataAno || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCoberturas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.35}/>
                                                <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="mes" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                            tickFormatter={(val) => `R$ ${val}`}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1">
                                                            <p className="font-extrabold text-cyan-400">{data.mes}</p>
                                                            <p className="font-black text-base">{formatCurrency(data.valor)}</p>
                                                            <p className="text-[11px] text-slate-400 font-semibold">{data.qtd} plantões realizados</p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="valor" 
                                            stroke="#0891b2" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorCoberturas)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2º: CARDS ACUMULADOS COMPACTOS DE VALORES POR TIPO DE DIÁRIA COM PORCENTAGEM (%) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Acumulado de Valores por Tipo de Diária
                            </h3>
                            <Badge variant="outline" className="px-3 py-1 rounded-xl text-xs font-extrabold bg-white text-slate-800 border-slate-200 shadow-xs gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-cyan-600" />
                                Total Geral: {formatCurrency(totalGeralCoberturas)}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {coberturasStats?.statsPorMotivo && coberturasStats.statsPorMotivo.length > 0 ? (
                                coberturasStats.statsPorMotivo.map((motivoItem: any, idx: number) => {
                                    const icons = [AlertCircle, Zap, Calendar, Users, Activity, FileText]
                                    const IconComp = icons[idx % icons.length]
                                    const isFalta = motivoItem.descricao.toLowerCase().includes("falta")
                                    const isAtestado = motivoItem.descricao.toLowerCase().includes("atestado")
                                    const isExtra = motivoItem.descricao.toLowerCase().includes("extra")

                                    const pct = totalGeralCoberturas > 0
                                        ? ((motivoItem.totalValor / totalGeralCoberturas) * 100).toFixed(1)
                                        : "0.0"

                                    const pctNumber = parseFloat(pct)

                                    return (
                                        <Card key={motivoItem.descricao} className="rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden bg-white group">
                                            <CardContent className="p-4 sm:p-5 space-y-3">
                                                {/* Linha Superior: Nome do Motivo + Ícone Compacto */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 truncate max-w-[150px]">
                                                        {motivoItem.descricao}
                                                    </span>
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105",
                                                        isFalta ? "bg-amber-50 text-amber-600 border border-amber-200/60" :
                                                        isAtestado ? "bg-cyan-50 text-cyan-600 border border-cyan-200/60" :
                                                        isExtra ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60" :
                                                        "bg-indigo-50 text-indigo-600 border border-indigo-200/60"
                                                    )}>
                                                        <IconComp className="h-4 w-4" />
                                                    </div>
                                                </div>

                                                {/* Valor Principal + Badge de % */}
                                                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                                        {formatCurrency(motivoItem.totalValor)}
                                                    </h3>
                                                    <Badge className={cn(
                                                        "px-2 py-0.5 rounded-full text-[11px] font-black border shrink-0",
                                                        isFalta ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                        isAtestado ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                                                        isExtra ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                        "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                    )}>
                                                        {pct}%
                                                    </Badge>
                                                </div>

                                                {/* Qtd Plantões + Barra de Progresso Fina */}
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-bold text-slate-400">
                                                        {motivoItem.count} {motivoItem.count === 1 ? 'plantão registrado' : 'plantões registrados'}
                                                    </p>
                                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-500",
                                                                isFalta ? "bg-amber-500" :
                                                                isAtestado ? "bg-cyan-500" :
                                                                isExtra ? "bg-emerald-500" :
                                                                "bg-indigo-500"
                                                            )}
                                                            style={{ width: `${Math.min(pctNumber, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })
                            ) : (
                                <div className="col-span-full p-6 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-xs">
                                    <p className="text-sm font-bold text-slate-600">Nenhum plantão ou cobertura encontrado com os filtros selecionados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEÚDO DA ABA 2: REEMBOLSOS & DESPESAS (SEGUNDA ABA) */}
            {activeTab === "despesas" && acessoDespesas && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-3">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resumo de Despesas</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Minhas Despesas</span>
                                        <div className="h-9 w-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                            {formatCurrency(metrics?.totalMinhasDespesas || 0)}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acumulado Total</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Despesa Mensal</span>
                                        <div className="h-9 w-9 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                                            <Receipt className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                            {formatCurrency(metrics?.totalDespesaMensal || 0)}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gasto Este Mês</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">A Comprovar</span>
                                        <div className="h-9 w-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                                            {formatCurrency(metrics?.totalPendentePrestacao || 0)}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Notas Fiscais</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">A Devolver</span>
                                        <div className="h-9 w-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                            <DollarSign className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                                            {formatCurrency(metrics?.totalPendenteDesconto || 0)}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desconto em Folha / Pendência</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Gráfico de Evolução de Despesas (Últimos 6 Meses) */}
                    <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                                Evolução dos Últimos 6 Meses (Despesas)
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold text-slate-400">
                                Comparativo mensal acumulado de solicitações de despesas realizadas por você.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-4">
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="mes" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                            tickFormatter={(val) => `R$ ${val}`}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1">
                                                            <p className="font-extrabold text-indigo-400">{payload[0].payload.mes}</p>
                                                            <p className="font-black text-sm">{formatCurrency(payload[0].value as number)}</p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="valor" 
                                            stroke="#4f46e5" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorDespesas)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modais de Reembolso e Adiantamento */}
            <ReembolsoModal
                isOpen={isReembolsoOpen}
                onClose={handleCloseReembolso}
                onSuccess={() => fetchMetrics()}
                user={user}
            />

            <AdiantamentoModal
                isOpen={isAdiantamentoOpen}
                onClose={handleCloseAdiantamento}
                onSuccess={() => fetchMetrics()}
                user={user}
            />

            {/* Modal de Perfil */}
            <ProfileDialog
                isOpen={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                user={user}
                onSuccess={(newUrl) => setAvatarUrl(newUrl)}
            />
        </div>
    )
}
