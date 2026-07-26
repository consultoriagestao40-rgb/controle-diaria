"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    UserCheck, Wallet, ArrowUpRight, Clock, MapPin, CheckCircle2,
    PlayCircle, StopCircle, Zap, LogOut, Loader2, Sparkles, AlertCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface DiaristaData {
    diarista: {
        id: string
        nome: string
        cpf: string
        chavePix: string
        telefone: string
    }
    saldos: {
        disponivel: number
        aReceber: number
        jaPago: number
    }
    plantaoHoje: {
        id: string
        postoNome: string
        postoLat: number | null
        postoLng: number | null
        postoRaio: number
        valor: number
        data: string
        horaInicio: string | null
        horaFim: string | null
        ponto: {
            id: string
            checkInAt: string
            checkOutAt: string | null
            status: "EM_ANDAMENTO" | "CONCLUIDO"
        } | null
    } | null
    historico: Array<{
        id: string
        data: string
        postoNome: string
        valor: number
        status: string
        pontoStatus: string | null
        podeAntecipar: boolean
    }>
    antecipacoes: Array<{
        id: string
        coberturaId: string
        postoNome: string
        valorOriginal: number
        valorSolicitado: number
        status: string
        solicitadoEm: string
    }>
}

export default function DiaristaDashboardPage() {
    const router = useRouter()
    const [data, setData] = useState<DiaristaData | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchDashboardData = async () => {
        const savedDiarista = localStorage.getItem("reembolsa_diarista")
        if (!savedDiarista) {
            router.push("/diarista/login")
            return
        }

        const diaristaObj = JSON.parse(savedDiarista)

        try {
            const res = await fetch(`/api/diarista/dashboard?diaristaId=${diaristaObj.id}`)
            if (!res.ok) throw new Error()
            const result = await res.json()
            setData(result)
        } catch {
            toast.error("Erro ao carregar dados do seu painel.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("reembolsa_diarista")
        router.push("/diarista/login")
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    // Registra o Ponto com Geolocalização GPS do dispositivo
    const handlePonto = async (acao: "CHECK_IN" | "CHECK_OUT") => {
        if (!data?.plantaoHoje) return
        setActionLoading(true)

        // Tenta capturar a localização GPS do celular/navegador
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords
                    await submitPonto(acao, latitude, longitude)
                },
                async (error) => {
                    console.warn("GPS Indisponível, registrando sem coordenadas:", error)
                    toast.warning("Não foi possível obter sua localização GPS exata. Registrando ponto padrão...")
                    await submitPonto(acao, null, null)
                },
                { enableHighAccuracy: true, timeout: 10000 }
            )
        } else {
            await submitPonto(acao, null, null)
        }
    }

    const submitPonto = async (acao: "CHECK_IN" | "CHECK_OUT", lat: number | null, lng: number | null) => {
        try {
            const res = await fetch("/api/diarista/ponto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coberturaId: data?.plantaoHoje?.id,
                    diaristaId: data?.diarista.id,
                    acao,
                    latitude: lat,
                    longitude: lng
                })
            })

            const resData = await res.json()
            if (!res.ok) {
                toast.error(resData.error || "Erro ao registrar ponto.")
                return
            }

            toast.success(resData.message || "Ponto registrado com sucesso!")
            fetchDashboardData()

        } catch {
            toast.error("Erro de conexão ao tentar registrar ponto.")
        } finally {
            setActionLoading(false)
        }
    }

    // Solicita Antecipação de Saque para uma diária
    const handleSolicitarAntecipacao = async (coberturaId: string) => {
        if (!data) return
        setActionLoading(true)

        try {
            const res = await fetch("/api/diarista/antecipacao", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coberturaId,
                    diaristaId: data.diarista.id,
                    justificativa: "Solicitado pelo diarista no portal"
                })
            })

            const resData = await res.json()
            if (!res.ok) {
                toast.error(resData.error || "Erro ao solicitar antecipação.")
                return
            }

            toast.success(resData.message)
            fetchDashboardData()
        } catch {
            toast.error("Erro ao solicitar antecipação.")
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-4">
                <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando seu portal...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 pb-24 relative overflow-hidden">
            {/* Ambient Background Blur */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-lg mx-auto space-y-6 relative z-10">

                {/* Top User Bar */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
                            {data?.diarista.nome?.substring(0, 2).toUpperCase() || "DI"}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Prestador Conectado</span>
                            <h2 className="text-base font-bold text-white leading-tight">{data?.diarista.nome}</h2>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/30 text-white rounded-2xl shadow-xl">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-emerald-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">Disponível</span>
                                <Wallet className="h-4 w-4" />
                            </div>
                            <div className="text-2xl font-black tracking-tight text-emerald-400">
                                {formatCurrency(data?.saldos.disponivel || 0)}
                            </div>
                            <p className="text-[10px] text-slate-400">Liberado para saque</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/90 border-slate-800 text-white rounded-2xl shadow-xl">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-cyan-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">A Receber</span>
                                <Clock className="h-4 w-4" />
                            </div>
                            <div className="text-2xl font-black tracking-tight text-slate-200">
                                {formatCurrency(data?.saldos.aReceber || 0)}
                            </div>
                            <p className="text-[10px] text-slate-400">Plantões pendentes</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Section: Plantão do Dia & Ponto GPS */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Plantão de Hoje</span>
                        </h3>
                        <Button variant="ghost" size="sm" onClick={fetchDashboardData} className="h-7 text-xs text-slate-400 hover:text-white p-0">
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                        </Button>
                    </div>

                    {data?.plantaoHoje ? (
                        <Card className="bg-slate-900 border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl relative">
                            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Plantão Escalado</span>
                                </div>
                                <span className="text-sm font-black text-white">{formatCurrency(data.plantaoHoje.valor)}</span>
                            </div>

                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight">{data.plantaoHoje.postoNome}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Horário previsto: {data.plantaoHoje.horaInicio || "08:00"} às {data.plantaoHoje.horaFim || "18:00"}
                                    </p>
                                </div>

                                {/* Status do Ponto de Hoje */}
                                {data.plantaoHoje.ponto ? (
                                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Status do Ponto:</span>
                                            {data.plantaoHoje.ponto.status === "EM_ANDAMENTO" ? (
                                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Em Serviço (Check-in Feito)</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Concluído (Check-out Feito)</Badge>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-300 space-y-1 font-mono">
                                            <div>✅ Check-in: {new Date(data.plantaoHoje.ponto.checkInAt).toLocaleTimeString("pt-BR")}</div>
                                            {data.plantaoHoje.ponto.checkOutAt && (
                                                <div>🏁 Check-out: {new Date(data.plantaoHoje.ponto.checkOutAt).toLocaleTimeString("pt-BR")}</div>
                                            )}
                                        </div>

                                        {data.plantaoHoje.ponto.status === "EM_ANDAMENTO" && (
                                            <Button
                                                onClick={() => handlePonto("CHECK_OUT")}
                                                disabled={actionLoading}
                                                className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/20"
                                            >
                                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <StopCircle className="h-5 w-5" />
                                                        <span>Fazer Check-out (Encerrar Plantão)</span>
                                                    </div>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span>Faça Check-in assim que chegar no posto de trabalho para iniciar seu plantão.</span>
                                        </div>

                                        <Button
                                            onClick={() => handlePonto("CHECK_IN")}
                                            disabled={actionLoading}
                                            className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25"
                                        >
                                            {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <PlayCircle className="h-5 w-5" />
                                                    <span>Fazer Check-in Agora (GPS)</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-slate-900/60 border-slate-800 rounded-2xl text-center p-6 space-y-2">
                            <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto" />
                            <p className="text-sm font-bold text-slate-400">Nenhum plantão agendado para hoje.</p>
                            <p className="text-xs text-slate-500">Acompanhe seu histórico de diárias concluídas abaixo.</p>
                        </Card>
                    )}
                </div>

                {/* Section: Histórico & Antecipação de Saque */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>Histórico e Antecipações</span>
                    </h3>

                    {data?.historico && data.historico.length > 0 ? (
                        <div className="space-y-2.5">
                            {data.historico.map(item => (
                                <div key={item.id} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-white">{item.postoNome}</span>
                                            <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-slate-400">
                                                {formatDate(item.data)}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-emerald-400">{formatCurrency(item.valor)}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                                • {item.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        {item.status === "PAGO" ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Pago</Badge>
                                        ) : item.podeAntecipar ? (
                                            <Button
                                                size="sm"
                                                onClick={() => handleSolicitarAntecipacao(item.id)}
                                                disabled={actionLoading}
                                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-xl h-8"
                                            >
                                                <Zap className="h-3 w-3 mr-1 fill-amber-400" /> Antecipar
                                            </Button>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-800">Em Análise</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-center text-xs text-slate-500">
                            Nenhum histórico encontrado.
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
