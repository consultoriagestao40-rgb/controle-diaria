"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    UserCheck, Wallet, ArrowUpRight, Clock, MapPin, CheckCircle2,
    PlayCircle, StopCircle, Zap, LogOut, Loader2, Sparkles, AlertCircle, RefreshCw, X, Percent, Check, FileText, ArrowDownLeft, Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ExtratoItem {
    id: string
    dataPlantao: string
    dataVencimento: string
    postoNome: string
    valorBruto: number
    taxaAntecipacao: number
    valorLiquidoAntecipado: number
    statusExtrato: "RECEBIDO" | "A_VENCER" | "EM_ANALISE" | "ANTECIPACAO_SOLICITADA"
    statusExtratoRotulo: string
    pontoStatus: string | null
    podeAntecipar: boolean
}

interface DiaristaData {
    diarista: {
        id: string
        nome: string
        cpf: string
        chavePix: string
        telefone: string
    }
    saldos: {
        totalSacado: number
        totalAVencer: number
        totalEmAnalise: number
    }
    configTaxa: number
    politicaVencimento: {
        tipo: string
        dias: number
        descricao: string
    }
    plantaoHoje: {
        id: string
        postoNome: string
        postoLat: number | null
        postoLng: number | null
        postoRaio: number
        valor: number
        data: string
        dataVencimento: string
        horaInicio: string | null
        horaFim: string | null
        ponto: {
            id: string
            checkInAt: string
            checkOutAt: string | null
            status: "EM_ANDAMENTO" | "CONCLUIDO"
        } | null
    } | null
    extrato: ExtratoItem[]
}

