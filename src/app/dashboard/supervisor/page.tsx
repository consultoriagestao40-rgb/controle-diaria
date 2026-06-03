"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, Calendar, MapPin, User, AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle, Receipt, Wallet, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

interface Cobertura {
    id: string
    data: string
    status: string
    posto: { nome: string }
    diarista: { nome: string }
    valor: number | string
}

export default function SupervisorDashboard() {
    const [coberturas, setCoberturas] = useState<Cobertura[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch("/api/supervisor/coberturas", { cache: 'no-store' })
            if (!res.ok) throw new Error()
            const data = await res.json()
            setCoberturas(data)
        } catch {
            toast.error("Erro ao carregar lançamentos")
        } finally {
            setLoading(false)
        }
    }

    const totalLancado = coberturas.reduce((acc, item) => acc + Number(item.valor || 0), 0)
    const totalPago = coberturas
        .filter(item => ['PAGO', 'APROVADO'].includes(item.status))
        .reduce((acc, item) => acc + Number(item.valor || 0), 0)
    const totalPendente = coberturas
        .filter(item => ['PENDENTE', 'AJUSTE'].includes(item.status))
        .reduce((acc, item) => acc + Number(item.valor || 0), 0)

    const getStatusCircleIcon = (status: string) => {
        const iconMap: any = {
            'PENDENTE': <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />,
            'APROVADO': <CheckCircle2 className="h-4 w-4 text-green-500" />,
            'REPROVADO': <XCircle className="h-4 w-4 text-red-500" />,
            'PAGO': <CheckCircle2 className="h-4 w-4 text-primary" />,
            'AJUSTE': <AlertTriangle className="h-4 w-4 text-orange-500" />,
        }
        const bgMap: any = {
            'PENDENTE': 'bg-yellow-50',
            'APROVADO': 'bg-green-50',
            'REPROVADO': 'bg-red-50',
            'PAGO': 'bg-blue-50',
            'AJUSTE': 'bg-orange-50',
        }
        return (
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${bgMap[status] || 'bg-slate-50'} border border-slate-100`}>
                {iconMap[status] || <AlertCircle className="h-4 w-4 text-slate-400" />}
            </div>
        )
    }

    const getStatusTextColor = (status: string) => {
        const map: any = {
            'PENDENTE': 'text-yellow-600',
            'APROVADO': 'text-green-600',
            'REPROVADO': 'text-red-600',
            'PAGO': 'text-primary',
            'AJUSTE': 'text-orange-600',
        }
        return map[status] || 'text-slate-400'
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Sincronizando registros...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-32 max-w-2xl mx-auto px-1 sm:px-0">
            {/* Header Greeting */}
            <div className="space-y-1 px-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Minhas Diárias
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão e Acompanhamento Financeiro</p>
            </div>

            {/* Fintech Card (Resumo Financeiro) */}
            <div className="bg-slate-950 text-white rounded-none sm:rounded-3xl p-6 shadow-xl relative overflow-hidden -mx-4 sm:mx-0">
                <div className="absolute top-[-30%] right-[-10%] w-[180px] h-[180px] bg-primary/25 rounded-full blur-[40px] pointer-events-none" />
                
                <div className="space-y-1 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Total Registrado</span>
                    <div className="text-3xl font-black tracking-tighter flex items-baseline gap-1 text-white">
                        <span className="text-base font-bold text-slate-400">R$</span>
                        <span>{totalLancado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10">
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500" /> Aprovado / Pago
                        </span>
                        <p className="text-sm font-black text-white tracking-tight">
                            R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" /> Em Análise
                        </span>
                        <p className="text-sm font-black text-white tracking-tight">
                            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 px-1">
                <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Ações Rápidas</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                    <Link href="/dashboard/supervisor/nova" className="flex flex-col items-center gap-2 shrink-0 group">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <Plus className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight group-hover:text-primary transition-colors">Nova Diária</span>
                    </Link>
                    <Link href="/dashboard/despesas" className="flex flex-col items-center gap-2 shrink-0 group">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-indigo-500 group-hover:scale-105 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight group-hover:text-indigo-500 transition-colors">Ver Despesas</span>
                    </Link>
                    <Link href="/dashboard/despesas?new=reembolso" className="flex flex-col items-center gap-2 shrink-0 group">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-teal-500 group-hover:scale-105 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight group-hover:text-teal-500 transition-colors">Reembolso</span>
                    </Link>
                    <Link href="/dashboard/despesas?new=adiantamento" className="flex flex-col items-center gap-2 shrink-0 group">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-amber-500 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight group-hover:text-amber-500 transition-colors">Adiantamento</span>
                    </Link>
                </div>
            </div>

            {/* Extrato Feed */}
            <div className="space-y-4 px-1">
                <div className="flex items-center justify-between">
                    <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Extrato de Lançamentos</h2>
                    <span className="text-[10px] font-bold text-slate-400 tracking-tight">{coberturas.length} registros</span>
                </div>

                {coberturas.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-200 py-20 flex flex-col items-center justify-center bg-white rounded-3xl">
                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-slate-300" />
                        </div>
                        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            Nenhum registro localizado.
                        </div>
                        <Link href="/dashboard/supervisor/nova" className="mt-4">
                            <Button variant="ghost" className="text-primary font-bold uppercase tracking-widest text-[9px]">Registrar Diária</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
                        {coberturas.map((item, idx) => (
                            <Link key={item.id} href={`/dashboard/supervisor/editar/${item.id}`} className="block">
                                <div className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all ${idx !== coberturas.length - 1 ? 'border-b border-slate-100/80' : ''}`}>
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
                                            R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${getStatusTextColor(item.status)}`}>
                                            {item.status}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
