"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
    ShoppingCart,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    Receipt,
    Eye,
    Tag,
    Building2,
    Calendar,
    ChevronRight,
    Loader2,
    BarChart3,
    TrendingDown,
    TrendingUp,
    ShieldCheck,
    Landmark,
    Layers,
    DollarSign,
    Percent,
    AlertTriangle,
    Check
} from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"

interface Pedido {
    id: string
    numeroPedido: string
    status: string
    tipoCompra: string
    tenantId: string
    tenantNome: string
    centroCustoId: string
    centroCustoNome: string
    categoriaId: string
    categoriaNome: string
    mesCompetencia: number
    anoCompetencia: number
    justificativa: string
    fornecedorNome?: string
    valorTotalCotado?: number
    valorTotalEstimado?: number
    valorOrcado?: number
    saving?: number
    valorEstourado?: number
    isEstourado?: boolean
    budgetDisponivel?: number
    createdAt: string
    solicitante: {
        nome: string
        email: string
    }
    comprador?: {
        nome: string
    }
    aprovador?: {
        nome: string
    }
    itens: Array<{
        id: string
        descricao: string
        quantidade: number
        unidade: string
        precoUnitario?: number
        precoTotal?: number
    }>
}

interface RelatorioLinha {
    categoriaId: string
    categoriaNome: string
    codigo: string
    contaPai: string
    valorOrcado: number
    valorRealizadoFinanceiro: number
    valorPedidosCompras: number
    totalComprometido: number
    saldoDisponivel: number
    saving: number
    valorEstourado: number
    percentualConsumido: number
    status: "OK" | "ATENCAO" | "ESTOURADO"
    pedidosCount: number
    pedidos?: any[]
}

interface RelatorioTotais {
    valorOrcado: number
    valorRealizadoFinanceiro: number
    valorPedidosCompras: number
    totalComprometido: number
    saldoDisponivel: number
    saving: number
    valorEstourado: number
    pedidosCount: number
    percentualGeral: number
}

const MESES = [
    { value: "1", label: "Janeiro (01)" },
    { value: "2", label: "Fevereiro (02)" },
    { value: "3", label: "Março (03)" },
    { value: "4", label: "Abril (04)" },
    { value: "5", label: "Maio (05)" },
    { value: "6", label: "Junho (06)" },
    { value: "7", label: "Julho (07)" },
    { value: "8", label: "Agosto (08)" },
    { value: "9", label: "Setembro (09)" },
    { value: "10", label: "Outubro (10)" },
    { value: "11", label: "Novembro (11)" },
    { value: "12", label: "Dezembro (12)" }
]