export default function DiaristaDashboardPage() {
    const router = useRouter()
    const [data, setData] = useState<DiaristaData | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    const [activeTab, setActiveTab] = useState<"PLANTAO" | "EXTRATO" | "SALDOS">("PLANTAO")

    // Modal de Antecipação
    const [antecipacaoModalOpen, setAntecipacaoModalOpen] = useState(false)
    const [selectedItemForAntecipacao, setSelectedItemForAntecipacao] = useState<ExtratoItem | null>(null)

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

    // Registra o Ponto com GPS
    const handlePonto = async (acao: "CHECK_IN" | "CHECK_OUT") => {
        if (!data?.plantaoHoje) return
        setActionLoading(true)

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords
                    await submitPonto(acao, latitude, longitude)
                },
                async () => {
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
            toast.error("Erro de conexão ao registrar ponto.")
        } finally {
            setActionLoading(false)
        }
    }

    const openAntecipacaoModal = (item: ExtratoItem) => {
        setSelectedItemForAntecipacao(item)
        setAntecipacaoModalOpen(true)
    }

    // Confirma a Antecipação
    const confirmSolicitarAntecipacao = async () => {
        if (!data || !selectedItemForAntecipacao) return
        setActionLoading(true)

        try {
            const res = await fetch("/api/diarista/antecipacao", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coberturaId: selectedItemForAntecipacao.id,
                    diaristaId: data.diarista.id,
                    justificativa: "Solicitação via extrato do portal do prestador"
                })
            })

            const resData = await res.json()
            if (!res.ok) {
                toast.error(resData.error || "Erro ao solicitar antecipação.")
                return
            }

            toast.success(resData.message)
            setAntecipacaoModalOpen(false)
            setSelectedItemForAntecipacao(null)
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
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando seu extrato...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 pb-24 relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-md md:max-w-2xl mx-auto space-y-6 relative z-10">

                {/* Top User Header Bar */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
                            {data?.diarista.nome?.substring(0, 2).toUpperCase() || "DI"}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Portal do Prestador</span>
                            <h2 className="text-base font-bold text-white leading-tight">{data?.diarista.nome}</h2>
                        </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-10 w-10">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                {/* 1. SEÇÃO DE SALDOS (DESKTOP: GRID DE 3 COLUNAS / MOBILE: TAB SALDOS OU GRID COMPACTO) */}
                <div className={`${activeTab === "SALDOS" ? "block" : "hidden sm:grid sm:grid-cols-3"} gap-3 space-y-3 sm:space-y-0`}>
                    {/* Total Sacado (Já Recebeu no Pix) */}
                    <Card className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 text-white rounded-2xl shadow-lg">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Total Sacado</span>
                                <div className="text-xl lg:text-2xl font-black text-emerald-400 tracking-tight">
                                    {formatCurrency(data?.saldos.totalSacado || 0)}
                                </div>
                                <p className="text-[10px] text-slate-400">Já pago no Pix</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <ArrowDownLeft className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* A Vencer (Pronto para Antecipar) */}
                    <Card className="bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/30 text-white rounded-2xl shadow-lg">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">A Vencer</span>
                                <div className="text-xl lg:text-2xl font-black text-amber-400 tracking-tight">
                                    {formatCurrency(data?.saldos.totalAVencer || 0)}
                                </div>
                                <p className="text-[10px] text-slate-400">Liberado para antecipar</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Zap className="h-5 w-5 fill-amber-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Em Análise (Aguardando Supervisor/N1/N2) */}
                    <Card className="bg-slate-900/90 border border-slate-800 text-white rounded-2xl shadow-lg">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Em Análise</span>
                                <div className="text-xl lg:text-2xl font-black text-slate-200 tracking-tight">
                                    {formatCurrency(data?.saldos.totalEmAnalise || 0)}
                                </div>
                                <p className="text-[10px] text-slate-400">Validação do supervisor</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. SEÇÃO: PLANTÃO DE HOJE COM CHECK-IN/OUT GPS */}
                <div className={`${activeTab === "PLANTAO" ? "block" : "hidden sm:block"} space-y-3`}>
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Plantão Escalado para Hoje</span>
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
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Em Aberto Hoje</span>
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

                                {data.plantaoHoje.ponto ? (
                                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                            <span className="text-xs font-bold text-slate-400">Status do Ponto:</span>
                                            {data.plantaoHoje.ponto.status === "EM_ANDAMENTO" ? (
                                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px] whitespace-nowrap">Em Serviço (Check-in Feito)</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] whitespace-nowrap">Concluído (Check-out Feito)</Badge>
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
                                                className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/20 px-3 py-2 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all"
                                            >
                                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                                    <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                                                        <StopCircle className="h-5 w-5 shrink-0" />
                                                        <span className="truncate">Encerrar Plantão (Check-out)</span>
                                                    </div>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => handlePonto("CHECK_IN")}
                                            disabled={actionLoading}
                                            className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 px-3 py-2 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all"
                                        >
                                            {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                                <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                                                    <PlayCircle className="h-5 w-5 shrink-0" />
                                                    <span className="truncate">Fazer Check-in Agora (GPS)</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-slate-900/60 border-slate-800 rounded-2xl text-center p-5 space-y-1">
                            <CheckCircle2 className="h-6 w-6 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-400">Nenhum plantão escalado para hoje.</p>
                        </Card>
                    )}
                </div>

                {/* 3. SEÇÃO: EXTRATO BANCÁRIO LINHA A LINHA */}
                <div className={`${activeTab === "EXTRATO" ? "block" : "hidden sm:block"} space-y-3`}>
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Extrato de Diárias (Movimentação)</span>
                        </h3>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{data?.politicaVencimento.descricao}</span>
                    </div>

                    {data?.extrato && data.extrato.length > 0 ? (
                        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl divide-y divide-slate-800/80 overflow-hidden shadow-2xl">
                            {data.extrato.map(item => (
                                <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3">
                                    {/* Esquerda: Icone de Status + Dados */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${item.statusExtrato === "RECEBIDO"
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                                : item.statusExtrato === "A_VENCER"
                                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                                    : item.statusExtrato === "ANTECIPACAO_SOLICITADA"
                                                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                                        : "bg-slate-800 text-slate-400 border border-slate-700"
                                            }`}>
                                            {item.statusExtrato === "RECEBIDO" && <CheckCircle2 className="h-5 w-5" />}
                                            {item.statusExtrato === "A_VENCER" && <Zap className="h-5 w-5 fill-amber-400" />}
                                            {item.statusExtrato === "ANTECIPACAO_SOLICITADA" && <Clock className="h-5 w-5" />}
                                            {item.statusExtrato === "EM_ANALISE" && <Clock className="h-5 w-5" />}
                                        </div>

                                        <div className="space-y-0.5 min-w-0">
                                            <h4 className="font-bold text-white text-sm truncate">{item.postoNome}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span>Plantão: {formatDate(item.dataPlantao)}</span>
                                            </div>
                                            {item.statusExtrato !== "RECEBIDO" && (
                                                <div className="text-[10px] text-amber-400/90 font-medium">
                                                    📅 Pagamento Previsto: {formatDate(item.dataVencimento)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Direita: Valor e Status/Ação */}
                                    <div className="text-right shrink-0 space-y-1">
                                        <span className={`text-base font-black tracking-tight block ${item.statusExtrato === "RECEBIDO" ? "text-emerald-400" : "text-white"
                                            }`}>
                                            {formatCurrency(item.valorBruto)}
                                        </span>

                                        {item.statusExtrato === "RECEBIDO" && (
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                                                Recebido Pix
                                            </Badge>
                                        )}

                                        {item.statusExtrato === "ANTECIPACAO_SOLICITADA" && (
                                            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]">
                                                Em Análise
                                            </Badge>
                                        )}

                                        {item.statusExtrato === "EM_ANALISE" && (
                                            <Badge variant="outline" className="text-slate-500 border-slate-800 text-[10px]">
                                                Em Validação
                                            </Badge>
                                        )}

                                        {item.podeAntecipar && (
                                            <Button
                                                size="sm"
                                                onClick={() => openAntecipacaoModal(item)}
                                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] h-7 px-2.5 rounded-lg shadow-md cursor-pointer active:scale-95 transition-all"
                                            >
                                                <Zap className="h-3 w-3 mr-1 fill-slate-950" /> Antecipar Hoje
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-500">
                            Nenhum registro de movimentação no extrato.
                        </div>
                    )}
                </div>

            </div>

            {/* MENU FIXO INFERIOR NATIVO DE NAVEGAÇÃO (NATIVE APP BOTTOM BAR) */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-2xl px-6 py-2 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
                <button
                    type="button"
                    onClick={() => setActiveTab("PLANTAO")}
                    className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
                        activeTab === "PLANTAO"
                            ? "text-emerald-400 bg-emerald-500/10 font-black"
                            : "text-slate-500 hover:text-slate-300 font-bold"
                    }`}
                >
                    <MapPin className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Plantão</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("EXTRATO")}
                    className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
                        activeTab === "EXTRATO"
                            ? "text-emerald-400 bg-emerald-500/10 font-black"
                            : "text-slate-500 hover:text-slate-300 font-bold"
                    }`}
                >
                    <FileText className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Extrato</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("SALDOS")}
                    className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
                        activeTab === "SALDOS"
                            ? "text-emerald-400 bg-emerald-500/10 font-black"
                            : "text-slate-500 hover:text-slate-300 font-bold"
                    }`}
                >
                    <Wallet className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Saldos</span>
                </button>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 py-1 px-4 rounded-2xl text-slate-500 hover:text-rose-400 transition-all cursor-pointer font-bold"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Sair</span>
                </button>
            </div>

            {/* Modal de Antecipação */}
            <Dialog open={antecipacaoModalOpen} onOpenChange={setAntecipacaoModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-3xl p-6">
                    <DialogHeader className="space-y-2">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Zap className="h-5 w-5 fill-amber-400" />
                        </div>
                        <DialogTitle className="text-xl font-black text-white">Solicitar Antecipação de Saque</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Confira o valor líquido a receber antecipado para a diária do posto <strong className="text-white">{selectedItemForAntecipacao?.postoNome}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedItemForAntecipacao && (
                        <div className="space-y-4 py-3">
                            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3 text-sm">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Valor Bruto da Diária:</span>
                                    <span className="font-bold">{formatCurrency(selectedItemForAntecipacao.valorBruto)}</span>
                                </div>

                                <div className="flex justify-between items-center text-amber-400 text-xs">
                                    <span className="flex items-center gap-1">
                                        <Percent className="h-3.5 w-3.5" /> Taxa de Antecipação Cheia ({data?.configTaxa || 5}%):
                                    </span>
                                    <span className="font-bold">- {formatCurrency(selectedItemForAntecipacao.taxaAntecipacao)}</span>
                                </div>

                                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-base font-black text-emerald-400">
                                    <span>Valor Líquido a Receber no Pix:</span>
                                    <span className="text-lg">{formatCurrency(selectedItemForAntecipacao.valorLiquidoAntecipado)}</span>
                                </div>
                            </div>

                            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                                <div>📅 <strong>Pagamento Normal ({formatDate(selectedItemForAntecipacao.dataVencimento)})</strong>: Você recebe o <strong>valor total integral (R$ {selectedItemForAntecipacao.valorBruto.toFixed(2)})</strong> sem qualquer taxa.</div>
                                <div>⚡ <strong>Antecipando Hoje</strong>: É aplicada a taxa fixa cheia de {data?.configTaxa || 5}%. Você recebe <strong className="text-emerald-400">{formatCurrency(selectedItemForAntecipacao.valorLiquidoAntecipado)}</strong> via Pix após aprovação.</div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setAntecipacaoModalOpen(false)} className="flex-1 text-slate-400 hover:text-white rounded-xl">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmSolicitarAntecipacao}
                                    disabled={actionLoading}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl h-11"
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Solicitação"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
