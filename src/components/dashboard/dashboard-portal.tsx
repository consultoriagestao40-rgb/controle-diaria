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
    ArrowRight,
    Camera,
    User as UserIcon,
    Settings
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

interface DashboardPortalProps {
    user: { name?: string | null, role?: string, avatarUrl?: string | null }
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
    const searchParams = useSearchParams()

    // Profile & Avatar State
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    // Sync state when prop changes (e.g. after router.refresh())
    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    useEffect(() => {
        fetchMetrics()
    }, [])

    useEffect(() => {
        const action = searchParams.get("action")
        if (action === "reembolso") {
            setIsReembolsoOpen(true)
        } else if (action === "adiantamento") {
            setIsAdiantamentoOpen(true)
        }
    }, [searchParams])

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
            <div className="relative -mt-4 -mx-4 md:mt-0 md:mx-0 rounded-none md:rounded-3xl bg-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-2xl border-b md:border border-white/5">
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

            {/* Profile Edit Modal */}
            <ProfileDialog 
                isOpen={isProfileOpen} 
                onOpenChange={setIsProfileOpen} 
                user={user}
                onSuccess={(newUrl) => setAvatarUrl(newUrl)}
            />
        </div>
    )
}
