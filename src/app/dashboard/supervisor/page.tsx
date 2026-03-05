"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, Calendar, MapPin, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"

interface Cobertura {
    id: string
    data: string
    status: string
    posto: { nome: string }
    diarista: { nome: string }
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

    const getStatusBadge = (status: string) => {
        const map: any = {
            'PENDENTE': 'bg-yellow-100 text-yellow-800',
            'APROVADO': 'bg-green-100 text-green-800',
            'REPROVADO': 'bg-red-100 text-red-800',
            'PAGO': 'bg-blue-100 text-blue-800',
            'AJUSTE': 'bg-orange-100 text-orange-800',
        }
        return <Badge variant="outline" className={`${map[status] || 'bg-gray-100'} border-0`}>{status}</Badge>
    }

    return (
        <div className="space-y-10 pb-32">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        Minhas <span className="text-primary italic">Diárias</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Gestão e acompanhamento de registros</p>
                </div>
                {!loading && (
                    <Link href="/dashboard/supervisor/nova" className="w-full lg:w-auto">
                        <Button className="w-full lg:w-auto h-14 px-8 bg-slate-900 hover:bg-primary shadow-xl hover:shadow-primary/20 transition-all duration-500 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] group">
                            <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
                            Nova Diária
                        </Button>
                    </Link>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Registros Recentes</h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-6">
                        <div className="relative h-16 w-16">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Sincronizando registros...</p>
                    </div>
                ) : coberturas.length === 0 ? (
                    <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center opacity-60">
                        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <AlertCircle className="h-10 w-10 text-slate-200" />
                        </div>
                        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                            Nenhum registro localizado no sistema.
                        </div>
                        <Link href="/dashboard/supervisor/nova" className="mt-6">
                            <Button variant="ghost" className="text-primary font-bold uppercase tracking-widest text-[10px]">Lançar primeira diária</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {coberturas.map((item) => (
                            <Link key={item.id} href={`/dashboard/supervisor/editar/${item.id}`} className="block">
                                <Card className="glass-card group hover:scale-[1.01] transition-all duration-500 premium-shadow border-none">
                                    <CardContent className="p-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500 border border-slate-100 group-hover:border-primary/20">
                                                    <Calendar className="h-8 w-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                                            {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                                        </span>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {item.id.slice(0, 6)}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                                                        <div className="flex items-center gap-2 font-bold text-slate-600">
                                                            <MapPin className="h-4 w-4 text-primary opacity-50" />
                                                            {item.posto.nome}
                                                        </div>
                                                        <div className="hidden sm:block h-3 w-[1px] bg-slate-200" />
                                                        <div className="flex items-center gap-2 font-medium text-slate-500">
                                                            <User className="h-4 w-4 text-orange-400 opacity-50" />
                                                            {item.diarista.nome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:hidden">Status</span>
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
