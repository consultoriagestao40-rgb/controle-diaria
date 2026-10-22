"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    CheckSquare, Loader2, AlertCircle, Calendar, Receipt, DollarSign, 
    FileText, CheckCircle, XCircle, Clock, X, Search, Building2, 
    Eye, ExternalLink, ThumbsUp, ThumbsDown, ArrowDownLeft, ArrowUpRight, Copy, Check,
    Layers, UserCheck, Trash2, RefreshCw, User, MapPin
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
import { DespesaDetailModal, DespesaDetalhes } from "@/components/dashboard/despesa-detail-modal"
import { formatCurrency } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"

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
    centroCusto?: { id: string; nome: string; codigo?: string | null } | null
    anexos: any[]
    itens?: any[]
    historico?: any[]
    solicitante: { id: string; nome: string; email: string; role?: string; chavePix?: string | null; cpf?: string | null }
}

interface GroupedDespesa {
    key: string
    name: string
    subName: string
    solicitanteNome: string
    solicitantePix: string
    empresaNome: string
    empresaId?: string
    count: number
    totalValue: number
    items: Despesa[]
}

export default function AprovacoesDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)
    const [filterTab, setFilterTab] = useState<"PENDENTES_APROVACAO" | "PRESTACOES" | "NO_CONTA_AZUL" | "TODAS">("PENDENTES_APROVACAO")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedEmpresa, setSelectedEmpresa] = useState("ALL")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)

    // Agrupamento igual tela de diárias
    const [groupBy, setGroupBy] = useState<'SOLICITANTE_EMPRESA' | 'SOLICITANTE' | 'EMPRESA' | 'NONE'>('SOLICITANTE_EMPRESA')
    const [selectedGroup, setSelectedGroup] = useState<GroupedDespesa | null>(null)
    const [selectedItemIdsForBatch, setSelectedItemIdsForBatch] = useState<string[]>([])

    // Modal de Detalhes Completo da Solicitação
    const [detailItem, setDetailItem] = useState<Despesa | null>(null)
    const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string; ativo?: boolean }>>([])
    const [batchEmpresaId, setBatchEmpresaId] = useState<string>("")

    // Seleção em Lote (Modo corrida / sem agrupamento)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [batchProcessing, setBatchProcessing] = useState(false)
    const [isBatchRejectOpen, setIsBatchRejectOpen] = useState(false)
    const [batchRejectJustificativa, setBatchRejectJustificativa] = useState("")

    // Modal de Reprovação / Devolução Individual
    const [isRejectOpen, setIsRejectOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [justificativaReprovacao, setJustificativaReprovacao] = useState("")
    const [submittingAction, setSubmittingAction] = useState(false)

    // Loading por ID durante aprovação rápida
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [syncingId, setSyncingId] = useState<string | null>(null)

    useEffect(() => {
        loadDespesas()
    }, [])

    const loadDespesas = async () => {
        setLoading(true)
        try {
            const [resDespesas, resEmpresas] = await Promise.all([
                fetch("/api/despesas"),
                fetch("/api/admin/empresas")
            ])

            if (resDespesas.ok) {
                const data = await resDespesas.json()
                setDespesas(Array.isArray(data) ? data : [])
            } else {
                toast.error("Erro ao carregar despesas para aprovação.")
            }

            if (resEmpresas.ok) {
                const empData = await resEmpresas.json()
                setEmpresas(Array.isArray(empData) ? empData.filter((e: any) => e.ativo) : [])
            }
        } catch {
            toast.error("Erro de conexão ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    // Lista unificada de empresas para o filtro
    const empresaList = useMemo(() => {
        const map = new Map<string, string>()
        empresas.forEach(e => {
            if (e.id && e.nome) map.set(e.id, e.nome)
        })
        despesas.forEach(item => {
            if (item.empresa?.nome) {
                const id = item.empresa.id || item.empresa.nome
                if (!map.has(id)) {
                    map.set(id, item.empresa.nome)
                }
            }
        })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
    }, [empresas, despesas])

    // Sincroniza itens do grupo aberto quando a lista principal de despesas é atualizada
    useEffect(() => {
        if (selectedGroup && despesas.length > 0) {
            const updatedItems = despesas.filter(newItem => 
                selectedGroup.items.some(oldItem => oldItem.id === newItem.id)
            )
            if (updatedItems.length === 0) {
                setSelectedGroup(null)
                setSelectedItemIdsForBatch([])
            } else {
                setSelectedGroup(prev => prev ? { ...prev, items: updatedItems } : null)
                setSelectedItemIdsForBatch(prev => prev.filter(id => updatedItems.some(i => i.id === id)))
            }
        }
    }, [despesas])

    // Ação: Aprovar Solicitação Individual
    const handleAprovarSolicitacao = async (despesa: Despesa | DespesaDetalhes, overrideEmpresaId?: string, overrideChavePix?: string) => {
        const currentPix = overrideChavePix || despesa.chavePix || despesa.solicitante.chavePix
        if (!currentPix) {
            setDetailItem(despesa as any)
            toast.warning("Como nas diárias, informe a Chave Pix da solicitação antes de aprovar e integrar ao Conta Azul.")
            return
        }

        setProcessingId(despesa.id)
        try {
            const res = await fetch(`/api/despesas/${despesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "APROVAR",
                    justificativa: "Aprovado pelo gestor N2. Integrado ao ERP Conta Azul.",
                    empresaId: overrideEmpresaId || undefined,
                    chavePix: overrideChavePix || undefined
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

    // Ação: Sincronizar Manualmente no Conta Azul
    const handleSincronizarContaAzul = async (despesa: Despesa | DespesaDetalhes, overrideChavePix?: string) => {
        const currentPix = overrideChavePix || despesa.chavePix || despesa.solicitante.chavePix
        if (!currentPix) {
            setDetailItem(despesa as any)
            toast.warning("Como nas diárias, informe a Chave Pix da despesa antes de sincronizar com o Conta Azul.")
            return
        }

        setSyncingId(despesa.id)
        try {
            const res = await fetch(`/api/despesas/${despesa.id}/sincronizar-contaazul`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chavePix: overrideChavePix || undefined
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao sincronizar com o Conta Azul.")

            toast.success(`Sincronizado no Conta Azul com sucesso! ID: ${data.contaAzulPayableId}`)
            loadDespesas()
            if (detailItem && detailItem.id === despesa.id) {
                setDetailItem({
                    ...detailItem,
                    chavePix: overrideChavePix || detailItem.chavePix,
                    contaAzulPayableId: data.contaAzulPayableId,
                    contaAzulStatus: "SINCRONIZADO"
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao sincronizar com o Conta Azul.")
        } finally {
            setSyncingId(null)
        }
    }

    // Ação: Aprovar Prestação de Contas (Baixa imediata -> CONCLUIDO)
    const handleAprovarPrestacaoEBaixar = async (despesa: Despesa | DespesaDetalhes) => {
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

    // Ação: Reprovar Individual
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

    // Ação genérica: Aprovar Lista de IDs em Lote (Consolidação automática no Conta Azul)
    const handleAprovarLoteComIds = async (idsToApprove: string[], targetEmpresaId?: string) => {
        if (idsToApprove.length === 0) return
        setBatchProcessing(true)
        try {
            const res = await fetch("/api/despesas/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: idsToApprove,
                    acao: "APROVAR",
                    justificativa: "Aprovado em lote pelo gestor. Lançamento consolidado no Conta Azul.",
                    empresaId: targetEmpresaId || undefined
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao aprovar em lote.")

            toast.success(
                data.message || `${data.processedCount} despesa(s) aprovada(s) com sucesso!`
            )
            setSelectedIds(prev => prev.filter(id => !idsToApprove.includes(id)))
            setSelectedGroup(null)
            setSelectedItemIdsForBatch([])
            setBatchEmpresaId("")
            loadDespesas()
        } catch (err: any) {
            toast.error(err.message || "Erro ao processar aprovação em lote.")
        } finally {
            setBatchProcessing(false)
        }
    }

    // Ação: Aprovar Lote da Barra Global
    const handleAprovarLote = async () => {
        await handleAprovarLoteComIds(selectedIds, batchEmpresaId || undefined)
    }

    // Ação: Reprovar Lote Selecionado
    const handleReprovarLoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const idsToReject = selectedIds.length > 0 ? selectedIds : selectedItemIdsForBatch
        if (idsToReject.length === 0) return
        if (!batchRejectJustificativa.trim()) {
            toast.error("Por favor, preencha a justificativa da reprovação em lote.")
            return
        }

        setBatchProcessing(true)
        try {
            const res = await fetch("/api/despesas/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: idsToReject,
                    acao: "REPROVAR",
                    justificativa: batchRejectJustificativa.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao reprovar em lote.")

            toast.success(`${data.processedCount} despesa(s) reprovada(s) com sucesso.`)
            setSelectedIds([])
            setSelectedItemIdsForBatch([])
            setIsBatchRejectOpen(false)
            setBatchRejectJustificativa("")
            setSelectedGroup(null)
            loadDespesas()
        } catch (err: any) {
            toast.error(err.message || "Erro ao reprovar despesas em lote.")
        } finally {
            setBatchProcessing(false)
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

    // Filtragem por Tab, Busca, Empresa e Período de Datas
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

            // Filtro Empresa
            if (selectedEmpresa !== "ALL") {
                if (selectedEmpresa === "SEM_EMPRESA") {
                    if (d.empresa?.nome || d.empresa?.id) return false
                } else {
                    const empId = d.empresa?.id || d.empresa?.nome
                    if (empId !== selectedEmpresa && d.empresa?.nome !== selectedEmpresa) {
                        return false
                    }
                }
            }

            // Filtro Período Datas
            if (startDate || endDate) {
                let itemDateStr = ""
                if (d.createdAt) {
                    try {
                        const dt = new Date(d.createdAt)
                        if (!isNaN(dt.getTime())) {
                            const y = dt.getFullYear()
                            const m = String(dt.getMonth() + 1).padStart(2, '0')
                            const day = String(dt.getDate()).padStart(2, '0')
                            itemDateStr = `${y}-${m}-${day}`
                        } else {
                            itemDateStr = d.createdAt.split('T')[0]
                        }
                    } catch {
                        itemDateStr = d.createdAt.split('T')[0]
                    }
                }
                if (startDate && itemDateStr < startDate) return false
                if (endDate && itemDateStr > endDate) return false
            }

            // Busca por texto
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
    }, [despesas, filterTab, searchQuery, selectedEmpresa, startDate, endDate])

    // Agrupamento igual da tela de diárias (Solicitante + Empresa, Solicitante, Empresa)
    const groupedDespesas = useMemo(() => {
        if (groupBy === 'NONE') return []

        const groups: { [key: string]: {
            key: string
            name: string
            subName: string
            solicitanteNome: string
            solicitantePix: string
            empresaNome: string
            empresaId?: string
            items: Despesa[]
        } } = {}

        filteredDespesas.forEach(item => {
            let key = ""
            let name = ""
            let subName = ""

            const empNome = item.empresa?.nome || "Sem Empresa"
            const empId = item.empresa?.id || "SEM_EMPRESA"
            const solNome = item.solicitante.nome
            const solId = item.solicitante.id
            const pix = item.chavePix || item.solicitante.chavePix || ""

            if (groupBy === 'SOLICITANTE_EMPRESA') {
                key = `${solId}_${empId}`
                name = solNome
                subName = empNome
            } else if (groupBy === 'SOLICITANTE') {
                key = solId
                name = solNome
                subName = empNome
            } else if (groupBy === 'EMPRESA') {
                key = empId
                name = empNome
                subName = solNome
            }

            if (!groups[key]) {
                groups[key] = {
                    key,
                    name,
                    subName,
                    solicitanteNome: solNome,
                    solicitantePix: pix,
                    empresaNome: empNome,
                    empresaId: item.empresa?.id,
                    items: []
                }
            }
            groups[key].items.push(item)
        })

        return Object.values(groups).map(g => {
            const totalValue = g.items.reduce((acc, item) => acc + Number(item.valorSolicitado || 0), 0)
            return {
                ...g,
                count: g.items.length,
                totalValue
            }
        }).sort((a, b) => b.totalValue - a.totalValue)
    }, [filteredDespesas, groupBy])

    // Auxiliares de ícone e rótulo do grupo
    const getGroupIcon = () => {
        if (groupBy === 'SOLICITANTE_EMPRESA' || groupBy === 'SOLICITANTE') {
            return <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        }
        if (groupBy === 'EMPRESA') {
            return <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        }
        return <User className="h-4 w-4 text-slate-500" />
    }

    const getGroupTypeLabel = () => {
        if (groupBy === 'SOLICITANTE_EMPRESA') return "Solicitante & Empresa"
        if (groupBy === 'SOLICITANTE') return "Solicitante"
        if (groupBy === 'EMPRESA') return "Empresa (Grupo)"
        return ""
    }

    // Toggle de seleção no modal de extrato do grupo
    const toggleGroupItemSelection = (id: string) => {
        setSelectedItemIdsForBatch(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAllGroupItems = () => {
        if (!selectedGroup) return
        if (selectedItemIdsForBatch.length === selectedGroup.items.length) {
            setSelectedItemIdsForBatch([])
        } else {
            setSelectedItemIdsForBatch(selectedGroup.items.map(i => i.id))
        }
    }

    // Itens elegíveis para seleção em lote (pendentes no modo sem agrupamento)
    const eligibleDespesas = useMemo(() => {
        return filteredDespesas.filter(d => 
            ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2", "AGUARDANDO_CONCILIACAO"].includes(d.status)
        )
    }, [filteredDespesas])

    const isAllSelected = eligibleDespesas.length > 0 && eligibleDespesas.every(d => selectedIds.includes(d.id))

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !eligibleDespesas.some(d => d.id === id)))
        } else {
            const toAdd = eligibleDespesas.map(d => d.id)
            setSelectedIds(prev => Array.from(new Set([...prev, ...toAdd])))
        }
    }

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    // Resumo dos selecionados (Modo sem agrupamento)
    const selectedSummary = useMemo(() => {
        const selected = despesas.filter(d => selectedIds.includes(d.id))
        const totalValor = selected.reduce((acc, d) => acc + Number(d.valorSolicitado), 0)
        const colaboradores = Array.from(new Set(selected.map(d => d.solicitante.nome)))
        return {
            count: selected.length,
            totalValor,
            colaboradores
        }
    }, [despesas, selectedIds])

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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-3 md:p-8 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckSquare className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Aprovações & Gestão de Despesas
                        </h1>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        Agrupamento e aprovação em lote por <strong>solicitante e empresa</strong>, com rateio e consolidação automática no Conta Azul (igual ao controle de diárias).
                    </p>
                </div>
            </div>

            {/* 4 KPIs de Gestão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

            {/* Barra de Ação em Lote (Sticky / Destaque quando houver selecionados no modo lista corrida) */}
            {selectedIds.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-white text-emerald-800 font-black text-xs px-2.5 py-0.5">
                                {selectedSummary.count} selecionada(s)
                            </Badge>
                            <span className="text-base font-bold">
                                Total: {formatCurrency(selectedSummary.totalValor)}
                            </span>
                        </div>
                        <p className="text-xs text-emerald-100 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5" />
                            Colaborador(es): <span className="font-semibold text-white">{selectedSummary.colaboradores.join(", ")}</span>
                        </p>
                        <p className="text-[11px] text-emerald-200">
                            ✨ Ao aprovar o lote, todas as despesas do mesmo colaborador e empresa gerarão <strong>1 único lançamento no Conta Azul</strong> com a soma total e descrição consolidada.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        {empresas.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-emerald-800/90 px-2.5 py-1 rounded-xl border border-white/20">
                                <span className="text-[11px] font-semibold text-emerald-100 whitespace-nowrap">
                                    Lançar na Empresa:
                                </span>
                                <select
                                    value={batchEmpresaId}
                                    onChange={(e) => setBatchEmpresaId(e.target.value)}
                                    className="text-xs font-bold h-7 rounded-lg bg-emerald-950 text-white border border-emerald-500/60 px-2 cursor-pointer focus:outline-none"
                                >
                                    <option value="">Manter original da solicitação</option>
                                    {empresas.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setSelectedIds([])
                                setBatchEmpresaId("")
                            }}
                            className="bg-emerald-800/60 hover:bg-emerald-800 text-white text-xs h-9 rounded-xl border border-white/20 cursor-pointer"
                        >
                            Desmarcar
                        </Button>

                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setIsBatchRejectOpen(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 rounded-xl font-semibold shadow-xs cursor-pointer gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reprovar Lote
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleAprovarLote}
                            disabled={batchProcessing}
                            className="bg-white hover:bg-emerald-50 text-emerald-800 text-xs h-9 rounded-xl font-bold shadow-md cursor-pointer gap-1.5 transition-all"
                        >
                            {batchProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                            ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-700" />
                            )}
                            Aprovar Lote (1 Conta Azul Consolidado)
                        </Button>
                    </div>
                </div>
            )}

            {/* Abas Superiores de Status */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <button
                    onClick={() => {
                        setFilterTab("PENDENTES_APROVACAO")
                        setSelectedIds([])
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        filterTab === "PENDENTES_APROVACAO"
                            ? "bg-amber-500 text-white shadow-xs font-bold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <span>Pendentes de Aprovação</span>
                    {kpis.aguardandoAprovacao > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/25 text-white font-bold">
                            {kpis.aguardandoAprovacao}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        setFilterTab("PRESTACOES")
                        setSelectedIds([])
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        filterTab === "PRESTACOES"
                            ? "bg-indigo-600 text-white shadow-xs font-bold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <span>Prestações a Validar</span>
                    {kpis.prestacoesPendentes > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/25 text-white font-bold">
                            {kpis.prestacoesPendentes}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        setFilterTab("NO_CONTA_AZUL")
                        setSelectedIds([])
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        filterTab === "NO_CONTA_AZUL"
                            ? "bg-blue-600 text-white shadow-xs font-bold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    No Conta Azul / Pagas
                </button>

                <button
                    onClick={() => {
                        setFilterTab("TODAS")
                        setSelectedIds([])
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        filterTab === "TODAS"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    Todas
                </button>
            </div>

            {/* Barra de Filtros & Agrupamento (Idêntica à tela de Diárias) */}
            <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end w-full">
                    {/* Busca */}
                    <div className="relative group flex-1 min-w-[200px] space-y-1 md:space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                            Filtro de busca
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                            <Input
                                placeholder="Buscar por colaborador, PIX, descrição..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 md:h-12 pl-10 md:pl-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-xs md:text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Filtro Empresa */}
                    <div className="space-y-1 md:space-y-1.5 w-full sm:w-56 shrink-0">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                            Empresa (Grupo)
                        </label>
                        <select
                            value={selectedEmpresa}
                            onChange={(e) => {
                                setSelectedEmpresa(e.target.value)
                                setSelectedGroup(null)
                            }}
                            className="h-10 md:h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs rounded-xl px-3 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-xs md:text-sm text-slate-700 dark:text-slate-200 w-full outline-none appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                        >
                            <option value="ALL">Todas as Empresas</option>
                            {empresaList.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.nome}</option>
                            ))}
                            <option value="SEM_EMPRESA">Sem Empresa</option>
                        </select>
                    </div>

                    {/* Datas Início e Fim */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 shrink-0">
                        <div className="space-y-1 md:space-y-1.5 w-full sm:w-36 md:w-40">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                Período (Início)
                            </label>
                            <DatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                        <div className="space-y-1 md:space-y-1.5 w-full sm:w-36 md:w-40">
                            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                Período (Término)
                            </label>
                            <DatePicker
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="dd/mm/aaaa"
                            />
                        </div>
                    </div>

                    {/* Esquema de Agrupamento (Solicitante + Empresa) */}
                    <div className="space-y-1 md:space-y-1.5 w-full sm:w-64 shrink-0">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                            Visualização (Agrupar)
                        </label>
                        <select
                            value={groupBy}
                            onChange={(e: any) => {
                                setGroupBy(e.target.value)
                                setSelectedGroup(null)
                            }}
                            className="h-10 md:h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs rounded-xl px-3 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-xs md:text-sm text-slate-700 dark:text-slate-200 w-full outline-none appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                        >
                            <option value="SOLICITANTE_EMPRESA">Agrupar por Solicitante + Empresa (Padrão)</option>
                            <option value="SOLICITANTE">Agrupar apenas por Solicitante</option>
                            <option value="EMPRESA">Agrupar por Empresa (Grupo)</option>
                            <option value="NONE">Sem Agrupamento (Lista Corrida)</option>
                        </select>
                    </div>
                </div>

                {/* Botão Limpar Filtros */}
                {(searchQuery || startDate || endDate || selectedEmpresa !== 'ALL' || groupBy !== 'SOLICITANTE_EMPRESA') && (
                    <div className="flex justify-start gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearchQuery("")
                                setStartDate("")
                                setEndDate("")
                                setSelectedEmpresa("ALL")
                                setGroupBy("SOLICITANTE_EMPRESA")
                                setSelectedGroup(null)
                            }}
                            className="text-[10px] text-slate-500 hover:text-emerald-600 font-bold uppercase tracking-wider h-8 rounded-lg px-3 bg-slate-100 hover:bg-slate-200/50 transition-all cursor-pointer"
                        >
                            Limpar Filtros & Agrupamentos
                        </Button>
                    </div>
                )}
            </div>

            {/* Conteúdo Principal: Tabela Agrupada ou Tabela Corrida */}
            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Carregando painel de aprovações...</p>
                </div>
            ) : filteredDespesas.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 py-12 rounded-3xl text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-white">Tudo em dia!</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {searchQuery || startDate || endDate || selectedEmpresa !== 'ALL'
                            ? "Nenhuma despesa encontrada para os filtros selecionados."
                            : "Nenhuma despesa pendente de aprovação neste momento."}
                    </p>
                </Card>
            ) : groupBy !== 'NONE' ? (
                <>
                    {/* Tabela Agrupada para Desktop (Idêntica à tela de Diárias) */}
                    <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4.5 px-6">{getGroupTypeLabel()}</th>
                                    <th className="py-4.5 px-6 text-center">Qtd. Solicitações</th>
                                    <th className="py-4.5 px-6 text-right">Valor Acumulado</th>
                                    <th className="py-4.5 px-6 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/70">
                                {groupedDespesas.map(group => (
                                    <tr
                                        key={group.key}
                                        onClick={() => {
                                            setSelectedGroup(group)
                                            setSelectedItemIdsForBatch(group.items.map(i => i.id))
                                        }}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700 dark:text-slate-200"
                                    >
                                        <td className="py-4.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    {getGroupIcon()}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                                                        {group.name}
                                                    </span>
                                                    {group.subName && (
                                                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                                                            {group.subName}
                                                        </span>
                                                    )}
                                                    {group.solicitantePix && (
                                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">
                                                            PIX: {group.solicitantePix}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4.5 px-6 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                {group.count} {group.count === 1 ? 'solicitação' : 'solicitações'}
                                            </span>
                                        </td>
                                        <td className="py-4.5 px-6 text-right">
                                            <span className="font-black text-slate-900 dark:text-white tracking-tight text-base">
                                                {formatCurrency(group.totalValue)}
                                            </span>
                                        </td>
                                        <td className="py-4.5 px-6 text-right">
                                            <Button
                                                variant="ghost"
                                                className="text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                            >
                                                Abrir Extrato &rarr;
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cards Agrupados para Mobile */}
                    <div className="block md:hidden space-y-3">
                        {groupedDespesas.map(group => (
                            <div
                                key={group.key}
                                onClick={() => {
                                    setSelectedGroup(group)
                                    setSelectedItemIdsForBatch(group.items.map(i => i.id))
                                }}
                                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer flex justify-between items-center"
                            >
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {getGroupIcon()}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                                            {group.subName}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{group.name}</h4>
                                    {group.solicitantePix && (
                                        <p className="text-[10px] font-mono text-emerald-600 truncate">
                                            PIX: {group.solicitantePix}
                                        </p>
                                    )}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-100 dark:border-slate-700">
                                        {group.count} {group.count === 1 ? 'solicitação' : 'solicitações'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 ml-3 space-y-1">
                                    <span className="font-black text-slate-900 dark:text-white text-base tracking-tight block">
                                        {formatCurrency(group.totalValue)}
                                    </span>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">
                                        Extrato &rarr;
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                /* Modo sem agrupamento: Tabela Corrida Tradicional */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                            disabled={eligibleDespesas.length === 0}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                                            title="Selecionar todos os pendentes desta visualização"
                                        />
                                    </th>
                                    <th className="py-3.5 px-4">Solicitante / Pix</th>
                                    <th className="py-3.5 px-4">Tipo</th>
                                    <th className="py-3.5 px-4">Empresa (Grupo)</th>
                                    <th className="py-3.5 px-4">Descrição / Comentários</th>
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
                                    const isEligibleForBatch = isPendingApproval || isPrestacaoPending
                                    const isSelected = selectedIds.includes(d.id)
                                    const isProcessing = processingId === d.id

                                    return (
                                        <tr 
                                            key={d.id} 
                                            onClick={() => setDetailItem(d)}
                                            className={`transition-colors cursor-pointer ${
                                                isSelected 
                                                    ? "bg-emerald-50/70 dark:bg-emerald-950/20" 
                                                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                            }`}
                                        >
                                            <td 
                                                className="py-3.5 px-3 text-center whitespace-nowrap"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOne(d.id)}
                                                    disabled={!isEligibleForBatch}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-30"
                                                />
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-bold text-xs text-slate-900 dark:text-white hover:text-emerald-600">
                                                    {d.solicitante.nome}
                                                </p>
                                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <span>PIX:</span>
                                                    {(d.chavePix || d.solicitante.chavePix) ? (
                                                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{d.chavePix || d.solicitante.chavePix}</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300">
                                                            ⚠️ Sem PIX
                                                        </span>
                                                    )}
                                                </p>
                                            </td>

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

                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[160px]">{d.empresa?.nome || "Sem empresa"}</span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="font-medium text-slate-900 dark:text-white truncate text-xs" title={d.descricao}>
                                                    {d.descricao}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold underline">
                                                        Clique para ver detalhes
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs text-slate-900 dark:text-white">
                                                {formatCurrency(Number(d.valorSolicitado))}
                                            </td>

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

                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <div>{getStatusBadge(d.status, d.tipo)}</div>
                                                    {d.contaAzulPayableId ? (
                                                        <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50">
                                                            <span>CA: {d.contaAzulPayableId.slice(0, 8)}...</span>
                                                        </div>
                                                    ) : (d.status === "APROVADO" || (d.tipo === "ADIANTAMENTO" && d.status === "PAGO")) ? (
                                                        <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300">
                                                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                                            <span>Pendente no ERP</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>

                                            <td 
                                                className="py-3.5 px-4 whitespace-nowrap"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {d.anexos && d.anexos.length > 0 ? (
                                                    <button
                                                        onClick={() => setPreviewAnexo(d.anexos[0])}
                                                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer underline"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Ver ({d.anexos.length})
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            <td 
                                                className="py-3.5 px-4 whitespace-nowrap text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600 inline-block" />
                                                ) : isPendingApproval ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setDetailItem(d)}
                                                            className="h-8 px-2 rounded-lg text-slate-600 hover:text-slate-900 border-slate-200 text-xs font-medium cursor-pointer"
                                                            title="Ver todos os detalhes e comentários"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>

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
                                                            className="h-8 px-2 rounded-lg border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium cursor-pointer"
                                                            title="Reprovar solicitação"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : isPrestacaoPending ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setDetailItem(d)}
                                                            className="h-8 px-2 rounded-lg text-slate-600 hover:text-slate-900 border-slate-200 text-xs font-medium cursor-pointer"
                                                            title="Ver detalhes da prestação"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>

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
                                                            title="Solicitar ajuste na prestação"
                                                        >
                                                            Ajuste
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {((d.status === "APROVADO" || (d.tipo === "ADIANTAMENTO" && d.status === "PAGO")) && !d.contaAzulPayableId) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleSincronizarContaAzul(d)}
                                                                disabled={syncingId === d.id}
                                                                className="h-8 px-2 rounded-lg border-amber-300 hover:bg-amber-50 text-amber-700 text-xs font-semibold cursor-pointer gap-1"
                                                                title="Sincronizar no Conta Azul agora"
                                                            >
                                                                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === d.id ? "animate-spin" : ""}`} />
                                                                Sincronizar CA
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setDetailItem(d)}
                                                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            Detalhes
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL DE EXTRATO DO GRUPO (Idêntico ao modal de extrato da tela de diárias) */}
            <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
                <DialogContent showCloseButton={false} className="max-w-3xl rounded-3xl border-none shadow-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 shrink-0 text-left bg-white relative">
                        <div className="pr-10">
                            <DialogTitle className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                                <User className="w-5 h-5 text-emerald-600" />
                                Extrato - {selectedGroup?.name}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">
                                {selectedGroup?.subName} &bull; {selectedGroup?.items.length} solicitação(ões) pendente(s)
                                {selectedGroup?.solicitantePix && ` • PIX: ${selectedGroup.solicitantePix}`}
                            </DialogDescription>
                        </div>
                        <DialogClose className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-all cursor-pointer shrink-0 absolute top-5 right-5">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </DialogHeader>

                    {selectedGroup && (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-none bg-slate-50">
                            {/* Checklist Header */}
                            <div className="flex justify-between items-center px-1 pb-2 border-b border-slate-200/60">
                                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroup.items.length > 0 && selectedItemIdsForBatch.length === selectedGroup.items.length}
                                        onChange={toggleAllGroupItems}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                    />
                                    Selecionar Todos ({selectedItemIdsForBatch.length}/{selectedGroup.items.length})
                                </label>
                                <span className="text-xs font-black text-slate-700 tracking-tight">
                                    Total Selecionado: {formatCurrency(
                                        selectedGroup.items
                                            .filter(i => selectedItemIdsForBatch.includes(i.id))
                                            .reduce((acc, item) => acc + Number(item.valorSolicitado || 0), 0)
                                    )}
                                </span>
                            </div>

                            {/* Alerta de Consolidação Conta Azul */}
                            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Ao aprovar, todas as solicitações selecionadas deste colaborador serão consolidadas em <strong>1 único título no Conta Azul</strong> com a soma total.</span>
                            </div>

                            {/* Lista de itens do grupo */}
                            <div className="space-y-2">
                                {selectedGroup.items.map(item => {
                                    const isSelected = selectedItemIdsForBatch.includes(item.id)
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleGroupItemSelection(item.id)}
                                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50 transition-all rounded-2xl border cursor-pointer select-none ${
                                                isSelected 
                                                    ? 'bg-emerald-50/30 border-emerald-300/70 shadow-2xs' 
                                                    : 'bg-white border-slate-200/80'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 pointer-events-none shrink-0"
                                                />
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={item.tipo === "REEMBOLSO" ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]" : "bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]"}>
                                                            {item.tipo}
                                                        </Badge>
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        {item.centroCusto?.nome && (
                                                            <span className="text-[10px] text-slate-400 font-semibold truncate">
                                                                &bull; CC: {item.centroCusto.nome}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-700 font-medium truncate" title={item.descricao}>
                                                        {item.descricao}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="text-right flex flex-col items-end gap-0.5">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">
                                                        {formatCurrency(Number(item.valorSolicitado))}
                                                    </span>
                                                    {item.anexos && item.anexos.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewAnexo(item.anexos[0])}
                                                            className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                                        >
                                                            <FileText className="w-3 h-3" /> {item.anexos.length} anexo(s)
                                                        </button>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDetailItem(item)}
                                                    className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
                                                    title="Ver detalhes completos"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                        <Button 
                            variant="ghost" 
                            onClick={() => setSelectedGroup(null)} 
                            className="w-full sm:w-auto font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-100"
                        >
                            Fechar
                        </Button>
                        {selectedGroup && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="destructive"
                                    disabled={selectedItemIdsForBatch.length === 0}
                                    onClick={() => {
                                        setSelectedIds(selectedItemIdsForBatch)
                                        setIsBatchRejectOpen(true)
                                    }}
                                    className="text-xs font-semibold cursor-pointer"
                                >
                                    Reprovar Selecionados
                                </Button>
                                <Button
                                    disabled={selectedItemIdsForBatch.length === 0 || batchProcessing}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs py-2 w-full sm:w-auto cursor-pointer gap-1.5"
                                    onClick={() => {
                                        const targetEmp = selectedGroup.empresaId && selectedGroup.empresaId !== "SEM_EMPRESA" 
                                            ? selectedGroup.empresaId 
                                            : undefined
                                        handleAprovarLoteComIds(selectedItemIdsForBatch, targetEmp)
                                    }}
                                >
                                    {batchProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Aprovar Selecionados ({selectedItemIdsForBatch.length}) em Lote
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DETALHES COMPLETO DA SOLICITAÇÃO (COMENTÁRIOS, PIX, ITENS, AUDITORIA) */}
            <DespesaDetailModal
                despesa={detailItem as any}
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                onAprovar={handleAprovarSolicitacao}
                onReprovar={(d) => {
                    setSelectedDespesa(d as any)
                    setJustificativaReprovacao("")
                    setIsRejectOpen(true)
                }}
                onAprovarPrestacao={handleAprovarPrestacaoEBaixar}
                onSincronizarContaAzul={handleSincronizarContaAzul}
                isApprover={true}
                empresas={empresas}
            />

            {/* MODAL DE REPROVAÇÃO INDIVIDUAL */}
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
                                    {selectedDespesa.solicitante.nome} &mdash; {selectedDespesa.descricao}
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

            {/* MODAL DE REPROVAÇÃO EM LOTE */}
            <Dialog open={isBatchRejectOpen} onOpenChange={setIsBatchRejectOpen}>
                <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                            <XCircle className="w-5 h-5" />
                            Reprovar Despesa(s) em Lote
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            A justificativa informada será registrada no histórico de todas as despesas selecionadas.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReprovarLoteSubmit} className="space-y-4 pt-2">
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                            Total a reprovar: <strong>{(selectedIds.length > 0 ? selectedIds : selectedItemIdsForBatch).length} solicitações</strong>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Justificativa da Reprovação *
                            </Label>
                            <Textarea
                                required
                                rows={3}
                                placeholder="Informe o motivo para reprovar todas as despesas selecionadas..."
                                value={batchRejectJustificativa}
                                onChange={(e) => setBatchRejectJustificativa(e.target.value)}
                                className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs resize-none"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsBatchRejectOpen(false)}
                                className="h-10 text-xs rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={batchProcessing}
                                className="h-10 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                            >
                                {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Reprovação em Lote"}
                            </Button>
                        </DialogFooter>
                    </form>
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
