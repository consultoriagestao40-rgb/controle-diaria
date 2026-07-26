"use client"

import { useState, useEffect } from "react"
import {
    Receipt, FileSpreadsheet, Printer, Search, Filter, Loader2, ArrowLeft,
    TrendingUp, DollarSign, Zap, Building2, MapPin, Calendar, Percent, CheckCircle2, ShieldCheck,
    CheckSquare, Square, FileText, Check, AlertCircle, Eye, Sparkles, X, ChevronRight, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import Link from "next/link"

interface FaturamentoItem {
    id: string
    data: string
    postoNome: string
    empresaId: string | null
    empresaNome: string
    diaristaNome: string
    reservaNome: string
    motivo: string
    valorDiaria: number
    taxaServicoPercentual: number
    valorTaxaServico: number
    valorFaturaCliente: number
    antecipada: boolean
    taxaAntecipacaoRetida: number
    valorPagoDiarista: number
    lucroPlantao: number
    status: string
    faturado: boolean
    faturaCliente?: {
        id: string
        numeroFatura: string
        geradaEm: string
        status: string
    } | null
}

interface TotaisFaturamento {
    qtdPlantoes: number
    totalDiariasBruto: number
    totalTaxaServicoCliente: number
    totalFaturaCliente: number
    totalCustoDiarista: number
    totalGanhoAntecipacao: number
    totalLucroPrestadora: number
}

interface CoberturaFatura {
    id: string
    data: string
    valor: number | string
    posto: { nome: string }
    diarista: { nome: string }
    motivo: { descricao: string }
}

interface FaturaEmitida {
    id: string
    numeroFatura: string
    empresaId: string
    empresa: { nome: string }
    valorDiarias: number
    taxaServicoPercentual: number
    valorTaxaServico: number
    valorTotal: number
    status: string
    vencimentoEm?: string | null
    createdAt: string
    coberturas?: CoberturaFatura[]
}

export default function FaturamentoClientesPage() {
    const [items, setItems] = useState<FaturamentoItem[]>([])
    const [totais, setTotais] = useState<TotaisFaturamento | null>(null)
    const [faturasEmitidas, setFaturasEmitidas] = useState<FaturaEmitida[]>([])
    const [loading, setLoading] = useState(true)

    // Abas de visualização
    const [statusTab, setStatusTab] = useState<"A_FATURAR" | "FATURADAS">("A_FATURAR")

    // Seleção manual de diárias para faturamento
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Filtros
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [empresaId, setEmpresaId] = useState("ALL")
    const [postoId, setPostoId] = useState("ALL")
    const [search, setSearch] = useState("")

    // Catalogs
    const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
    const [postos, setPostos] = useState<{ id: string; nome: string }[]>([])

    // Taxa do cliente
    const [taxaServicoInput, setTaxaServicoInput] = useState<number>(10.0)
    const [savingTaxa, setSavingTaxa] = useState(false)
    const [gerandoFatura, setGerandoFatura] = useState(false)

    // Modal da Fatura Gerada (Visualização Oficial)
    const [faturaModalOpen, setFaturaModalOpen] = useState(false)
    const [faturaDetalhe, setFaturaDetalhe] = useState<{
        numeroFatura: string
        empresaNome: string
        geradaEm: string
        vencimentoEm: string
        taxaServicoPercentual: number
        items: {
            id: string
            data: string
            postoNome: string
            diaristaNome: string
            valorDiaria: number
            valorTaxaServico: number
            valorFaturaCliente: number
        }[]
        totalDiarias: number
        totalTaxa: number
        totalFatura: number
    } | null>(null)

    const fetchFaturamento = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append("statusFaturamento", statusTab)
            if (startDate) params.append("start", startDate)
            if (endDate) params.append("end", endDate)
            if (empresaId !== "ALL") params.append("empresaId", empresaId)
            if (postoId !== "ALL") params.append("postoId", postoId)

            const res = await fetch(`/api/admin/faturamento?${params.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()

            setItems(data.items || [])
            setTotais(data.totais || null)
            setFaturasEmitidas(data.faturasEmitidas || [])
            if (data.config?.taxaServicoClientePercentual !== undefined) {
                setTaxaServicoInput(data.config.taxaServicoClientePercentual)
            }
            setSelectedIds([])
        } catch {
            toast.error("Erro ao carregar dados de faturamento.")
        } finally {
            setLoading(false)
        }
    }

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) {
                const data = await res.json()
                setEmpresas(data.empresas || [])
                setPostos(data.postos || [])
            }
        } catch { }
    }

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        fetchFaturamento()
    }, [statusTab])

    const handleSalvarTaxaServico = async () => {
        setSavingTaxa(true)
        try {
            const res = await fetch("/api/admin/faturamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    acao: "SALVAR_TAXA",
                    taxaServicoClientePercentual: taxaServicoInput
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao salvar taxa.")

            toast.success("Taxa de Serviço do Cliente atualizada com sucesso!")
            fetchFaturamento()
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar taxa.")
        } finally {
            setSavingTaxa(false)
        }
    }

    // Seleção de Diárias
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredItems.map(i => i.id))
        }
    }

    const toggleSelectItem = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    // Ação: Gerar Fatura do Cliente com os Itens Selecionados
    const handleGerarFaturaCliente = async () => {
        if (selectedIds.length === 0) {
            toast.error("Selecione ao menos 1 diária para gerar a fatura.")
            return
        }

        const selectedItemsList = items.filter(i => selectedIds.includes(i.id))
        const firstEmpresaId = selectedItemsList[0]?.empresaId
        const firstEmpresaNome = selectedItemsList[0]?.empresaNome

        if (!firstEmpresaId) {
            toast.error("Diárias selecionadas precisam estar vinculadas a um Cliente / Empresa.")
            return
        }

        const sameEmpresa = selectedItemsList.every(i => i.empresaId === firstEmpresaId)
        if (!sameEmpresa) {
            toast.error("Selecione diárias pertencentes ao MESMO cliente para gerar uma única fatura.")
            return
        }

        setGerandoFatura(true)
        try {
            const res = await fetch("/api/admin/faturamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    acao: "GERAR_FATURA",
                    coberturaIds: selectedIds,
                    empresaId: firstEmpresaId
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao gerar fatura.")

            toast.success(data.message)

            let totalDiarias = 0
            let totalTaxa = 0
            let totalFatura = 0

            const mappedItems = selectedItemsList.map(i => {
                totalDiarias += i.valorDiaria
                totalTaxa += i.valorTaxaServico
                totalFatura += i.valorFaturaCliente
                return {
                    id: i.id,
                    data: i.data,
                    postoNome: i.postoNome,
                    diaristaNome: i.diaristaNome,
                    valorDiaria: i.valorDiaria,
                    valorTaxaServico: i.valorTaxaServico,
                    valorFaturaCliente: i.valorFaturaCliente
                }
            })

            const hoje = new Date()
            const vencimento = new Date()
            vencimento.setDate(vencimento.getDate() + 10)

            setFaturaDetalhe({
                numeroFatura: data.fatura.numeroFatura,
                empresaNome: firstEmpresaNome,
                geradaEm: hoje.toLocaleDateString("pt-BR"),
                vencimentoEm: vencimento.toLocaleDateString("pt-BR"),
                taxaServicoPercentual: taxaServicoInput,
                items: mappedItems,
                totalDiarias,
                totalTaxa,
                totalFatura
            })

            setFaturaModalOpen(true)
            fetchFaturamento()

        } catch (err: any) {
            toast.error(err.message || "Erro ao gerar fatura do cliente.")
        } finally {
            setGerandoFatura(false)
        }
    }

    // Visualizar extrato/documento de fatura da Tabela de Faturas Emitidas
    const handleAbrirFaturaEmitida = (fatura: FaturaEmitida) => {
        const taxa = Number(fatura.taxaServicoPercentual || 10.0)
        let totalDiarias = Number(fatura.valorDiarias || 0)
        let totalTaxa = Number(fatura.valorTaxaServico || 0)
        let totalFatura = Number(fatura.valorTotal || 0)

        const mappedItems = (fatura.coberturas || []).map(c => {
            const vDiaria = Number(c.valor || 0)
            const vTaxa = Number((vDiaria * (taxa / 100)).toFixed(2))
            const vFatura = Number((vDiaria + vTaxa).toFixed(2))
            return {
                id: c.id,
                data: c.data,
                postoNome: c.posto?.nome || "Posto de Trabalho",
                diaristaNome: c.diarista?.nome || "Diarista",
                valorDiaria: vDiaria,
                valorTaxaServico: vTaxa,
                valorFaturaCliente: vFatura
            }
        })

        const gerada = new Date(fatura.createdAt)
        const vencimento = fatura.vencimentoEm ? new Date(fatura.vencimentoEm) : new Date(gerada.getTime() + 10 * 24 * 60 * 60 * 1000)

        setFaturaDetalhe({
            numeroFatura: fatura.numeroFatura,
            empresaNome: fatura.empresa?.nome || "Cliente",
            geradaEm: gerada.toLocaleDateString("pt-BR"),
            vencimentoEm: vencimento.toLocaleDateString("pt-BR"),
            taxaServicoPercentual: taxa,
            items: mappedItems,
            totalDiarias,
            totalTaxa,
            totalFatura
        })

        setFaturaModalOpen(true)
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const filteredItems = items.filter(item => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            item.empresaNome.toLowerCase().includes(s) ||
            item.postoNome.toLowerCase().includes(s) ||
            item.diaristaNome.toLowerCase().includes(s) ||
            item.reservaNome.toLowerCase().includes(s)
        )
    })

    const filteredFaturas = faturasEmitidas.filter(f => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            f.numeroFatura.toLowerCase().includes(s) ||
            f.empresa?.nome.toLowerCase().includes(s)
        )
    })

    const selectedItemsList = filteredItems.filter(i => selectedIds.includes(i.id))
    const totalSelecionadoFatura = selectedItemsList.reduce((acc, i) => acc + i.valorFaturaCliente, 0)

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-primary" />
                            Fechamento & Faturamento de Clientes
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Selecione as diárias prestadas e emita a Fatura Oficial de Fechamento para o cliente contratante.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => {
                            const params = new URLSearchParams()
                            if (startDate) params.append("start", startDate)
                            if (endDate) params.append("end", endDate)
                            window.open(`/api/finance/export?${params.toString()}`, '_blank')
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Configuração Rápida de Taxa do Cliente */}
            <Card className="bg-slate-900 text-white rounded-3xl border-slate-800 shadow-xl overflow-hidden print:hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Taxa de Gestão / Serviço</Badge>
                            <span className="text-xs text-slate-400 font-medium">Markup cobrado na Fatura do Cliente</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight">Configurar Taxa de Serviço do Cliente (%)</h3>
                        <p className="text-xs text-slate-400 max-w-xl">
                            Esta taxa de acréscimo é aplicada sobre o valor das diárias para compor a fatura final do cliente. As diárias não selecionadas permanecerão com status <strong>A Faturar</strong>.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                        <div className="relative w-28">
                            <Input
                                type="number"
                                step="0.5"
                                value={taxaServicoInput}
                                onChange={(e) => setTaxaServicoInput(Number(e.target.value))}
                                className="bg-slate-900 border-slate-700 text-white font-black text-right pr-7 rounded-xl"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                        </div>
                        <Button
                            onClick={handleSalvarTaxaServico}
                            disabled={savingTaxa}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                        >
                            {savingTaxa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Taxa"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Gerenciais */}
            {totais && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                    {/* 1. Total Fatura Cliente */}
                    <Card className="bg-gradient-to-br from-cyan-950/90 to-slate-900 text-white rounded-3xl border-cyan-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">Total Fatura Cliente</span>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {formatCurrency(totais.totalFaturaCliente)}
                                </div>
                                <p className="text-[10px] text-cyan-300/80 font-medium">{totais.qtdPlantoes} plantões listados</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                                <Receipt className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Receita Taxa de Serviço (Cliente) */}
                    <Card className="bg-gradient-to-br from-emerald-950/90 to-slate-900 text-white rounded-3xl border-emerald-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Taxa de Serviço ({taxaServicoInput}%)</span>
                                <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                    {formatCurrency(totais.totalTaxaServicoCliente)}
                                </div>
                                <p className="text-[10px] text-slate-400">Margem faturada ao cliente</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <Percent className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Receita de Antecipações */}
                    <Card className="bg-gradient-to-br from-amber-950/90 to-slate-900 text-white rounded-3xl border-amber-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Ganho c/ Antecipação</span>
                                <div className="text-2xl font-black text-amber-400 tracking-tight">
                                    {formatCurrency(totais.totalGanhoAntecipacao)}
                                </div>
                                <p className="text-[10px] text-slate-400">Retenção interna da plataforma</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Zap className="h-6 w-6 fill-amber-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Lucro Total da Prestadora */}
                    <Card className="bg-gradient-to-br from-indigo-950/90 to-slate-900 text-white rounded-3xl border-indigo-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">Lucro Bruto Prestadora</span>
                                <div className="text-2xl font-black text-indigo-300 tracking-tight">
                                    {formatCurrency(totais.totalLucroPrestadora)}
                                </div>
                                <p className="text-[10px] text-slate-400">Taxa Serviço + Antecipações</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SELETOR DE ABAS: ABA 1 (A FATURAR) vs ABA 2 (FATURAS FECHADAS) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3 print:hidden">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setStatusTab("A_FATURAR")}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            statusTab === "A_FATURAR"
                                ? "bg-white text-slate-900 shadow-md"
                                : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        ⏳ Aba 1: Diárias a Faturar (Pendentes)
                    </button>
                    <button
                        onClick={() => setStatusTab("FATURADAS")}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            statusTab === "FATURADAS"
                                ? "bg-white text-slate-900 shadow-md"
                                : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        📄 Aba 2: Tabela de Faturas Emitidas (Fechadas)
                    </button>
                </div>

                {statusTab === "A_FATURAR" && selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl animate-fade-in">
                        <div className="text-xs">
                            <span className="font-black text-emerald-800">{selectedIds.length} diárias selecionadas</span>
                            <span className="text-slate-500 ml-2 font-bold">Total Fatura: {formatCurrency(totalSelecionadoFatura)}</span>
                        </div>
                        <Button
                            onClick={handleGerarFaturaCliente}
                            disabled={gerandoFatura}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs h-9 shadow-md cursor-pointer"
                        >
                            {gerandoFatura ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <Receipt className="h-4 w-4 mr-1.5" /> Gerar Fatura do Cliente
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Filtros de Busca */}
            <Card className="rounded-3xl border-slate-200 shadow-sm print:hidden">
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Início</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Fim</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cliente / Empresa</label>
                            <Select value={empresaId} onValueChange={setEmpresaId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Clientes</SelectItem>
                                    {empresas.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Posto de Trabalho</label>
                            <Select value={postoId} onValueChange={setPostoId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Postos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Postos</SelectItem>
                                    {postos.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <div className="relative flex-1">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                                placeholder="Buscar por número da fatura, cliente ou posto..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 rounded-xl border-slate-200"
                            />
                        </div>
                        <Button onClick={fetchFaturamento} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
                            <Filter className="h-4 w-4 mr-2" /> Filtrar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ABA 1: DIÁRIAS A FATURAR */}
            {statusTab === "A_FATURAR" && (
                <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                                ⏳ Diárias Disponíveis para Faturamento
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Marque os checkboxes para selecionar as diárias e clique no botão Gerar Fatura do Cliente.
                            </p>
                        </div>

                        {filteredItems.length > 0 && (
                            <Button
                                onClick={handleGerarFaturaCliente}
                                disabled={selectedIds.length === 0 || gerandoFatura}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs h-10 px-4 shadow-md cursor-pointer"
                            >
                                {gerandoFatura ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <>
                                        <Receipt className="h-4 w-4 mr-1.5" /> Gerar Fatura do Cliente ({selectedIds.length})
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col justify-center items-center p-12 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carregando diárias...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm font-medium">
                                Nenhuma diária pendente de faturamento encontrada para estes filtros.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 px-4 w-10 text-center">
                                                <button
                                                    onClick={toggleSelectAll}
                                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                >
                                                    {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                                                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                                                    ) : (
                                                        <Square className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3.5 px-6">Data</th>
                                            <th className="py-3.5 px-6">Cliente / Empresa</th>
                                            <th className="py-3.5 px-6">Posto de Trabalho</th>
                                            <th className="py-3.5 px-6">Prestador / Diarista</th>
                                            <th className="py-3.5 px-6 text-right">Valor Diária</th>
                                            <th className="py-3.5 px-6 text-right">Taxa Serviço ({taxaServicoInput}%)</th>
                                            <th className="py-3.5 px-6 text-right">Valor Fatura</th>
                                            <th className="py-3.5 px-6 text-center">Status Fatura</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredItems.map(item => {
                                            const isSelected = selectedIds.includes(item.id)
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`transition-colors ${isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50/70"}`}
                                                >
                                                    <td className="py-4 px-4 text-center">
                                                        <button
                                                            onClick={() => toggleSelectItem(item.id)}
                                                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="h-5 w-5 text-emerald-600" />
                                                            ) : (
                                                                <Square className="h-5 w-5" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-slate-900">
                                                        {item.empresaNome}
                                                    </td>
                                                    <td className="py-4 px-6 font-semibold text-slate-700">
                                                        {item.postoNome}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {item.diaristaNome}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                        {formatCurrency(item.valorDiaria)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">
                                                        +{formatCurrency(item.valorTaxaServico)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                                                        {formatCurrency(item.valorFaturaCliente)}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                                            ⏳ A Faturar
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ABA 2: TABELA DE FATURAS EMITIDAS (FATURAS FECHADAS COM DADOS DO CLIENTE E EXTRATO) */}
            {statusTab === "FATURADAS" && (
                <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                            📄 Tabela de Faturas Emitidas (Faturas Fechadas)
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Histórico oficial de faturas geradas. Clique em Ver Extrato para abrir o documento oficial e exportar o PDF.
                        </p>
                    </div>

                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col justify-center items-center p-12 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carregando faturas emitidas...</p>
                            </div>
                        ) : filteredFaturas.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm font-medium">
                                Nenhuma fatura emitida encontrada para os filtros selecionados.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 px-6">Nº da Fatura</th>
                                            <th className="py-3.5 px-6">Cliente / Sacado</th>
                                            <th className="py-3.5 px-6">Data Emissão</th>
                                            <th className="py-3.5 px-6">Vencimento</th>
                                            <th className="py-3.5 px-6 text-center">Qtd. Plantões</th>
                                            <th className="py-3.5 px-6 text-right">Subtotal Diárias</th>
                                            <th className="py-3.5 px-6 text-right">Taxa Serviço</th>
                                            <th className="py-3.5 px-6 text-right">Total Fatura</th>
                                            <th className="py-3.5 px-6 text-center">Status</th>
                                            <th className="py-3.5 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredFaturas.map(f => {
                                            const totalDiarias = Number(f.valorDiarias || 0)
                                            const totalTaxa = Number(f.valorTaxaServico || 0)
                                            const totalFatura = Number(f.valorTotal || 0)
                                            const qtdPlantoes = f.coberturas?.length || 0

                                            return (
                                                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-4 px-6 font-black text-slate-900">
                                                        <Badge className="bg-slate-900 text-white font-mono text-xs px-2.5 py-1 rounded-lg">
                                                            {f.numeroFatura}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-slate-900">
                                                        {f.empresa?.nome || "Cliente Padrão"}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-emerald-700">
                                                        {f.vencimentoEm ? new Date(f.vencimentoEm).toLocaleDateString('pt-BR') : "-"}
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-slate-700">
                                                        {qtdPlantoes} plantão(ões)
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                        {formatCurrency(totalDiarias)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">
                                                        +{formatCurrency(totalTaxa)} ({f.taxaServicoPercentual}%)
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                                                        {formatCurrency(totalFatura)}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black">
                                                            ✅ Emitida
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAbrirFaturaEmitida(f)}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-8 px-3 shadow-xs cursor-pointer"
                                                        >
                                                            <Printer className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Ver Extrato (PDF)
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* MODAL OFICIAL DA FATURA DO CLIENTE (DOCUMENTO FATURA DE FECHAMENTO + PDF EXPORT) */}
            <Dialog open={faturaModalOpen} onOpenChange={setFaturaModalOpen}>
                <DialogContent showCloseButton={false} className="max-w-4xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    Fatura de Fechamento {faturaDetalhe?.numeroFatura}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs">
                                    Documento Oficial de Cobrança de Serviços Prestados
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={() => window.print()} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md">
                                <Printer className="h-4 w-4 mr-1.5" /> Imprimir / Exportar Novo PDF
                            </Button>
                            <Button variant="ghost" onClick={() => setFaturaModalOpen(false)} className="text-slate-400 hover:text-white rounded-xl h-9 w-9 p-0">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {faturaDetalhe && (
                        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white print:p-0">
                            {/* Top Details & Header da Empresa */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">JVS FACILITIES & SERVIÇOS</h2>
                                    <p className="text-xs text-slate-500 font-medium">Gestão e Intermediação de Plantões e Diárias</p>
                                    <p className="text-xs text-slate-400 mt-1">CNPJ: 00.000.000/0001-00 &bull; Curitiba - PR</p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left sm:text-right min-w-[200px]">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Número da Fatura</span>
                                    <span className="text-lg font-black text-slate-900 tracking-tight block font-mono">{faturaDetalhe.numeroFatura}</span>
                                    <span className="text-xs text-slate-500 font-bold block mt-1">Emissão: {faturaDetalhe.geradaEm}</span>
                                    <span className="text-xs text-emerald-600 font-bold block">Vencimento: {faturaDetalhe.vencimentoEm}</span>
                                </div>
                            </div>

                            {/* Dados do Cliente Contratante */}
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Cliente / Sacado</span>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{faturaDetalhe.empresaNome}</h3>
                                <p className="text-xs text-slate-500">
                                    Fatura referente a <strong>{faturaDetalhe.items.length} plantão(ões)</strong> de serviços prestados no período.
                                </p>
                            </div>

                            {/* Tabela Discriminada de Plantões Faturados */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 font-black uppercase text-slate-600">
                                            <th className="py-3 px-4">Data</th>
                                            <th className="py-3 px-4">Posto de Trabalho</th>
                                            <th className="py-3 px-4">Prestador / Diarista</th>
                                            <th className="py-3 px-4 text-right">Diária</th>
                                            <th className="py-3 px-4 text-right">Taxa Serviço ({faturaDetalhe.taxaServicoPercentual}%)</th>
                                            <th className="py-3 px-4 text-right">Total Item</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                                        {faturaDetalhe.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="py-3 px-4 font-bold">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                <td className="py-3 px-4">{item.postoNome}</td>
                                                <td className="py-3 px-4">{item.diaristaNome}</td>
                                                <td className="py-3 px-4 text-right">{formatCurrency(item.valorDiaria)}</td>
                                                <td className="py-3 px-4 text-right text-emerald-700">+{formatCurrency(item.valorTaxaServico)}</td>
                                                <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(item.valorFaturaCliente)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Resumo de Valores e Totais da Fatura */}
                            <div className="flex justify-end pt-2">
                                <div className="w-full sm:w-80 bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
                                    <div className="flex justify-between text-xs text-slate-300">
                                        <span>Subtotal Diárias:</span>
                                        <span className="font-bold">{formatCurrency(faturaDetalhe.totalDiarias)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-emerald-400">
                                        <span>Taxa de Serviço ({faturaDetalhe.taxaServicoPercentual}%):</span>
                                        <span className="font-bold">+{formatCurrency(faturaDetalhe.totalTaxa)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-lg font-black text-white">
                                        <span>TOTAL FATURA:</span>
                                        <span className="text-xl text-emerald-400">{formatCurrency(faturaDetalhe.totalFatura)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Instruções de Pagamento */}
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-1">
                                <span className="font-black uppercase tracking-wider block text-emerald-800">💰 Instruções para Pagamento via Pix</span>
                                <p>Chave Pix / Chave CNPJ da JVS Facilities: <strong>00.000.000/0001-00</strong></p>
                                <p className="text-[11px] text-emerald-700">Após efetuar o pagamento, favor enviar o comprovante com o número desta fatura (<strong>{faturaDetalhe.numeroFatura}</strong>).</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md">
                            <Printer className="h-4 w-4 mr-1.5" /> Exportar Novo PDF
                        </Button>
                        <Button onClick={() => setFaturaModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                            Fechar Visualização
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
