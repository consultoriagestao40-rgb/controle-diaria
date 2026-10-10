"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    CheckSquare, Loader2, AlertCircle, Calendar, Receipt, DollarSign, 
    FileText, CheckCircle, XCircle, Clock, X, Search, Building2, 
    Eye, ExternalLink, ThumbsUp, ThumbsDown, ArrowDownLeft, ArrowUpRight, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { 
    Dialog, DialogContent, DialogDescription, 
    DialogFooter, DialogHeader, DialogTitle, DialogClose 
} from "@/components/ui/dialog"
import { AttachmentViewer } from "@/components/dashboard/attachment-viewer"
import { formatCurrency } from "@/lib/utils"

interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    chavePix?: string | null
    justificativaReprovacao?: string | null
    justificativaAprovacao?: string | null
    observacao?: string | null
    createdAt: string
    dataPagamento?: string | null
    contaAzulPayableId?: string | null
    contaAzulStatus?: string | null
    empresa?: { id: string; nome: string } | null
    anexos: any[]
    solicitante: { id: string; nome: string; email: string; role?: string; chavePix?: string | null; cpf?: string | null }
}

export default function AprovacoesDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)
    const [filterTab, setFilterTab] = useState<"PENDENTES_APROVACAO" | "PRESTACOES" | "NO_CONTA_AZUL" | "TODAS">("PENDENTES_APROVACAO")
    const [searchQuery, setSearchQuery] = useState("")
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)

    // Modal de Reprovação / Devolução
    const [isRejectOpen, setIsRejectOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [justificativaReprovacao, setJustificativaReprovacao] = useState("")
    const [submittingAction, setSubmittingAction] = useState(false)

    // Loading por ID durante aprovação rápida
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        loadDespesas()
    }, [])

    const loadDespesas = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/despesas")
            if (res.ok) {
                const data = await res.json()
                setDespesas(Array.isArray(data) ? data : [])
            } else {
                toast.error("Erro ao carregar despesas para aprovação.")
            }
        } catch {
            toast.error("Erro de conexão ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    // Ação: Aprovar Solicitação (N2 cria no Conta Azul)
    const handleAprovarSolicitacao = async (despesa: Despesa) => {
        setProcessingId(despesa.id)
        try {
            const res = await fetch(`/api/despesas/${despesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "APROVAR",
                    justificativa: "Aprovado pelo gestor N2. Integrado ao ERP Conta Azul."
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao aprovar solicitação.")

            toast.success(
                data.contaAzulPayableId 
                    ? `Aprovado com sucesso! Contas a Pagar gerado no Conta Azul (ID: ${data.contaAzulPayableId})`
                    : "Solicitação aprovada e encaminhada ao Conta Azul!"
            )
            loadDespesas()
        } catch (err: any) {
            toast.error(err.message || "Erro ao processar aprovação.")
        } finally {
            setProcessingId(null)
        }
    }

    // Ação: Aprovar Prestação de Contas (Baixa imediata -> CONCLUIDO)
    const handleAprovarPrestacaoEBaixar = async (despesa: Despesa) => {
        setProcessingId(despesa.id)
        try {
            const res = await fetch(`/api/despesas/${despesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "APROVAR",
                    justificativa: "Prestação de contas aprovada. Despesa baixada e liquidada."
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao aprovar prestação de contas.")

            toast.success("Prestação de contas aprovada! Despesa baixada e concluída com sucesso.")
            loadDespesas()
        } catch (err: any) {
            toast.error(err.message || "Erro ao aprovar prestação.")
        } finally {
            setProcessingId(null)
        }
    }

    // Ação: Reprovar / Devolver
    const handleReprovar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDespesa) return

        if (!justificativaReprovacao.trim()) {
            toast.error("Por favor, preencha a justificativa da reprovação/devolução.")
            return
        }

        setSubmittingAction(true)
        try {
            const res = await fetch(`/api/despesas/${selectedDespesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REPROVAR",
                    justificativa: justificativaReprovacao.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao reprovar despesa.")

            toast.success("Despesa reprovada/devolvida com sucesso.")
            setIsRejectOpen(false)
            setSelectedDespesa(null)
            setJustificativaReprovacao("")
            loadDespesas()
        } catch (err: any) {
            toast.error(err.message || "Erro ao processar ação.")
        } finally {
            setSubmittingAction(false)
        }
    }

    // KPIs calculados
    const kpis = useMemo(() => {
        const aguardandoAprovacao = despesas.filter(d => 
            ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2"].includes(d.status) &&
            !(d.tipo === "ADIANTAMENTO" && d.valorComprovado !== null)
        ).length

        const prestacoesPendentes = despesas.filter(d => 
            d.tipo === "ADIANTAMENTO" && (d.status === "AGUARDANDO_CONCILIACAO" || (d.valorComprovado !== null && d.status.includes("AGUARDANDO")))
        ).length

        const noContaAzul = despesas.filter(d => 
            d.contaAzulPayableId !== null || ["APROVADO", "PAGO", "CONCLUIDO"].includes(d.status)
        ).length

        const totalPendenteValor = despesas
            .filter(d => ["AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2", "AGUARDANDO_CONCILIACAO"].includes(d.status))
            .reduce((acc, d) => acc + Number(d.valorSolicitado), 0)

        return { aguardandoAprovacao, prestacoesPendentes, noContaAzul, totalPendenteValor }
    }, [despesas])

    // Filtragem por Tab e Busca
    const filteredDespesas = useMemo(() => {
        return despesas.filter(d => {
            const isPrestacao = d.tipo === "ADIANTAMENTO" && (d.status === "AGUARDANDO_CONCILIACAO" || (d.valorComprovado !== null && d.status.includes("AGUARDANDO")))

            if (filterTab === "PENDENTES_APROVACAO") {
                if (isPrestacao) return false
                if (!["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2"].includes(d.status)) return false
            }

            if (filterTab === "PRESTACOES") {
                if (!isPrestacao) return false
            }

            if (filterTab === "NO_CONTA_AZUL") {
                if (!d.contaAzulPayableId && !["APROVADO", "PAGO"].includes(d.status)) return false
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchSolicitante = d.solicitante.nome.toLowerCase().includes(q)
                const matchDesc = d.descricao.toLowerCase().includes(q)
                const matchEmp = d.empresa?.nome.toLowerCase().includes(q)
                const matchPix = (d.chavePix || d.solicitante.chavePix || "").toLowerCase().includes(q)
                const matchCa = (d.contaAzulPayableId || "").toLowerCase().includes(q)
                if (!matchSolicitante && !matchDesc && !matchEmp && !matchPix && !matchCa) return false
            }

            return true
        })
    }, [despesas, filterTab, searchQuery])

    const getStatusBadge = (status: string, tipo: string) => {
        switch (status) {
            case "AGUARDANDO_APROVACAO_N1":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Aguardando N1</Badge>
            case "AGUARDANDO_APROVACAO_N2":
                return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-medium">Aguardando N2</Badge>
            case "APROVADO":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">Aprovado (Conta Azul)</Badge>
            case "PAGO":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Pago</Badge>
            case "AGUARDANDO_PRESTACAO":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Aguardando Prestação</Badge>
            case "AGUARDANDO_CONCILIACAO":
                return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Prestação a Validar</Badge>
            case "CONCLUIDO":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Baixado / Concluído</Badge>
            case "REPROVADO":
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">Reprovado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckSquare className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Aprovações & Gestão de Despesas
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aprove solicitações (com envio automático ao Conta Azul) e valide baixas de prestação de contas.
                    </p>
                </div>
            </div>

            {/* 4 KPIs de Gestão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Aprovação Inicial</p>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.aguardandoAprovacao}</p>
                            <p className="text-xs text-slate-500">Solicitações aguardando N1/N2</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Prestações a Validar</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{kpis.prestacoesPendentes}</p>
                            <p className="text-xs text-slate-500">Prontas para conferência e baixa</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">No Conta Azul</p>
                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{kpis.noContaAzul}</p>
                            <p className="text-xs text-slate-500">Títulos integrados no ERP</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Building2 className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendente de Decisão</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(kpis.totalPendenteValor)}</p>
                            <p className="text-xs text-slate-500">Volume financeiro em análise</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Abas e Filtros Rápidos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setFilterTab("PENDENTES_APROVACAO")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            filterTab === "PENDENTES_APROVACAO"
                                ? "bg-amber-500 text-white shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <span>Pendentes de Aprovação</span>
                        {kpis.aguardandoAprovacao > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
                                {kpis.aguardandoAprovacao}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setFilterTab("PRESTACOES")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            filterTab === "PRESTACOES"
                                ? "bg-indigo-600 text-white shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <span>Prestações a Validar</span>
                        {kpis.prestacoesPendentes > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
                                {kpis.prestacoesPendentes}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setFilterTab("NO_CONTA_AZUL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            filterTab === "NO_CONTA_AZUL"
                                ? "bg-blue-600 text-white shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        No Conta Azul / Pagas
                    </button>

                    <button
                        onClick={() => setFilterTab("TODAS")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            filterTab === "TODAS"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        Todas
                    </button>
                </div>

                <div className="relative min-w-[260px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                        placeholder="Buscar por colaborador, pix, empresa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs"
                    />
                </div>
            </div>

            {/* Tabela de Gestão */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm">Carregando painel de aprovações...</p>
                    </div>
                ) : filteredDespesas.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">Tudo em dia!</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Nenhuma despesa pendente encontrada para este filtro.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4">Solicitante / Pix</th>
                                    <th className="py-3.5 px-4">Tipo</th>
                                    <th className="py-3.5 px-4">Empresa (Grupo)</th>
                                    <th className="py-3.5 px-4">Descrição</th>
                                    <th className="py-3.5 px-4">Valor</th>
                                    <th className="py-3.5 px-4">Prestação</th>
                                    <th className="py-3.5 px-4">Situação / ERP</th>
                                    <th className="py-3.5 px-4">Comprovantes</th>
                                    <th className="py-3.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                                {filteredDespesas.map((d) => {
                                    const isPendingApproval = ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2"].includes(d.status) && d.valorComprovado === null
                                    const isPrestacaoPending = d.tipo === "ADIANTAMENTO" && (d.status === "AGUARDANDO_CONCILIACAO" || (d.valorComprovado !== null && d.status.includes("AGUARDANDO")))
                                    const isProcessing = processingId === d.id

                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            {/* Solicitante & Pix */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {d.solicitante.nome}
                                                </p>
                                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    PIX: <span className="text-slate-700 dark:text-slate-300 font-semibold">{d.chavePix || d.solicitante.chavePix || "N/I"}</span>
                                                </p>
                                            </td>

                                            {/* Tipo */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {d.tipo === "REEMBOLSO" ? (
                                                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-[11px]">
                                                        Reembolso
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold text-[11px]">
                                                        Adiantamento
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Empresa */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[160px]">{d.empresa?.nome || "Sem empresa"}</span>
                                                </div>
                                            </td>

                                            {/* Descrição */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="font-medium text-slate-900 dark:text-white truncate text-xs" title={d.descricao}>
                                                    {d.descricao}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                                                </p>
                                            </td>

                                            {/* Valor */}
                                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs text-slate-900 dark:text-white">
                                                {formatCurrency(Number(d.valorSolicitado))}
                                            </td>

                                            {/* Prestação de Contas */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                                                {d.valorComprovado !== null ? (
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-purple-600 dark:text-purple-400 text-xs">
                                                            Gasto: {formatCurrency(Number(d.valorComprovado))}
                                                        </p>
                                                        {d.saldoFinal !== null && Number(d.saldoFinal) !== 0 && (
                                                            <p className={`text-[11px] font-bold ${
                                                                Number(d.saldoFinal) > 0 ? "text-amber-600" : "text-blue-600"
                                                            }`}>
                                                                {Number(d.saldoFinal) > 0 
                                                                    ? `Devolver: ${formatCurrency(Number(d.saldoFinal))}`
                                                                    : `Reembolsar: ${formatCurrency(Math.abs(Number(d.saldoFinal)))}`
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* Situação e Conta Azul */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <div>{getStatusBadge(d.status, d.tipo)}</div>
                                                    {d.contaAzulPayableId && (
                                                        <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50">
                                                            <span>CA: {d.contaAzulPayableId.slice(0, 8)}...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Comprovantes */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {d.anexos && d.anexos.length > 0 ? (
                                                    <button
                                                        onClick={() => setPreviewAnexo(d.anexos[0])}
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold cursor-pointer underline"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Ver ({d.anexos.length})
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* Ações */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                {isProcessing ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 inline-block" />
                                                ) : isPendingApproval ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAprovarSolicitacao(d)}
                                                            className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer gap-1"
                                                            title="Aprova e gera Contas a Pagar no Conta Azul"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Aprovar (N2)
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedDespesa(d)
                                                                setJustificativaReprovacao("")
                                                                setIsRejectOpen(true)
                                                            }}
                                                            className="h-8 px-2.5 rounded-lg border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium cursor-pointer"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Reprovar
                                                        </Button>
                                                    </div>
                                                ) : isPrestacaoPending ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAprovarPrestacaoEBaixar(d)}
                                                            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer gap-1"
                                                            title="Aprova a prestação de contas e conclui/baixa a despesa imediatamente"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Aprovar & Baixar
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedDespesa(d)
                                                                setJustificativaReprovacao("")
                                                                setIsRejectOpen(true)
                                                            }}
                                                            className="h-8 px-2 rounded-lg border-amber-200 hover:bg-amber-50 text-amber-600 text-xs font-medium cursor-pointer"
                                                        >
                                                            Ajuste
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Concluído</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE REPROVAÇÃO / PEDIDO DE AJUSTE */}
            <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                            <XCircle className="w-5 h-5" />
                            Reprovar ou Solicitar Ajuste
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Informe o motivo detalhado para que o solicitante possa corrigir.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDespesa && (
                        <form onSubmit={handleReprovar} className="space-y-4 pt-2">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    {selectedDespesa.solicitante.nome} — {selectedDespesa.descricao}
                                </p>
                                <p className="text-slate-500">
                                    Valor: {formatCurrency(Number(selectedDespesa.valorSolicitado))}
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Justificativa do Gestor *
                                </Label>
                                <Textarea
                                    required
                                    rows={3}
                                    placeholder="Ex: Comprovante ilegível, valor divergente da nota ou despesa não autorizada previamente..."
                                    value={justificativaReprovacao}
                                    onChange={(e) => setJustificativaReprovacao(e.target.value)}
                                    className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs resize-none"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsRejectOpen(false)}
                                    className="h-10 text-xs rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingAction}
                                    className="h-10 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                                >
                                    {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Reprovação"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Visualizador de Anexos */}
            {previewAnexo && (
                <AttachmentViewer
                    anexo={previewAnexo}
                    onClose={() => setPreviewAnexo(null)}
                />
            )}
        </div>
    )
}
