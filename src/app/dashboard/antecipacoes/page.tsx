"use client"

import { useState, useEffect } from "react"
import {
    Zap, CheckCircle2, XCircle, Clock, Search, ArrowUpRight,
    UserCheck, DollarSign, Calendar, MapPin, Loader2, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Antecipacao {
    id: string
    coberturaId: string
    valorOriginal: number
    valorSolicitado: number
    taxaServico: number
    status: "PENDENTE" | "APROVADO" | "REPROVADO" | "PAGO"
    justificativa: string | null
    solicitadoEm: string
    diarista: {
        id: string
        nome: string
        cpf: string
        chavePix: string
    }
    cobertura: {
        id: string
        data: string
        posto: {
            nome: string
        }
        ponto: {
            status: string
            checkInAt: string
            checkOutAt: string | null
        } | null
    }
}

export default function GestaoAntecipacoesPage() {
    const [antecipacoes, setAntecipacoes] = useState<Antecipacao[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [search, setSearch] = useState("")

    const fetchAntecipacoes = async () => {
        try {
            const res = await fetch("/api/admin/antecipacoes")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setAntecipacoes(data)
        } catch {
            toast.error("Erro ao carregar solicitações de antecipação.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAntecipacoes()
    }, [])

    const handleAcao = async (antecipacaoId: string, acao: "APROVAR" | "REPROVAR") => {
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/antecipacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ antecipacaoId, acao })
            })

            if (!res.ok) throw new Error()

            toast.success(`Solicitação ${acao === "APROVAR" ? "aprovada" : "reprovada"} com sucesso!`)
            fetchAntecipacoes()
        } catch {
            toast.error("Erro ao processar solicitação.")
        } finally {
            setActionLoading(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const filtered = antecipacoes.filter(a =>
        a.diarista.nome.toLowerCase().includes(search.toLowerCase()) ||
        a.cobertura.posto.nome.toLowerCase().includes(search.toLowerCase())
    )

    const pendentes = filtered.filter(a => a.status === "PENDENTE")
    const concluidas = filtered.filter(a => a.status !== "PENDENTE")

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                            <Zap className="h-5 w-5 fill-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Solicitações de Antecipação de Saque</h1>
                            <p className="text-xs text-slate-500 font-medium">Gestão de adiantamentos de diárias solicitados pelos prestadores</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por prestador ou posto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-white border-slate-200"
                        />
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200/80 shadow-sm rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendentes de Aprovação</span>
                            <div className="text-2xl font-black text-amber-600 mt-1">{pendentes.length}</div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/80 shadow-sm rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Solicitado</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {formatCurrency(pendentes.reduce((acc, i) => acc + Number(i.valorSolicitado), 0))}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200/80 shadow-sm rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico Processado</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">{concluidas.length}</div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Fila de Antecipações Pendentes */}
            <div className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Solicitações Aguardando Aprovação ({pendentes.length})</span>
                </h2>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Carregando antecipações...</span>
                    </div>
                ) : pendentes.length === 0 ? (
                    <Card className="bg-slate-50/50 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">Nenhuma antecipação pendente no momento.</p>
                        <p className="text-xs text-slate-400">Todas as solicitações de adiantamento foram processadas.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendentes.map(item => (
                            <Card key={item.id} className="bg-white border-amber-200/80 shadow-md rounded-2xl overflow-hidden relative border-l-4 border-l-amber-500">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <UserCheck className="h-4 w-4 text-slate-400" />
                                                <span className="font-black text-slate-900 text-base">{item.diarista.nome}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">CPF: {item.diarista.cpf || "Não informado"} | Pix: {item.diarista.chavePix || "Não informada"}</p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                            {formatCurrency(Number(item.valorSolicitado))}
                                        </Badge>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            <span>Posto: {item.cobertura.posto.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            <span>Data da Diária: {formatDate(item.cobertura.data)}</span>
                                        </div>
                                        {item.cobertura.ponto && (
                                            <div className="text-[11px] text-emerald-700 font-medium">
                                                ✅ Check-in/out realizado com sucesso
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <Button
                                            onClick={() => handleAcao(item.id, "APROVAR")}
                                            disabled={actionLoading}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-10 rounded-xl shadow-sm"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar Antecipação
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleAcao(item.id, "REPROVAR")}
                                            disabled={actionLoading}
                                            className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold h-10 rounded-xl"
                                        >
                                            <XCircle className="h-4 w-4 mr-1.5 text-rose-500" /> Reprovar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
