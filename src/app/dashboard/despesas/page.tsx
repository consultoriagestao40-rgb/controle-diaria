"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    Wallet, Plus, Loader2, Calendar, Receipt, DollarSign, 
    FileUp, CheckCircle, Clock, AlertCircle, XCircle, Search, 
    ExternalLink, Eye, ArrowRight, ShieldCheck, Building2, 
    FileText, ArrowDownLeft, ArrowUpRight, Check, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
    Dialog, DialogContent, DialogDescription, 
    DialogFooter, DialogHeader, DialogTitle, DialogClose 
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { compressImageIfNeeded } from "@/lib/image-compress"
import { AttachmentViewer } from "@/components/dashboard/attachment-viewer"
import { DespesaDetailModal } from "@/components/dashboard/despesa-detail-modal"

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
    observacao?: string | null
    createdAt: string
    dataPagamento?: string | null
    contaAzulPayableId?: string | null
    contaAzulStatus?: string | null
    empresa?: { id: string; nome: string } | null
    empresaId?: string | null
    anexos: any[]
    solicitante: { id: string; nome: string; email: string; role?: string; chavePix?: string | null }
}

interface Empresa {
    id: string
    nome: string
    ativo: boolean
}

export default function MinhasDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [empresas, setEmpresas] = useState<Empresa[]>([])
    const [loading, setLoading] = useState(true)
    const [filterTab, setFilterTab] = useState<"TODAS" | "REEMBOLSO" | "ADIANTAMENTO" | "PENDENTES" | "CONCLUIDAS">("TODAS")
    const [searchQuery, setSearchQuery] = useState("")
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)
    const [detailDespesa, setDetailDespesa] = useState<Despesa | null>(null)

    // Modal Nova Solicitação
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [tipoNovo, setTipoNovo] = useState<"REEMBOLSO" | "ADIANTAMENTO">("REEMBOLSO")
    const [empresaIdNovo, setEmpresaIdNovo] = useState("")
    const [chavePixNovo, setChavePixNovo] = useState("")
    const [descricaoNovo, setDescricaoNovo] = useState("")
    const [valorNovo, setValorNovo] = useState("")
    const [anexoNovo, setAnexoNovo] = useState<any | null>(null)
    const [uploadingAnexo, setUploadingAnexo] = useState(false)
    const [submittingNovo, setSubmittingNovo] = useState(false)

    // Modal Prestação de Contas
    const [isPrestacaoOpen, setIsPrestacaoOpen] = useState(false)
    const [despesaPrestacao, setDespesaPrestacao] = useState<Despesa | null>(null)
    const [valorComprovado, setValorComprovado] = useState("")
    const [observacaoPrestacao, setObservacaoPrestacao] = useState("")
    const [anexosPrestacao, setAnexosPrestacao] = useState<any[]>([])
    const [uploadingPrestacao, setUploadingPrestacao] = useState(false)
    const [submittingPrestacao, setSubmittingPrestacao] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [resDespesas, resEmpresas, resProfile] = await Promise.all([
                fetch("/api/despesas"),
                fetch("/api/admin/empresas"),
                fetch("/api/user/profile")
            ])

            if (resDespesas.ok) {
                const data = await resDespesas.json()
                setDespesas(Array.isArray(data) ? data : [])
            }

            if (resEmpresas.ok) {
                const dataEmp = await resEmpresas.json()
                const ativas = (Array.isArray(dataEmp) ? dataEmp : []).filter((e: Empresa) => e.ativo)
                setEmpresas(ativas)
                if (ativas.length > 0 && !empresaIdNovo) {
                    setEmpresaIdNovo(ativas[0].id)
                }
            }

            if (resProfile.ok) {
                const profile = await resProfile.json()
                if (profile.chavePix && !chavePixNovo) {
                    setChavePixNovo(profile.chavePix)
                }
            }
        } catch (err) {
            console.error(err)
            toast.error("Erro ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    // Upload de arquivo único (Nova Solicitação)
    const handleFileUploadNovo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingAnexo(true)
        try {
            const compressed = await compressImageIfNeeded(file)
            const formData = new FormData()
            formData.append("file", compressed)
            formData.append("categoria", tipoNovo.toLowerCase())

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (!res.ok) throw new Error("Falha no upload")
            const data = await res.json()
            setAnexoNovo(data)
            toast.success("Comprovante anexado!")
        } catch (err: any) {
            toast.error(err.message || "Erro ao anexar arquivo.")
        } finally {
            setUploadingAnexo(false)
        }
    }

    // Upload de comprovante na Prestação de Contas
    const handleFileUploadPrestacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploadingPrestacao(true)
        try {
            const newAnexos = [...anexosPrestacao]
            for (let i = 0; i < files.length; i++) {
                const compressed = await compressImageIfNeeded(files[i])
                const formData = new FormData()
                formData.append("file", compressed)
                formData.append("categoria", "prestacao")

                const res = await fetch("/api/upload", { method: "POST", body: formData })
                if (res.ok) {
                    const data = await res.json()
                    newAnexos.push(data)
                }
            }
            setAnexosPrestacao(newAnexos)
            toast.success("Comprovante(s) adicionado(s)!")
        } catch (err: any) {
            toast.error("Erro ao fazer upload.")
        } finally {
            setUploadingPrestacao(false)
        }
    }

    // Submissão de Nova Solicitação
    const handleCreateSolicitacao = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!empresaIdNovo) {
            toast.error("Selecione a Empresa do Grupo.")
            return
        }

        if (!chavePixNovo.trim()) {
            toast.error("Informe a Chave Pix para recebimento.")
            return
        }

        if (!descricaoNovo.trim()) {
            toast.error("Descreva a finalidade do gasto.")
            return
        }

        const val = parseFloat(valorNovo.replace(/\./g, "").replace(",", "."))
        if (isNaN(val) || val <= 0) {
            toast.error("Informe um valor válido maior que zero.")
            return
        }

        if (tipoNovo === "REEMBOLSO" && !anexoNovo) {
            toast.error("O comprovante é obrigatório para solicitações de Reembolso.")
            return
        }

        setSubmittingNovo(true)
        try {
            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: tipoNovo,
                    empresaId: empresaIdNovo,
                    chavePix: chavePixNovo.trim(),
                    descricao: descricaoNovo.trim(),
                    valorSolicitado: val,
                    anexos: anexoNovo ? [anexoNovo] : [],
                    enviarParaAprovacao: true
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Erro ao criar solicitação.")
            }

            toast.success(`${tipoNovo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"} solicitado com sucesso!`)
            setIsCreateOpen(false)
            setDescricaoNovo("")
            setValorNovo("")
            setAnexoNovo(null)
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar solicitação.")
        } finally {
            setSubmittingNovo(false)
        }
    }

    // Submissão de Prestação de Contas
    const handleSubmitPrestacao = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!despesaPrestacao) return

        const val = parseFloat(valorComprovado.replace(/\./g, "").replace(",", "."))
        if (isNaN(val) || val < 0) {
            toast.error("Informe o valor comprovado gasto.")
            return
        }

        if (anexosPrestacao.length === 0) {
            toast.error("Anexe ao menos um comprovante ou nota fiscal.")
            return
        }

        setSubmittingPrestacao(true)
        try {
            const res = await fetch(`/api/despesas/${despesaPrestacao.id}/prestar-contas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    valorComprovado: val,
                    anexos: anexosPrestacao,
                    observacao: observacaoPrestacao.trim(),
                    prestacaoParcial: val < Number(despesaPrestacao.valorSolicitado)
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao enviar prestação de contas.")

            toast.success("Prestação de contas enviada com sucesso para validação do gestor!")
            setIsPrestacaoOpen(false)
            setDespesaPrestacao(null)
            setValorComprovado("")
            setObservacaoPrestacao("")
            setAnexosPrestacao([])
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Erro ao prestar contas.")
        } finally {
            setSubmittingPrestacao(false)
        }
    }

    // Abrir Modal de Prestação
    const openPrestacaoModal = (despesa: Despesa) => {
        setDespesaPrestacao(despesa)
        setValorComprovado(Number(despesa.valorSolicitado).toFixed(2).replace(".", ","))
        setObservacaoPrestacao("")
        setAnexosPrestacao([])
        setIsPrestacaoOpen(true)
    }

    // Cálculo em tempo real do saldo da prestação
    const calculoPrestacao = useMemo(() => {
        if (!despesaPrestacao) return null
        const original = Number(despesaPrestacao.valorSolicitado)
        const comprovado = parseFloat(valorComprovado.replace(/\./g, "").replace(",", ".")) || 0
        const saldo = original - comprovado
        return { original, comprovado, saldo }
    }, [despesaPrestacao, valorComprovado])

    // Filtragem de despesas
    const filteredDespesas = useMemo(() => {
        return despesas.filter(d => {
            // Tab filter
            if (filterTab === "REEMBOLSO" && d.tipo !== "REEMBOLSO") return false
            if (filterTab === "ADIANTAMENTO" && d.tipo !== "ADIANTAMENTO") return false
            
            if (filterTab === "PENDENTES") {
                // Reembolso pago ou concluído já foi finalizado
                if (d.tipo === "REEMBOLSO" && ["PAGO", "CONCLUIDO", "REPROVADO"].includes(d.status)) return false
                // Adiantamento concluído ou reprovado
                if (d.tipo === "ADIANTAMENTO" && ["CONCLUIDO", "REPROVADO"].includes(d.status)) return false
            }

            if (filterTab === "CONCLUIDAS") {
                if (d.tipo === "REEMBOLSO") {
                    if (!["PAGO", "CONCLUIDO"].includes(d.status)) return false
                } else {
                    if (d.status !== "CONCLUIDO") return false
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchDesc = d.descricao.toLowerCase().includes(q)
                const matchEmp = d.empresa?.nome.toLowerCase().includes(q)
                const matchPix = (d.chavePix || "").toLowerCase().includes(q)
                const matchVal = String(d.valorSolicitado).includes(q)
                if (!matchDesc && !matchEmp && !matchPix && !matchVal) return false
            }

            return true
        })
    }, [despesas, filterTab, searchQuery])

    // KPIs calculados
    const kpis = useMemo(() => {
        const total = despesas.reduce((acc, d) => acc + Number(d.valorSolicitado), 0)
        const pendentes = despesas.filter(d => {
            if (d.tipo === "REEMBOLSO") return !["PAGO", "CONCLUIDO", "REPROVADO"].includes(d.status)
            return !["CONCLUIDO", "REPROVADO"].includes(d.status)
        }).reduce((acc, d) => acc + Number(d.valorSolicitado), 0)

        const adiantamentosAbertos = despesas.filter(d => 
            d.tipo === "ADIANTAMENTO" && ["PAGO", "AGUARDANDO_PRESTACAO"].includes(d.status)
        ).length

        const concluidas = despesas.filter(d => {
            if (d.tipo === "REEMBOLSO") return ["PAGO", "CONCLUIDO"].includes(d.status)
            return d.status === "CONCLUIDO"
        }).length

        return { total, pendentes, adiantamentosAbertos, concluidas }
    }, [despesas])

    const getStatusBadge = (status: string, tipo: string) => {
        switch (status) {
            case "AGUARDANDO_APROVACAO_N1":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Aguardando N1</Badge>
            case "AGUARDANDO_APROVACAO_N2":
                return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-medium">Aguardando N2</Badge>
            case "APROVADO":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">Aprovado (Conta Azul)</Badge>
            case "PAGO":
                return tipo === "ADIANTAMENTO"
                    ? <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Pago (Prestar Contas)</Badge>
                    : <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Pago</Badge>
            case "AGUARDANDO_PRESTACAO":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Aguardando Prestação</Badge>
            case "AGUARDANDO_CONCILIACAO":
                return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Prestação em Análise</Badge>
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
            {/* Header com Ação Principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Reembolsos & Adiantamentos
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Crie solicitações, acompanhe aprovações no Conta Azul e preste contas com facilidade.
                    </p>
                </div>
                <Button 
                    onClick={() => setIsCreateOpen(true)}
                    className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
                >
                    <Plus className="w-5 h-5" />
                    Nova Solicitação
                </Button>
            </div>

            {/* 3 KPIs Essenciais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Solicitado</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(kpis.total)}</p>
                            <p className="text-xs text-slate-500">{despesas.length} solicitação(ões) no total</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Receipt className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Em Aberto / Análise</p>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(kpis.pendentes)}</p>
                            <p className="text-xs text-slate-500">Aguardando aprovação ou pagamento</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Adiantamentos a Prestar</p>
                            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{kpis.adiantamentosAbertos}</p>
                            <p className="text-xs text-slate-500">Aguardando envio de comprovantes</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(["TODAS", "REEMBOLSO", "ADIANTAMENTO", "PENDENTES", "CONCLUIDAS"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                filterTab === tab 
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs" 
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                            {tab === "TODAS" && "Todas"}
                            {tab === "REEMBOLSO" && "Reembolsos"}
                            {tab === "ADIANTAMENTO" && "Adiantamentos"}
                            {tab === "PENDENTES" && "Pendentes"}
                            {tab === "CONCLUIDAS" && "Concluídas"}
                        </button>
                    ))}
                </div>

                <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                        placeholder="Buscar por descrição, empresa, valor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs"
                    />
                </div>
            </div>

            {/* Tabela Simples e Objetiva */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm">Carregando solicitações...</p>
                    </div>
                ) : filteredDespesas.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">Nenhuma solicitação encontrada</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Clique no botão "Nova Solicitação" acima para cadastrar um reembolso ou adiantamento.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4">Tipo</th>
                                    <th className="py-3.5 px-4">Data</th>
                                    <th className="py-3.5 px-4">Empresa (Grupo)</th>
                                    <th className="py-3.5 px-4">Descrição</th>
                                    <th className="py-3.5 px-4">Valor</th>
                                    <th className="py-3.5 px-4">Chave Pix</th>
                                    <th className="py-3.5 px-4">Situação</th>
                                    <th className="py-3.5 px-4">Comprovante</th>
                                    <th className="py-3.5 px-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                                {filteredDespesas.map((d) => {
                                    const podePrestarContas = d.tipo === "ADIANTAMENTO" && ["PAGO", "AGUARDANDO_PRESTACAO"].includes(d.status)

                                    return (
                                        <tr 
                                            key={d.id} 
                                            onClick={() => setDetailDespesa(d)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                        >
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {d.tipo === "REEMBOLSO" ? (
                                                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold gap-1">
                                                        <Receipt className="w-3 h-3" /> Reembolso
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold gap-1">
                                                        <DollarSign className="w-3 h-3" /> Adiantamento
                                                    </Badge>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    {d.empresa?.nome || "Sem empresa"}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="font-semibold text-slate-900 dark:text-white truncate text-xs" title={d.descricao}>
                                                    {d.descricao}
                                                </p>
                                                {d.valorComprovado !== null && (
                                                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                                                        Gasto comprovado: {formatCurrency(Number(d.valorComprovado))}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs text-slate-900 dark:text-white">
                                                {formatCurrency(Number(d.valorSolicitado))}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-300">
                                                {d.chavePix || d.solicitante.chavePix || "-"}
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {getStatusBadge(d.status, d.tipo)}
                                            </td>

                                            {/* Comprovantes */}
                                            <td 
                                                className="py-3.5 px-4 whitespace-nowrap"
                                                onClick={(e) => e.stopPropagation()}
                                            >
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

                                            <td 
                                                className="py-3.5 px-4 whitespace-nowrap text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {podePrestarContas ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openPrestacaoModal(d)}
                                                        className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer gap-1.5"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Prestar Contas
                                                    </Button>
                                                ) : d.status === "AGUARDANDO_CONCILIACAO" ? (
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                        Em análise pelo gestor
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDetailDespesa(d)}
                                                        className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                                        Detalhes
                                                    </Button>
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

            {/* MODAL: NOVA SOLICITAÇÃO (SIMPLES E OBJETIVO) */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Nova Solicitação
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Preencha os dados obrigatórios para integração com o Conta Azul.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSolicitacao} className="space-y-4 pt-2">
                        {/* Seletor Tipo */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setTipoNovo("REEMBOLSO")}
                                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    tipoNovo === "REEMBOLSO"
                                        ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                            >
                                <Receipt className="w-3.5 h-3.5" /> Reembolso
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipoNovo("ADIANTAMENTO")}
                                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    tipoNovo === "ADIANTAMENTO"
                                        ? "bg-white dark:bg-slate-900 text-purple-600 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                            >
                                <DollarSign className="w-3.5 h-3.5" /> Adiantamento
                            </button>
                        </div>

                        {/* Empresa do Grupo (OBRIGATÓRIO) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                Empresa do Grupo *
                            </Label>
                            <select
                                required
                                value={empresaIdNovo}
                                onChange={(e) => setEmpresaIdNovo(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="" disabled>Selecione a empresa...</option>
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Chave Pix do Solicitante (OBRIGATÓRIO) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Chave Pix do Solicitante (para pagamento) *
                            </Label>
                            <Input
                                required
                                placeholder="CPF, e-mail, telefone ou chave aleatória"
                                value={chavePixNovo}
                                onChange={(e) => setChavePixNovo(e.target.value)}
                                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs"
                            />
                        </div>

                        {/* Descrição / Motivo */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Descrição do Gasto / Finalidade *
                            </Label>
                            <Textarea
                                required
                                rows={2}
                                placeholder="Ex: Abastecimento de combustível para visita aos postos de Ponta Grossa"
                                value={descricaoNovo}
                                onChange={(e) => setDescricaoNovo(e.target.value)}
                                className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs resize-none"
                            />
                        </div>

                        {/* Valor Solicitado */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Valor Solicitado (R$) *
                            </Label>
                            <Input
                                required
                                placeholder="0,00"
                                value={valorNovo}
                                onChange={(e) => setValorNovo(e.target.value)}
                                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Comprovante */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>Comprovante / Nota Fiscal {tipoNovo === "REEMBOLSO" ? "*" : "(Opcional)"}</span>
                                {tipoNovo === "REEMBOLSO" && <span className="text-[10px] text-amber-600 font-normal">Obrigatório p/ Reembolso</span>}
                            </Label>

                            {anexoNovo ? (
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                                    <div className="flex items-center gap-2 truncate">
                                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-xs font-medium text-blue-900 dark:text-blue-300 truncate">
                                            {anexoNovo.nomeOriginal}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAnexoNovo(null)}
                                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all">
                                    <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {uploadingAnexo ? "Enviando arquivo..." : "Clique para anexar foto ou PDF"}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUploadNovo}
                                        disabled={uploadingAnexo}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                className="h-10 text-xs rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingNovo || uploadingAnexo}
                                className="h-10 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                            >
                                {submittingNovo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Solicitação"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: PRESTAÇÃO DE CONTAS (SIMPLES, TOTAL OU PARCIAL) */}
            <Dialog open={isPrestacaoOpen} onOpenChange={setIsPrestacaoOpen}>
                <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-600">
                            <FileText className="w-5 h-5" />
                            Prestação de Contas
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Informe o valor real gasto e anexe os comprovantes.
                        </DialogDescription>
                    </DialogHeader>

                    {despesaPrestacao && calculoPrestacao && (
                        <form onSubmit={handleSubmitPrestacao} className="space-y-4 pt-2">
                            {/* Resumo do Adiantamento */}
                            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
                                <p className="text-xs text-purple-900 dark:text-purple-300 font-medium">
                                    Adiantamento Original: <strong className="font-bold text-sm">{formatCurrency(calculoPrestacao.original)}</strong>
                                </p>
                                <p className="text-xs text-slate-500 truncate" title={despesaPrestacao.descricao}>
                                    Motivo: {despesaPrestacao.descricao}
                                </p>
                            </div>

                            {/* Valor Comprovado (Gasto Real) */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Valor Comprovado (Gasto Real) R$ *
                                </Label>
                                <Input
                                    required
                                    placeholder="0,00"
                                    value={valorComprovado}
                                    onChange={(e) => setValorComprovado(e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Card de Cálculo de Saldo (Dinâmico) */}
                            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                                calculoPrestacao.saldo === 0
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                                    : calculoPrestacao.saldo > 0
                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300"
                                    : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300"
                            }`}>
                                <p className="font-bold">
                                    {calculoPrestacao.saldo === 0 && "✅ Prestação Total (100% comprovado)"}
                                    {calculoPrestacao.saldo > 0 && `⚠️ Prestação Parcial — Devolver à empresa: ${formatCurrency(calculoPrestacao.saldo)}`}
                                    {calculoPrestacao.saldo < 0 && `ℹ️ Gasto maior — A receber reembolso: ${formatCurrency(Math.abs(calculoPrestacao.saldo))}`}
                                </p>
                                <p className="text-[11px] opacity-80">
                                    {calculoPrestacao.saldo > 0 && "O valor não utilizado será baixado ou devolvido via Pix à conta da empresa."}
                                    {calculoPrestacao.saldo === 0 && "O adiantamento será totalmente liquidado e arquivado após a validação."}
                                </p>
                            </div>

                            {/* Upload de Comprovantes */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Comprovantes / Notas Fiscais * ({anexosPrestacao.length} anexado(s))
                                </Label>

                                <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all">
                                    <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {uploadingPrestacao ? "Enviando comprovantes..." : "Clique para anexar notas fiscais"}
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUploadPrestacao}
                                        disabled={uploadingPrestacao}
                                        className="hidden"
                                    />
                                </label>

                                {anexosPrestacao.length > 0 && (
                                    <div className="space-y-1 max-h-28 overflow-y-auto">
                                        {anexosPrestacao.map((anexo, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                                                <span className="truncate max-w-[240px] text-slate-700 dark:text-slate-300">
                                                    {anexo.nomeOriginal}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAnexosPrestacao(anexosPrestacao.filter((_, i) => i !== idx))}
                                                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Observação */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Observações da Prestação
                                </Label>
                                <Input
                                    placeholder="Ex: Todas as notas fiscais anexadas conforme gastos reais."
                                    value={observacaoPrestacao}
                                    onChange={(e) => setObservacaoPrestacao(e.target.value)}
                                    className="h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsPrestacaoOpen(false)}
                                    className="h-10 text-xs rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingPrestacao || uploadingPrestacao}
                                    className="h-10 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
                                >
                                    {submittingPrestacao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Prestação"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes Completo da Solicitação */}
            <DespesaDetailModal
                despesa={detailDespesa as any}
                isOpen={!!detailDespesa}
                onClose={() => setDetailDespesa(null)}
                isApprover={false}
            />

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