export default function ComprasDashboardPage() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get("tab") || "todos"

    // Modo de visualização principal: "pedidos" ou "relatorio"
    const [viewMode, setViewMode] = useState<"pedidos" | "relatorio">(
        searchParams.get("view") === "relatorio" ? "relatorio" : "pedidos"
    )

    // Estados da listagem de Pedidos
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [loadingPedidos, setLoadingPedidos] = useState(true)
    const [activeTab, setActiveTab] = useState(initialTab)
    const [searchTerm, setSearchTerm] = useState("")

    // Filtros de Empresa e Centro de Custo
    const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
    const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([])
    const [selectedTenant, setSelectedTenant] = useState<string>("")
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>("")
    const [selectedMes, setSelectedMes] = useState<string>(String(new Date().getMonth() + 1))
    const [selectedAno, setSelectedAno] = useState<string>(String(new Date().getFullYear()))
    const [selectedContaPai, setSelectedContaPai] = useState<string>("all")
    const [relatorioSearch, setRelatorioSearch] = useState<string>("")

    // Estados do Relatório Orçado x Realizado
    const [relatorioLinhas, setRelatorioLinhas] = useState<RelatorioLinha[]>([])
    const [relatorioTotais, setRelatorioTotais] = useState<RelatorioTotais | null>(null)
    const [loadingRelatorio, setLoadingRelatorio] = useState(false)

    // 1. Carregar Empresas do BudgetHub
    useEffect(() => {
        async function fetchTenants() {
            try {
                const res = await fetch("/api/budgethub/tenants")
                if (res.ok) {
                    const data = await res.json()
                    setTenants(data)
                }
            } catch (e) {
                console.error("Erro ao carregar tenants:", e)
            }
        }
        fetchTenants()
    }, [])

    // 2. Carregar Centros de Custo quando o Tenant mudar
    useEffect(() => {
        async function fetchCostCenters() {
            if (!selectedTenant) {
                setCostCenters([])
                setSelectedCostCenter("")
                return
            }
            try {
                const res = await fetch(`/api/budgethub/cost-centers?tenantId=${selectedTenant}`)
                if (res.ok) {
                    const data = await res.json()
                    setCostCenters(data)
                }
            } catch (e) {
                console.error("Erro ao carregar centros de custo:", e)
            }
        }
        fetchCostCenters()
    }, [selectedTenant])

    // 3. Buscar Pedidos de Compra
    const fetchPedidos = async () => {
        try {
            setLoadingPedidos(true)
            let url = "/api/compras?"
            if (activeTab === "minhas") url += "scope=minhas&"
            if (activeTab === "cotacoes") url += "status=AGUARDANDO_COTACAO&"
            if (activeTab === "aprovacoes") url += "status=AGUARDANDO_APROVACAO&"
            if (activeTab === "aprovados") url += "status=APROVADO&"
            if (selectedTenant) url += `tenantId=${selectedTenant}&`
            if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setPedidos(data)
            }
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error)
        } finally {
            setLoadingPedidos(false)
        }
    }

    // 4. Buscar Relatório Mensal Orçado x Realizado
    const fetchRelatorio = async () => {
        try {
            setLoadingRelatorio(true)
            let url = `/api/compras/relatorio-orcamento?mes=${selectedMes}&ano=${selectedAno}`
            if (selectedTenant) url += `&tenantId=${encodeURIComponent(selectedTenant)}`
            if (selectedCostCenter) url += `&costCenterId=${encodeURIComponent(selectedCostCenter)}`
            if (selectedContaPai && selectedContaPai !== "all") url += `&contaPai=${encodeURIComponent(selectedContaPai)}`
            if (relatorioSearch) url += `&search=${encodeURIComponent(relatorioSearch)}`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setRelatorioLinhas(data.linhas || [])
                setRelatorioTotais(data.totais || null)
            }
        } catch (error) {
            console.error("Erro ao carregar relatório de orçamento:", error)
        } finally {
            setLoadingRelatorio(false)
        }
    }

    useEffect(() => {
        if (viewMode === "pedidos") {
            fetchPedidos()
        } else {
            fetchRelatorio()
        }
    }, [viewMode, activeTab, selectedTenant, selectedCostCenter, selectedMes, selectedAno, selectedContaPai, searchTerm, relatorioSearch])

    // Métricas dos Pedidos
    const totalCount = pedidos.length
    const cotacaoCount = pedidos.filter(p => p.status === "AGUARDANDO_COTACAO" || p.status === "COTADO").length
    const aprovacaoCount = pedidos.filter(p => p.status === "AGUARDANDO_APROVACAO").length
    const aprovadosCount = pedidos.filter(p => p.status === "APROVADO" || p.status === "CONCLUIDO").length

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "AGUARDANDO_COTACAO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" /> Em Cotação
                    </span>
                )
            case "COTADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Tag className="w-3.5 h-3.5" /> Cotado (Rascunho)
                    </span>
                )
            case "AGUARDANDO_APROVACAO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <Clock className="w-3.5 h-3.5" /> Aguardando Gestor
                    </span>
                )
            case "AJUSTE_SOLICITADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Ajuste Solicitado
                    </span>
                )
            case "APROVADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                    </span>
                )
            case "REPROVADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Reprovado
                    </span>
                )
            case "CONCLUIDO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {status}
                    </span>
                )
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 text-slate-900">
            {/* Header com Título e Botão de Ação */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                        Módulo de Compras & Suprimentos
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Solicitações, concorrência de fornecedores, mapa comparativo, aprovação orçamentária e acompanhamento mensal.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/compras/novo"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        Novo Pedido de Compras
                    </Link>
                </div>
            </div>

            {/* SEGMENTED NAVIGATION: PEDIDOS vs RELATÓRIO ORÇADO X REALIZADO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                    <button
                        type="button"
                        onClick={() => setViewMode("pedidos")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            viewMode === "pedidos"
                                ? "bg-white text-indigo-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Pedidos & Cotações
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode("relatorio")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            viewMode === "relatorio"
                                ? "bg-white text-indigo-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        📊 Acompanhamento Orçado x Realizado (Mensal)
                    </button>
                </div>

                {viewMode === "relatorio" && (
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                        Integrado em tempo real com o <strong>BudgetHub</strong>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: PEDIDOS & COTAÇÕES (COM ORÇADO, SAVING E ESTOURO EM CADA PEDIDO) */}
            {/* ========================================================================= */}
            {viewMode === "pedidos" && (
                <div className="space-y-6">
                    {/* Cards de Métricas Rápidas */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Pedidos</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
                        </div>
                        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 shadow-sm">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Em Cotação</p>
                            <p className="text-2xl font-black text-blue-900 mt-1">{cotacaoCount}</p>
                        </div>
                        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-5 shadow-sm">
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Aguardando Aprovação</p>
                            <p className="text-2xl font-black text-purple-900 mt-1">{aprovacaoCount}</p>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aprovados / Ordens</p>
                            <p className="text-2xl font-black text-emerald-900 mt-1">{aprovadosCount}</p>
                        </div>
                    </div>

                    {/* Barra de Filtros e Abas */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            {[
                                { id: "todos", label: "Todos os Pedidos" },
                                { id: "minhas", label: "Minhas Solicitações" },
                                { id: "cotacoes", label: "Fila de Cotações" },
                                { id: "aprovacoes", label: "Aprovações Pendentes" },
                                { id: "aprovados", label: "Ordens de Compra" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === tab.id
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Input de Busca */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar por número do pedido, fornecedor, centro de custo, conta..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Listagem de Pedidos com Orçado x Saving x Estouro */}
                    {loadingPedidos ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-sm font-semibold">Carregando pedidos de compras...</p>
                        </div>
                    ) : pedidos.length === 0 ? (
                        <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                            <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-900">Nenhum pedido encontrado</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Não existem pedidos cadastrados para os filtros selecionados. Clique no botão acima para abrir uma nova solicitação.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                            {pedidos.map((pedido) => {
                                const totalItens = pedido.itens.length
                                const valorCotado = Number(pedido.valorTotalCotado) || Number(pedido.valorTotalEstimado) || 0
                                const valorOrcado = Number(pedido.valorOrcado) || 0
                                const saving = Number(pedido.saving) || 0
                                const valorEstourado = Number(pedido.valorEstourado) || 0
                                const isEstourado = Boolean(pedido.isEstourado)

                                const valorExibido = valorCotado > 0
                                    ? valorCotado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                    : "Aguardando Cotação"

                                return (
                                    <Link
                                        key={pedido.id}
                                        href={`/dashboard/compras/${pedido.id}`}
                                        className="group bg-white hover:border-indigo-400/80 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 cursor-pointer"
                                    >
                                        {/* COLUNA ESQUERDA: DADOS DO PEDIDO & CONTA */}
                                        <div className="space-y-2.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                                                    {pedido.numeroPedido}
                                                </span>
                                                {getStatusBadge(pedido.status)}
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase border border-slate-200">
                                                    {pedido.tipoCompra}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="font-bold text-slate-900 truncate">{pedido.tenantNome}</span>
                                                </div>
                                                <div className="truncate">
                                                    <span className="text-slate-500 font-medium">CC: </span>
                                                    <span className="font-bold text-slate-800 truncate" title={pedido.centroCustoNome}>
                                                        {pedido.centroCustoNome}
                                                    </span>
                                                </div>
                                                <div className="truncate">
                                                    <span className="text-slate-500 font-medium">Conta: </span>
                                                    <span className="font-bold text-slate-800 truncate" title={pedido.categoriaNome}>
                                                        {pedido.categoriaNome}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-600 line-clamp-1">
                                                <span className="text-slate-400 font-semibold">Destinação:</span> {pedido.justificativa}
                                            </p>
                                        </div>

                                        {/* COLUNA DIREITA: BLOCO FINANCEIRO ORÇADO x COMPRA x SAVING / ESTOURO */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                                            {/* Painel Orçamentário da Conta / CC */}
                                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1 min-w-[200px]">
                                                <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                                    <span>Orçado no Mês:</span>
                                                    <span className="font-bold text-slate-900">
                                                        {valorOrcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                                    <span>Valor do Pedido:</span>
                                                    <span className="font-black text-slate-950">
                                                        {valorCotado > 0
                                                            ? valorCotado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                                            : "Em Cotação"}
                                                    </span>
                                                </div>

                                                {/* INDICADOR DE SAVING OU ESTOURO */}
                                                <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                                                    {isEstourado ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Estourado em {valorEstourado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                        </span>
                                                    ) : valorCotado > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                                            <Check className="w-3 h-3" />
                                                            Saving: +{saving.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                            Saldo: {valorOrcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Valor e Ação */}
                                            <div className="text-left sm:text-right min-w-[140px]">
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    {totalItens} {totalItens === 1 ? "item solicitado" : "itens solicitados"}
                                                </p>
                                                <p className="text-base font-black text-slate-900 mt-0.5">
                                                    {valorExibido}
                                                </p>
                                                {pedido.fornecedorNome && (
                                                    <p className="text-[11px] text-indigo-600 font-bold truncate max-w-[160px]">
                                                        {pedido.fornecedorNome}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-400 transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: TABELA MENSAL ORÇADO x REALIZADO (CRUZANDO POR CONTA COM FILTROS) */}
            {/* ========================================================================= */}
            {viewMode === "relatorio" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* BARRA DE FILTROS SUPERIORES: EMPRESA, CENTRO DE CUSTO, MÊS, ANO */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <Filter className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                Filtros de Acompanhamento Mensal
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Filtro Empresa */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Empresa (Tenant)
                                </label>
                                <SearchableSelect
                                    placeholder="Todas as Empresas"
                                    options={[
                                        { value: "", label: "Todas as Empresas" },
                                        ...tenants.map((t) => ({ value: t.id, label: t.name }))
                                    ]}
                                    value={selectedTenant}
                                    onChange={(v) => {
                                        setSelectedTenant(v)
                                        setSelectedCostCenter("")
                                    }}
                                />
                            </div>

                            {/* Filtro Centro de Custo */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Centro de Custo (Área / Posto)
                                </label>
                                <SearchableSelect
                                    placeholder={selectedTenant ? "Todos os Centros de Custo" : "Selecione uma empresa primeiro"}
                                    disabled={!selectedTenant}
                                    options={[
                                        { value: "", label: "Todos os Centros de Custo" },
                                        ...costCenters.map((cc) => ({ value: cc.id, label: cc.name }))
                                    ]}
                                    value={selectedCostCenter}
                                    onChange={(v) => setSelectedCostCenter(v)}
                                />
                            </div>

                            {/* Filtro Mês */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Mês de Competência
                                </label>
                                <SearchableSelect
                                    placeholder="Selecione o Mês"
                                    options={MESES}
                                    value={selectedMes}
                                    onChange={(v) => setSelectedMes(v)}
                                />
                            </div>

                            {/* Filtro Ano */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Ano
                                </label>
                                <SearchableSelect
                                    placeholder="Ano"
                                    options={[
                                        { value: "2026", label: "2026" },
                                        { value: "2025", label: "2025" },
                                        { value: "2024", label: "2024" }
                                    ]}
                                    value={selectedAno}
                                    onChange={(v) => setSelectedAno(v)}
                                />
                            </div>
                        </div>

                        {/* Filtro de Busca de Conta e Grupo */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <div className="relative flex-1 w-full">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filtrar por nome ou código da conta orçamentária (ex: 03.6, Limpeza, EPI)..."
                                    value={relatorioSearch}
                                    onChange={(e) => setRelatorioSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                                />
                            </div>

                            <div className="w-full sm:w-64">
                                <SearchableSelect
                                    placeholder="Grupo / Conta Pai"
                                    options={[
                                        { value: "all", label: "Todas as Contas" },
                                        { value: "03.6", label: "03.6 - Materiais" },
                                        { value: "03.5", label: "03.5 - EPIs e Uniformes" },
                                        { value: "03.7", label: "03.7 - Manutenção e Equipamentos" },
                                        { value: "03.8", label: "03.8 - Sistemas e Escritório" },
                                        { value: "05.10", label: "05.10 - Copa e Cozinha" },
                                        { value: "05.12", label: "05.12 - Informática e TI" }
                                    ]}
                                    value={selectedContaPai}
                                    onChange={(v) => setSelectedContaPai(v)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARDS DE RESUMO DO ORÇAMENTO DO PERÍODO */}
                    {relatorioTotais && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    💰 Orçado Total no Mês
                                </p>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {relatorioTotais.valorOrcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>

                            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 shadow-sm">
                                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                                    🛒 Pedidos de Compras (Suprimentos)
                                </p>
                                <p className="text-2xl font-black text-blue-900 mt-1">
                                    {relatorioTotais.valorPedidosCompras.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                                <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                                    {relatorioTotais.pedidosCount} {relatorioTotais.pedidosCount === 1 ? "pedido emitido" : "pedidos emitidos"}
                                </p>
                            </div>

                            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-5 shadow-sm">
                                <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                                    💳 Já Realizado no Financeiro
                                </p>
                                <p className="text-2xl font-black text-purple-900 mt-1">
                                    {relatorioTotais.valorRealizadoFinanceiro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>

                            <div
                                className={`rounded-2xl p-5 shadow-sm border ${
                                    relatorioTotais.saldoDisponivel >= 0
                                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                                        : "bg-rose-50/80 border-rose-200 text-rose-950"
                                }`}
                            >
                                <p className="text-[11px] font-bold uppercase tracking-wider">
                                    {relatorioTotais.saldoDisponivel >= 0 ? "📈 Saldo Restante (Saving)" : "⚠️ Déficit Orçamentário"}
                                </p>
                                <p
                                    className={`text-2xl font-black mt-1 ${
                                        relatorioTotais.saldoDisponivel >= 0 ? "text-emerald-700" : "text-rose-700"
                                    }`}
                                >
                                    {relatorioTotais.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                                <p className="text-[11px] font-bold mt-0.5">
                                    {relatorioTotais.percentualGeral.toFixed(1)}% do orçamento consumido
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TABELA MENSAL CRUZANDO ORÇADO x REALIZADO POR CONTA */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-3">
                        <div className="p-5 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-600" />
                                    Quadro de Despesas: Orçado vs. Realizado por Conta
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cruzamento dos valores orçados no BudgetHub com os pedidos emitidos no ReembolsaFácil e despesas liquidadas.
                                </p>
                            </div>

                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                                {relatorioLinhas.length} {relatorioLinhas.length === 1 ? "conta encontrada" : "contas encontradas"}
                            </span>
                        </div>

                        {loadingRelatorio ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                <p className="text-xs font-bold">Consultando dados no BudgetHub...</p>
                            </div>
                        ) : relatorioLinhas.length === 0 ? (
                            <div className="py-20 text-center p-6 text-slate-500">
                                <p className="text-sm font-bold text-slate-800">Nenhuma conta orçamentária encontrada</p>
                                <p className="text-xs mt-1">Ajuste os filtros de Empresa, Centro de Custo ou Competência acima.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase border-y border-slate-200">
                                        <tr>
                                            <th className="py-3 px-4 w-72">Conta Orçamentária</th>
                                            <th className="py-3 px-3 text-right">Orçado (R$)</th>
                                            <th className="py-3 px-3 text-right text-blue-800 bg-blue-50/50">
                                                Pedidos Compras (R$)
                                            </th>
                                            <th className="py-3 px-3 text-right">Realizado Fin. (R$)</th>
                                            <th className="py-3 px-3 text-right font-black">Total Gasto (R$)</th>
                                            <th className="py-3 px-4 text-right font-black">Saldo / Saving (R$)</th>
                                            <th className="py-3 px-4 text-center w-36">% Consumido</th>
                                            <th className="py-3 px-4 text-center w-28">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                                        {relatorioLinhas.map((linha) => {
                                            const isEstourado = linha.status === "ESTOURADO"
                                            const isAtencao = linha.status === "ATENCAO"

                                            return (
                                                <tr
                                                    key={linha.categoriaId}
                                                    className={`hover:bg-slate-50/80 transition-colors ${
                                                        isEstourado ? "bg-rose-50/30" : ""
                                                    }`}
                                                >
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-slate-900">{linha.categoriaNome}</p>
                                                        <span className="text-[10px] text-slate-500 font-semibold">
                                                            {linha.contaPai}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                                                        {linha.valorOrcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </td>

                                                    <td className="py-3 px-3 text-right font-bold text-blue-700 bg-blue-50/30">
                                                        {linha.valorPedidosCompras > 0 ? (
                                                            <div>
                                                                <span>
                                                                    {linha.valorPedidosCompras.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                                </span>
                                                                <span className="block text-[10px] text-blue-600 font-normal">
                                                                    {linha.pedidosCount} {linha.pedidosCount === 1 ? "pedido" : "pedidos"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">R$ 0,00</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                                                        {linha.valorRealizadoFinanceiro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </td>

                                                    <td className="py-3 px-3 text-right font-black text-slate-950">
                                                        {linha.totalComprometido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </td>

                                                    <td className="py-3 px-4 text-right font-black">
                                                        {linha.saldoDisponivel >= 0 ? (
                                                            <span className="text-emerald-700">
                                                                +{linha.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-700">
                                                                -{Math.abs(linha.saldoDisponivel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* BARRA DE PROGRESSO DE CONSUMO */}
                                                    <td className="py-3 px-4">
                                                        <div className="w-full space-y-1">
                                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${
                                                                        isEstourado
                                                                            ? "bg-rose-600"
                                                                            : isAtencao
                                                                            ? "bg-amber-500"
                                                                            : "bg-emerald-500"
                                                                    }`}
                                                                    style={{ width: `${Math.min(linha.percentualConsumido, 100)}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-right font-bold text-slate-600">
                                                                {linha.percentualConsumido.toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    </td>

                                                    {/* STATUS BADGE */}
                                                    <td className="py-3 px-4 text-center">
                                                        {isEstourado ? (
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                                                Estourado
                                                            </span>
                                                        ) : isAtencao ? (
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                                                Atenção
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                Dentro
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>

                                    {/* LINHA DE TOTAIS */}
                                    {relatorioTotais && (
                                        <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs">
                                            <tr>
                                                <td className="py-4 px-4 uppercase text-slate-800">
                                                    Total Geral do Período:
                                                </td>
                                                <td className="py-4 px-3 text-right text-slate-900">
                                                    {relatorioTotais.valorOrcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td className="py-4 px-3 text-right text-blue-900 bg-blue-100/50">
                                                    {relatorioTotais.valorPedidosCompras.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td className="py-4 px-3 text-right text-slate-700">
                                                    {relatorioTotais.valorRealizadoFinanceiro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td className="py-4 px-3 text-right text-slate-950 text-sm">
                                                    {relatorioTotais.totalComprometido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td
                                                    className={`py-4 px-4 text-right text-sm ${
                                                        relatorioTotais.saldoDisponivel >= 0 ? "text-emerald-700" : "text-rose-700"
                                                    }`}
                                                >
                                                    {relatorioTotais.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="text-xs font-black text-slate-900">
                                                        {relatorioTotais.percentualGeral.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {relatorioTotais.saldoDisponivel >= 0 ? (
                                                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                                                            Líquido Positivo
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-rose-800 bg-rose-200 px-2 py-0.5 rounded">
                                                            Déficit
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
