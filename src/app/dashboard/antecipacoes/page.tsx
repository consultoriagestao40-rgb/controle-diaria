"use client"

import { useState, useEffect } from "react"
import {
    Zap, CheckCircle2, XCircle, Clock, Search, ArrowUpRight,
    UserCheck, DollarSign, Calendar, MapPin, Loader2, AlertCircle, Percent, Settings, Save
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
    const [taxaPercentual, setTaxaPercentual] = useState<number>(5.0)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [savingTaxa, setSavingTaxa] = useState(false)

    const fetchAntecipacoes = async () => {
        try {
            const res = await fetch("/api/admin/antecipacoes")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setAntecipacoes(data.antecipacoes || [])
            if (data.taxaPercentual !== undefined) {
                setTaxaPercentual(data.taxaPercentual)
            }
        } catch {
            toast.error("Erro ao carregar solicitações de antecipação.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAntecipacoes()
    }, [])

    const handleSalvarTaxa = async () => {
        setSavingTaxa(true)
        try {
            const res = await fetch("/api/admin/antecipacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ novaTaxaPercentual: taxaPercentual })
            })

            if (!res.ok) throw new Error()
            toast.success(`Taxa de antecipação atualizada para ${taxaPercentual}%!`)
        } catch {
            toast.error("Erro ao salvar taxa.")
        } finally {
            setSavingTaxa(false)
        }
    }

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
                            <p className="text-xs text-slate-500 font-medium">Gestão de adiantamentos de diárias com cálculo de taxa de conveniência</p>
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

            {/* Painel de Configuração da Taxa de Antecipação */}
            <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700/50 p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-amber-400">Configuração da Taxa de Antecipação</span>
                        </div>
                        <p className="text-xs text-slate-300">
                            Defina a porcentagem descontada do valor da diária quando o prestador solicita o adiantamento.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
                        <span className="text-xs font-bold text-slate-400 pl-3">Taxa (%):</span>
                        <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={taxaPercentual}
                            onChange={e => setTaxaPercentual(Number(e.target.value))}
                            className="w-20 h-9 bg-slate-900 border-slate-700 text-white font-mono font-bold text-center rounded-lg"
                        />
                        <Button
                            onClick={handleSalvarTaxa}
                            disabled={savingTaxa}
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-9 rounded-lg px-3"
                        >
                            {savingTaxa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </Card>

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
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Líquido a Pagar</span>
                            <div className="text-2xl font-black text-emerald-600 mt-1">
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receita de Taxas Retidas</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {formatCurrency(pendentes.reduce((acc, i) => acc + Number(i.taxaServico), 0))}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Percent className="h-5 w-5" />
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
                                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-sm font-black px-3 py-1">
                                            {formatCurrency(Number(item.valorSolicitado))} Líquido
                                        </Badge>
                                    </div>

                                    {/* Discriminativo Financeiro */}
                                    <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl space-y-2 text-xs">
                                        <div className="flex justify-between text-slate-600 font-medium">
                                            <span>Valor Bruto da Diária:</span>
                                            <span className="font-bold">{formatCurrency(Number(item.valorOriginal))}</span>
                                        </div>
                                        <div className="flex justify-between text-amber-600 font-semibold">
                                            <span>Taxa de Conveniência ({taxaPercentual}%):</span>
                                            <span>- {formatCurrency(Number(item.taxaServico))}</span>
                                        </div>
                                        <div className="pt-1.5 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                                            <span>Valor Pix a Pagar:</span>
                                            <span className="text-emerald-600">{formatCurrency(Number(item.valorSolicitado))}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            onClick={() => handleAcao(item.id, "APROVAR")}
                                            disabled={actionLoading}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-10 rounded-xl shadow-sm"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar e Liberar no Financeiro
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
