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
    Loader2
} from "lucide-react"

interface Pedido {
    id: string
    numeroPedido: string
    status: string
    tipoCompra: string
    tenantNome: string
    centroCustoNome: string
    categoriaNome: string
    mesCompetencia: number
    anoCompetencia: number
    justificativa: string
    fornecedorNome?: string
    valorTotalCotado?: number
    valorTotalEstimado?: number
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

export default function ComprasDashboardPage() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get("tab") || "todos"

    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState(initialTab)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTenant, setSelectedTenant] = useState("")

    useEffect(() => {
        if (searchParams.get("tab")) {
            setActiveTab(searchParams.get("tab")!)
        }
    }, [searchParams])

    const fetchPedidos = async () => {
        try {
            setLoading(true)
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
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPedidos()
    }, [activeTab, selectedTenant, searchTerm])

    // Métricas
    const totalCount = pedidos.length
    const cotacaoCount = pedidos.filter(p => p.status === "AGUARDANDO_COTACAO" || p.status === "COTADO").length
    const aprovacaoCount = pedidos.filter(p => p.status === "AGUARDANDO_APROVACAO").length
    const aprovadosCount = pedidos.filter(p => p.status === "APROVADO" || p.status === "CONCLUIDO").length

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "AGUARDANDO_COTACAO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <Clock className="w-3 h-3" /> Em Cotação
                    </span>
                )
            case "COTADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Tag className="w-3 h-3" /> Cotado (Rascunho)
                    </span>
                )
            case "AGUARDANDO_APROVACAO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Clock className="w-3 h-3" /> Aguardando Gestor
                    </span>
                )
            case "AJUSTE_SOLICITADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        <AlertCircle className="w-3 h-3" /> Ajuste Solicitado
                    </span>
                )
            case "APROVADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Aprovado
                    </span>
                )
            case "REPROVADO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-500/15 text-red-400 border border-red-500/30">
                        <XCircle className="w-3 h-3" /> Reprovado
                    </span>
                )
            case "CONCLUIDO":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-500/15 text-teal-400 border border-teal-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-slate-500/15 text-slate-400 border border-slate-500/30">
                        {status}
                    </span>
                )
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header com Título e Botão de Ação */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <ShoppingCart className="w-8 h-8 text-amber-400" />
                        Módulo de Compras & Suprimentos
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Solicitações, cotação com inteligência artificial, aprovação orçamentária e ordens de compra.
                    </p>
                </div>

                <Link
                    href="/dashboard/compras/novo"
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-xl text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Novo Pedido de Compras
                </Link>
            </div>

            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total de Pedidos</p>
                    <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-xs font-bold text-blue-400 uppercase">Em Cotação</p>
                    <p className="text-2xl font-black text-blue-400 mt-1">{cotacaoCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-xs font-bold text-purple-400 uppercase">Aguardando Aprovação</p>
                    <p className="text-2xl font-black text-purple-400 mt-1">{aprovacaoCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-xs font-bold text-emerald-400 uppercase">Aprovados / Ordens</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{aprovadosCount}</p>
                </div>
            </div>

            {/* Barra de Filtros e Abas */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
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
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
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
                            placeholder="Buscar por número do pedido, fornecedor, centro de custo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                        />
                    </div>
                </div>
            </div>

            {/* Listagem de Pedidos */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <p className="text-sm font-medium">Carregando pedidos de compras...</p>
                </div>
            ) : pedidos.length === 0 ? (
                <div className="py-20 text-center bg-slate-900/40 border border-white/5 rounded-2xl p-8">
                    <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white">Nenhum pedido encontrado</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Não existem pedidos cadastrados para os filtros selecionados. Clique no botão acima para abrir uma nova solicitação.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pedidos.map((pedido) => {
                        const totalItens = pedido.itens.length
                        const valorExibido = pedido.valorTotalCotado
                            ? Number(pedido.valorTotalCotado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "Aguardando Cotação"

                        return (
                            <Link
                                key={pedido.id}
                                href={`/dashboard/compras/${pedido.id}`}
                                className="group bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 backdrop-blur-xl shadow-lg transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="font-mono text-sm font-black text-amber-400">
                                            {pedido.numeroPedido}
                                        </span>
                                        {getStatusBadge(pedido.status)}
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                                            {pedido.tipoCompra}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-semibold text-white truncate">{pedido.tenantNome}</span>
                                        </div>
                                        <div className="truncate">
                                            <span className="text-slate-400">Centro de Custo: </span>
                                            <span className="font-medium text-slate-200">{pedido.centroCustoNome}</span>
                                        </div>
                                        <div className="truncate">
                                            <span className="text-slate-400">Conta: </span>
                                            <span className="font-medium text-slate-200">{pedido.categoriaNome}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-400 line-clamp-1">
                                        <span className="text-slate-500 font-bold">Destinação:</span> {pedido.justificativa}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {totalItens} {totalItens === 1 ? "item solicitado" : "itens solicitados"}
                                        </p>
                                        <p className="text-base font-black text-white mt-0.5">
                                            {valorExibido}
                                        </p>
                                        {pedido.fornecedorNome && (
                                            <p className="text-[11px] text-amber-400/90 font-medium truncate max-w-[180px]">
                                                Fornecedor: {pedido.fornecedorNome}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="p-2 rounded-xl bg-white/5 group-hover:bg-amber-500/20 group-hover:text-amber-400 text-slate-400 transition-colors">
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
    )
}
