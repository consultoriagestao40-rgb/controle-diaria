"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
    ShoppingCart,
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Building2,
    Landmark,
    FolderTree,
    Calendar,
    Sparkles,
    FileText,
    Printer,
    Check,
    X,
    Loader2,
    ExternalLink,
    Tag,
    DollarSign,
    ShieldCheck,
    User as UserIcon,
    Plus,
    Trash2,
    Search,
    Award,
    TrendingDown,
    Split,
    Layers,
    ChevronDown,
    ChevronUp
} from "lucide-react"

interface Item {
    id: string
    descricao: string
    especificacao?: string
    quantidade: number
    unidade: string
    precoUnitario?: number
    precoTotal?: number
    fornecedor?: string
    fornecedorCnpj?: string
}

interface Historico {
    id: string
    deStatus?: string
    paraStatus: string
    data: string
    observacao?: string
    usuario: {
        nome: string
        email: string
    }
}

interface FornecedorCotacao {
    id: string
    nome: string
    cnpj: string
    email: string
    telefone: string
    contato: string
    condicoesPagamento: string
    dataVencimentoSugerida: string
    emailEnvioNf: string
    enderecoEntrega: string
    observacoesFiscais: string
    anexoUrl: string
    anexoNome: string
    precos: Record<string, number> // itemId -> precoUnitario
}

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
    budgetDisponivel?: number
    justificativa: string
    fornecedorNome?: string
    fornecedorCnpj?: string
    fornecedorEmail?: string
    fornecedorTelefone?: string
    fornecedorContato?: string
    condicoesPagamento?: string
    dataVencimentoSugerida?: string
    emailEnvioNf?: string
    enderecoEntrega?: string
    observacoesFiscais?: string
    valorTotalCotado?: number
    anexoCotacaoUrl?: string
    anexoCotacaoNome?: string
    cotacoesFornecedores?: string
    createdAt: string
    solicitante: {
        id: string
        nome: string
        email: string
        cargo?: string
    }
    comprador?: {
        id: string
        nome: string
        email: string
    }
    aprovador?: {
        id: string
        nome: string
        email: string
    }
    dataAprovacao?: string
    justificativaAprovacao?: string
    justificativaReprovacao?: string
    ajusteSolicitado?: string
    itens: Item[]
    historico: Historico[]
}

export default function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [pedido, setPedido] = useState<Pedido | null>(null)
    const [loading, setLoading] = useState(true)

    // Budget Availability real time
    const [budgetData, setBudgetData] = useState<{
        orcado: number
        realizado: number
        comprometidoPedidos: number
        saldoDisponivel: number
    } | null>(null)

    // Múltiplos Fornecedores na Cotação
    const [fornecedores, setFornecedores] = useState<FornecedorCotacao[]>([])
    const [activeFornecedorId, setActiveFornecedorId] = useState<string>("")

    // Vencedor de cada item (itemId -> fornecedorId)
    const [itemWinners, setItemWinners] = useState<Record<string, string>>({})

    // Catálogo de Fornecedores (Autocomplete & Memória)
    const [catalogoResults, setCatalogoResults] = useState<any[]>([])
    const [searchingCatalogo, setSearchingCatalogo] = useState(false)
    const [showCatalogoDropdown, setShowCatalogoDropdown] = useState(false)

    // Upload IA state
    const [uploadingAI, setUploadingAI] = useState(false)
    const [submittingCotacao, setSubmittingCotacao] = useState(false)

    // Approval / Rejection modals
    const [modalAprovarOpen, setModalAprovarOpen] = useState(false)
    const [modalReprovarOpen, setModalReprovarOpen] = useState(false)
    const [modalAjusteOpen, setModalAjusteOpen] = useState(false)
    const [justificativaAcao, setJustificativaAcao] = useState("")
    const [processandoAcao, setProcessandoAcao] = useState(false)

    const loadPedido = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/compras/${id}`)
            if (res.ok) {
                const data: Pedido = await res.json()
                setPedido(data)

                // 1. Inicializar lista de múltiplos fornecedores
                let loadedFornecedores: FornecedorCotacao[] = []
                if (data.cotacoesFornecedores) {
                    try {
                        const parsed = JSON.parse(data.cotacoesFornecedores)
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            loadedFornecedores = parsed
                        }
                    } catch (e) {
                        console.warn("Aviso ao carregar cotacoesFornecedores salvas:", e)
                    }
                }

                // Se não havia cotação múltipla gravada, cria a inicial a partir dos dados do pedido
                if (loadedFornecedores.length === 0) {
                    const initialPrices: Record<string, number> = {}
                    data.itens.forEach((it) => {
                        if (it.precoUnitario) {
                            initialPrices[it.id] = Number(it.precoUnitario)
                        }
                    })

                    loadedFornecedores = [
                        {
                            id: "forn-1",
                            nome: data.fornecedorNome || "",
                            cnpj: data.fornecedorCnpj || "",
                            email: data.fornecedorEmail || "",
                            telefone: data.fornecedorTelefone || "",
                            contato: data.fornecedorContato || "",
                            condicoesPagamento: data.condicoesPagamento || "Boleto 28 DDL",
                            dataVencimentoSugerida: data.dataVencimentoSugerida
                                ? data.dataVencimentoSugerida.split("T")[0]
                                : "",
                            emailEnvioNf: data.emailEnvioNf || "financeiro@grupofacilities.com.br",
                            enderecoEntrega: data.enderecoEntrega || data.centroCustoNome,
                            observacoesFiscais: data.observacoesFiscais || "",
                            anexoUrl: data.anexoCotacaoUrl || "",
                            anexoNome: data.anexoCotacaoNome || "",
                            precos: initialPrices
                        }
                    ]
                }

                setFornecedores(loadedFornecedores)
                setActiveFornecedorId(loadedFornecedores[0].id)

                // 2. Inicializar vencedores por item
                const initialWinners: Record<string, string> = {}
                data.itens.forEach((it) => {
                    const match = loadedFornecedores.find(
                        (f) => f.nome === it.fornecedor || f.id === it.fornecedor
                    )
                    if (match) {
                        initialWinners[it.id] = match.id
                    } else if (loadedFornecedores.length > 0) {
                        initialWinners[it.id] = loadedFornecedores[0].id
                    }
                })
                setItemWinners(initialWinners)

                // Consultar budget disponível atualizado no BudgetHub
                fetchBudget(data)
            } else {
                toast.error("Pedido não encontrado.")
                router.push("/dashboard/compras")
            }
        } catch (err) {
            console.error("Erro ao carregar pedido:", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchBudget = async (p: Pedido) => {
        try {
            const url = `/api/budgethub/availability?tenantId=${p.tenantId}&costCenterId=${encodeURIComponent(
                p.centroCustoId
            )}&categoryId=${encodeURIComponent(p.categoriaId)}&mes=${p.mesCompetencia}&ano=${p.anoCompetencia}`
            const res = await fetch(url)
            if (res.ok) {
                const bData = await res.json()
                setBudgetData(bData)
            }
        } catch (e) {
            console.warn("Aviso ao buscar budget:", e)
        }
    }

    useEffect(() => {
        loadPedido()
    }, [id])

    // Fornecedor Ativo no momento
    const activeFornecedor =
        fornecedores.find((f) => f.id === activeFornecedorId) || fornecedores[0]

    // Atualizar dados do fornecedor ativo
    const updateActiveFornecedor = (updates: Partial<FornecedorCotacao>) => {
        if (!activeFornecedor) return
        setFornecedores(
            fornecedores.map((f) =>
                f.id === activeFornecedor.id ? { ...f, ...updates } : f
            )
        )
    }

    // Adicionar novo fornecedor concorrente
    const handleAddFornecedor = () => {
        const nextNum = fornecedores.length + 1
        const newF: FornecedorCotacao = {
            id: `forn-${Date.now()}`,
            nome: `Fornecedor ${nextNum}`,
            cnpj: "",
            email: "",
            telefone: "",
            contato: "",
            condicoesPagamento: "Boleto 28 DDL",
            dataVencimentoSugerida: "",
            emailEnvioNf: "financeiro@grupofacilities.com.br",
            enderecoEntrega: pedido?.centroCustoNome || "",
            observacoesFiscais: "",
            anexoUrl: "",
            anexoNome: "",
            precos: {}
        }
        setFornecedores([...fornecedores, newF])
        setActiveFornecedorId(newF.id)
        toast.success(`Fornecedor ${nextNum} adicionado à cotação!`)
    }

    // Remover fornecedor concorrente
    const handleRemoveFornecedor = (fId: string) => {
        if (fornecedores.length <= 1) {
            toast.error("A cotação precisa ter ao menos um fornecedor.")
            return
        }
        const remaining = fornecedores.filter((f) => f.id !== fId)
        setFornecedores(remaining)
        if (activeFornecedorId === fId) {
            setActiveFornecedorId(remaining[0].id)
        }
        // Reatribuir itens que estavam com o fornecedor excluído para o primeiro restante
        const newWinners = { ...itemWinners }
        Object.keys(newWinners).forEach((itemId) => {
            if (newWinners[itemId] === fId) {
                newWinners[itemId] = remaining[0].id
            }
        })
        setItemWinners(newWinners)
        toast.info("Fornecedor removido da concorrência.")
    }

    // Atualizar preço unitário de um item para um fornecedor
    const handleUpdateItemPrice = (fornecedorId: string, itemId: string, price: number) => {
        setFornecedores(
            fornecedores.map((f) => {
                if (f.id === fornecedorId) {
                    return {
                        ...f,
                        precos: {
                            ...f.precos,
                            [itemId]: price
                        }
                    }
                }
                return f
            })
        )
    }

    // Buscar no Catálogo de Fornecedores gravados
    const searchCatalogo = async (query: string) => {
        if (!query || query.length < 2) {
            setCatalogoResults([])
            return
        }
        try {
            setSearchingCatalogo(true)
            const res = await fetch(`/api/fornecedores?q=${encodeURIComponent(query)}`)
            if (res.ok) {
                const data = await res.json()
                setCatalogoResults(data)
                setShowCatalogoDropdown(true)
            }
        } catch (err) {
            console.error("Erro ao buscar catálogo:", err)
        } finally {
            setSearchingCatalogo(false)
        }
    }

    // Selecionar do Catálogo de Fornecedores
    const handleSelectCatalogoFornecedor = (cat: any) => {
        updateActiveFornecedor({
            nome: cat.nome,
            cnpj: cat.cnpj || "",
            email: cat.email || "",
            telefone: cat.telefone || "",
            contato: cat.contato || "",
            condicoesPagamento: cat.condicoesPagamento || "Boleto 28 DDL"
        })
        setShowCatalogoDropdown(false)
        toast.success(`Dados de "${cat.nome}" carregados do catálogo com sucesso!`)
    }

    // Upload de arquivo e extração com IA Gemini para o fornecedor ativo
    const handleFileUploadAndExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeFornecedor) return

        try {
            setUploadingAI(true)
            toast.info(`Lendo orçamento com IA para ${activeFornecedor.nome || "Fornecedor"}...`)

            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch(`/api/compras/${id}/extrair-cotacao`, {
                method: "POST",
                body: formData
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Falha na leitura do arquivo.")
            }

            const data = await res.json()
            const extracted = data.extractedData

            const updates: Partial<FornecedorCotacao> = {
                anexoUrl: data.fileUrl,
                anexoNome: data.fileName
            }

            if (extracted) {
                if (extracted.fornecedor?.nome) updates.nome = extracted.fornecedor.nome
                if (extracted.fornecedor?.cnpj) updates.cnpj = extracted.fornecedor.cnpj
                if (extracted.fornecedor?.email) updates.email = extracted.fornecedor.email
                if (extracted.fornecedor?.telefone) updates.telefone = extracted.fornecedor.telefone
                if (extracted.condicoesPagamento) updates.condicoesPagamento = extracted.condicoesPagamento
                if (extracted.dataVencimento) updates.dataVencimentoSugerida = extracted.dataVencimento
                if (extracted.emailEnvioNf) updates.emailEnvioNf = extracted.emailEnvioNf

                if (Array.isArray(extracted.itens) && extracted.itens.length > 0 && pedido) {
                    const newPrices = { ...activeFornecedor.precos }
                    pedido.itens.forEach((pedidoItem, idx) => {
                        const matched =
                            extracted.itens.find((ext: any) =>
                                ext.descricao.toLowerCase().includes(pedidoItem.descricao.toLowerCase().slice(0, 5))
                            ) || extracted.itens[idx]

                        if (matched && matched.precoUnitario) {
                            newPrices[pedidoItem.id] = Number(matched.precoUnitario)
                        }
                    })
                    updates.precos = newPrices
                }

                toast.success(`Cotação de ${updates.nome || "Fornecedor"} processada com sucesso via IA!`)
            }

            updateActiveFornecedor(updates)
        } catch (err: any) {
            console.error("Erro no processamento com IA:", err)
            toast.error(err.message || "Falha ao extrair dados do orçamento.")
        } finally {
            setUploadingAI(false)
            e.target.value = ""
        }
    }

    // AÇÃO INTELIGENTE 1: Aplicar Melhor Preço Global
    const handleMelhorPrecoGlobal = () => {
        if (!pedido || fornecedores.length === 0) return

        const supplierTotals = fornecedores.map((f) => {
            let total = 0
            pedido.itens.forEach((it) => {
                const p = f.precos[it.id] || 0
                total += p * it.quantidade
            })
            return { id: f.id, nome: f.nome, total }
        })

        const validTotals = supplierTotals.filter((s) => s.total > 0)
        if (validTotals.length === 0) {
            toast.error("Lance os preços dos fornecedores antes de aplicar o melhor preço global.")
            return
        }

        validTotals.sort((a, b) => a.total - b.total)
        const best = validTotals[0]

        const newWinners: Record<string, string> = {}
        pedido.itens.forEach((it) => {
            newWinners[it.id] = best.id
        })
        setItemWinners(newWinners)

        toast.success(
            `🏆 Melhor Preço Global Selecionado: ${best.nome} (${best.total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            })})`
        )
    }

    // AÇÃO INTELIGENTE 2: Aplicar Menor Preço por Item (Cesta Mista / Split)
    const handleMenorPrecoPorItem = () => {
        if (!pedido || fornecedores.length === 0) return

        const newWinners: Record<string, string> = {}
        let itemsCount = 0

        pedido.itens.forEach((it) => {
            let minPrice = Infinity
            let bestSupplierId = ""

            fornecedores.forEach((f) => {
                const p = f.precos[it.id] || 0
                if (p > 0 && p < minPrice) {
                    minPrice = p
                    bestSupplierId = f.id
                }
            })

            if (bestSupplierId) {
                newWinners[it.id] = bestSupplierId
                itemsCount++
            } else {
                newWinners[it.id] = fornecedores[0].id
            }
        })

        setItemWinners(newWinners)
        toast.success(`⚡ Cesta mista otimizada! Os ${itemsCount} itens foram atribuídos ao menor preço disponível.`)
    }

    // Calcular Total Final Cotado (soma dos itens segundo o fornecedor vencedor de cada um)
    const totalFinalCotado = pedido?.itens.reduce((acc, it) => {
        const winnerId = itemWinners[it.id] || fornecedores[0]?.id
        const winnerF = fornecedores.find((f) => f.id === winnerId) || fornecedores[0]
        const unitPrice = winnerF?.precos[it.id] || 0
        return acc + unitPrice * it.quantidade
    }, 0) || 0

    // Resumo do Split por Fornecedor
    const splitSummary = fornecedores
        .map((f) => {
            const wonItems = pedido?.itens.filter(
                (it) => (itemWinners[it.id] || fornecedores[0]?.id) === f.id
            ) || []
            const subtotal = wonItems.reduce(
                (acc, it) => acc + (f.precos[it.id] || 0) * it.quantidade,
                0
            )
            return {
                fornecedor: f,
                itemsCount: wonItems.length,
                subtotal
            }
        })
        .filter((s) => s.itemsCount > 0)

    // Salvar Cotação
    const handleSalvarCotacao = async (enviarParaAprovacao: boolean) => {
        if (fornecedores.length === 0 || !fornecedores[0].nome.trim()) {
            toast.error("Informe pelo menos um fornecedor para a cotação.")
            return
        }

        if (totalFinalCotado <= 0) {
            toast.error("Lance o preço dos itens cotados antes de salvar.")
            return
        }

        try {
            setSubmittingCotacao(true)

            const itensPayload = pedido?.itens.map((it) => {
                const winnerId = itemWinners[it.id] || fornecedores[0]?.id
                const winnerF = fornecedores.find((f) => f.id === winnerId) || fornecedores[0]
                const unitPrice = winnerF?.precos[it.id] || 0
                return {
                    id: it.id,
                    precoUnitario: unitPrice,
                    quantidade: it.quantidade,
                    fornecedor: winnerF?.nome || "N/A",
                    fornecedorCnpj: winnerF?.cnpj || null
                }
            })

            // Fornecedor principal ou primeiro vencedor
            const primaryWinnerId = itemWinners[pedido?.itens[0]?.id || ""] || fornecedores[0].id
            const primaryWinner =
                fornecedores.find((f) => f.id === primaryWinnerId) || fornecedores[0]

            const payload = {
                fornecedores,
                fornecedorNome: primaryWinner.nome,
                fornecedorCnpj: primaryWinner.cnpj,
                fornecedorEmail: primaryWinner.email,
                fornecedorTelefone: primaryWinner.telefone,
                fornecedorContato: primaryWinner.contato,
                condicoesPagamento: primaryWinner.condicoesPagamento,
                dataVencimentoSugerida: primaryWinner.dataVencimentoSugerida,
                emailEnvioNf: primaryWinner.emailEnvioNf,
                enderecoEntrega: primaryWinner.enderecoEntrega,
                observacoesFiscais: primaryWinner.observacoesFiscais,
                anexoCotacaoUrl: primaryWinner.anexoUrl,
                anexoCotacaoNome: primaryWinner.anexoNome,
                itens: itensPayload,
                enviarParaAprovacao
            }

            const res = await fetch(`/api/compras/${id}/cotar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Erro ao salvar cotação.")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Cotação finalizada e enviada para aprovação do gestor!"
                    : "Rascunho de cotação salvo e fornecedores arquivados no catálogo!"
            )
            loadPedido()
        } catch (err: any) {
            toast.error(err.message || "Falha ao salvar cotação.")
        } finally {
            setSubmittingCotacao(false)
        }
    }

    // Ações do Aprovador
    const handleAprovar = async () => {
        try {
            setProcessandoAcao(true)
            const res = await fetch(`/api/compras/${id}/aprovar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ justificativaAprovacao: justificativaAcao })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Falha ao aprovar pedido.")
            }

            toast.success("Pedido de compra APROVADO! Ordens de Compra liberadas.")
            setModalAprovarOpen(false)
            loadPedido()
        } catch (err: any) {
            toast.error(err.message || "Erro na aprovação.")
        } finally {
            setProcessandoAcao(false)
        }
    }

    const handleReprovar = async () => {
        if (!justificativaAcao.trim()) {
            toast.error("Informe a justificativa da reprovação.")
            return
        }

        try {
            setProcessandoAcao(true)
            const res = await fetch(`/api/compras/${id}/reprovar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ justificativaReprovacao: justificativaAcao })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Falha ao reprovar pedido.")
            }

            toast.success("Pedido de compra REPROVADO.")
            setModalReprovarOpen(false)
            loadPedido()
        } catch (err: any) {
            toast.error(err.message || "Erro ao reprovar.")
        } finally {
            setProcessandoAcao(false)
        }
    }

    const handleSolicitarAjuste = async () => {
        if (!justificativaAcao.trim()) {
            toast.error("Informe os ajustes necessários.")
            return
        }

        try {
            setProcessandoAcao(true)
            const res = await fetch(`/api/compras/${id}/ajuste`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ajusteSolicitado: justificativaAcao })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Falha ao devolver pedido.")
            }

            toast.success("Pedido devolvido para ajuste.")
            setModalAjusteOpen(false)
            loadPedido()
        } catch (err: any) {
            toast.error(err.message || "Erro ao solicitar ajuste.")
        } finally {
            setProcessandoAcao(false)
        }
    }

    if (loading || !pedido) {
        return (
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold">Carregando detalhes do pedido de compras...</p>
            </div>
        )
    }

    const isCotacaoEditable = ["AGUARDANDO_COTACAO", "COTADO", "AJUSTE_SOLICITADO"].includes(pedido.status)
    const isAprovacaoPending = pedido.status === "AGUARDANDO_APROVACAO"
    const isAprovado = pedido.status === "APROVADO" || pedido.status === "CONCLUIDO"

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 text-slate-900">
            {/* Header com Navegação e Ações */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/compras")}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar aos Pedidos
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                            {pedido.numeroPedido}
                        </h1>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                                pedido.status === "APROVADO" || pedido.status === "CONCLUIDO"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : pedido.status === "AGUARDANDO_APROVACAO"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : pedido.status === "REPROVADO"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : pedido.status === "AJUSTE_SOLICITADO"
                                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                                    : "bg-blue-100 text-blue-800 border border-blue-300"
                            }`}
                        >
                            {pedido.status.replace("_", " ")}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">
                            {pedido.tipoCompra}
                        </span>
                    </div>
                </div>

                {isAprovado && (
                    <Link
                        href={`/dashboard/compras/${pedido.id}/ordem-compra`}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        <Printer className="w-4 h-4" />
                        Exportar / Imprimir Ordem de Compra
                    </Link>
                )}
            </div>

            {/* Aviso de Ajuste se houver */}
            {pedido.status === "AJUSTE_SOLICITADO" && pedido.ajusteSolicitado && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                            Ajuste Solicitado pelo Aprovador:
                        </p>
                        <p className="text-sm mt-1 text-amber-950 font-medium">{pedido.ajusteSolicitado}</p>
                    </div>
                </div>
            )}

            {/* Cards de Metadados Claros e Elegantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empresa (Tenant)</p>
                    <p className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        {pedido.tenantNome}
                    </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Centro de Custo</p>
                    <p className="text-base font-black text-slate-900 mt-1 flex items-center gap-2 truncate" title={pedido.centroCustoNome}>
                        <Landmark className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span className="truncate">{pedido.centroCustoNome}</span>
                    </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conta Orçamentária</p>
                    <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-2 truncate" title={pedido.categoriaNome}>
                        <FolderTree className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{pedido.categoriaNome}</span>
                    </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Competência</p>
                    <p className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {String(pedido.mesCompetencia).padStart(2, "0")}/{pedido.anoCompetencia}
                    </p>
                </div>
            </div>

            {/* MONITORAMENTO DE ORÇAMENTO EM TEMPO REAL */}
            {budgetData && (
                <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                                Monitoramento de Orçamento em Tempo Real (BudgetHub)
                            </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                            {String(pedido.mesCompetencia).padStart(2, "0")}/{pedido.anoCompetencia}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Orçado no Mês</p>
                            <p className="text-2xl font-black text-white mt-1">
                                {budgetData.orcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Já Realizado (Gasto)</p>
                            <p className="text-2xl font-black text-slate-300 mt-1">
                                {budgetData.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Comprometido em Pedidos</p>
                            <p className="text-2xl font-black text-amber-400 mt-1">
                                {budgetData.comprometidoPedidos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo Disponível</p>
                            <p className={`text-2xl font-black mt-1 ${budgetData.saldoDisponivel >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {budgetData.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO PRINCIPAL DE COTAÇÃO, FORNECEDORES & MAPA COMPARATIVO */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-5 h-5 text-indigo-600" />
                            Cotação & Concorrência de Fornecedores
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Adicione múltiplos fornecedores, analise o mapa comparativo de preços e escolha o vencedor global ou por grupo de itens (split).
                        </p>
                    </div>

                    {isCotacaoEditable && (
                        <button
                            type="button"
                            onClick={handleAddFornecedor}
                            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-xl text-xs border border-indigo-200 transition-all cursor-pointer shadow-2xs shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Novo Fornecedor na Cotação
                        </button>
                    )}
                </div>

                {/* ABAS DOS FORNECEDORES COTADOS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                    {fornecedores.map((f, idx) => {
                        const isActive = f.id === activeFornecedorId
                        const countWon = pedido.itens.filter((it) => (itemWinners[it.id] || fornecedores[0]?.id) === f.id).length

                        return (
                            <div
                                key={f.id}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                                    isActive
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                                }`}
                                onClick={() => setActiveFornecedorId(f.id)}
                            >
                                <Building2 className={`w-4 h-4 ${isActive ? "text-indigo-200" : "text-slate-500"}`} />
                                <span>{f.nome || `Fornecedor ${idx + 1}`}</span>

                                {countWon > 0 && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                            isActive
                                                ? "bg-white text-indigo-900"
                                                : "bg-indigo-100 text-indigo-800"
                                        }`}
                                    >
                                        {countWon} {countWon === 1 ? "item" : "itens"}
                                    </span>
                                )}

                                {isCotacaoEditable && fornecedores.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveFornecedor(f.id)
                                        }}
                                        className={`p-0.5 rounded hover:bg-black/10 transition-colors ${
                                            isActive ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-rose-600"
                                        }`}
                                        title="Remover fornecedor"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* DETALHES DO FORNECEDOR ATIVO */}
                {activeFornecedor && (
                    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Dados Cadastrais: {activeFornecedor.nome || "Novo Fornecedor"}
                                </span>
                            </div>

                            {/* LEITURA DE ORÇAMENTO COM IA PARA O FORNECEDOR SELECIONADO */}
                            {isCotacaoEditable && (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={`ai-upload-file-${activeFornecedor.id}`}
                                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                                        onChange={handleFileUploadAndExtract}
                                        disabled={uploadingAI}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor={`ai-upload-file-${activeFornecedor.id}`}
                                        className={`flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-sm shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer ${
                                            uploadingAI ? "opacity-50 pointer-events-none" : ""
                                        }`}
                                    >
                                        {uploadingAI ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Lendo Orçamento com IA...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                                Subir Proposta & Ler com IA
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ANEXO DO FORNECEDOR SE HOUVER */}
                        {activeFornecedor.anexoUrl && (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                                <div className="flex items-center gap-2.5">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-800 truncate max-w-sm">
                                        {activeFornecedor.anexoNome || "Proposta_Comercial.pdf"}
                                    </span>
                                </div>
                                <a
                                    href={activeFornecedor.anexoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-md"
                                >
                                    Ver Arquivo <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {/* FORMULÁRIO DO FORNECEDOR COM AUTOCOMPLETE DO CATÁLOGO */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* CAMPO NOME COM BUSCA NO CATÁLOGO */}
                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Razão Social / Nome Fantasia *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ex: Comercial de EPIs Brasil Ltda"
                                        value={activeFornecedor.nome}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            updateActiveFornecedor({ nome: val })
                                            searchCatalogo(val)
                                        }}
                                        onFocus={() => {
                                            if (activeFornecedor.nome) searchCatalogo(activeFornecedor.nome)
                                        }}
                                        disabled={!isCotacaoEditable}
                                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                    />
                                    {searchingCatalogo && (
                                        <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-3 top-2.5" />
                                    )}
                                </div>

                                {/* DROPDOWN DE SUGESTÕES DO CATÁLOGO */}
                                {showCatalogoDropdown && catalogoResults.length > 0 && isCotacaoEditable && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                                        <div className="p-2 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Fornecedores Encontrados no Catálogo:
                                        </div>
                                        {catalogoResults.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => handleSelectCatalogoFornecedor(cat)}
                                                className="w-full text-left p-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{cat.nome}</p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {cat.cnpj ? `CNPJ: ${cat.cnpj}` : "Sem CNPJ"} • {cat.condicoesPagamento || "Boleto 28 DDL"}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    Carregar
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    CNPJ do Fornecedor
                                </label>
                                <input
                                    type="text"
                                    placeholder="00.000.000/0000-00"
                                    value={activeFornecedor.cnpj}
                                    onChange={(e) => updateActiveFornecedor({ cnpj: e.target.value })}
                                    disabled={!isCotacaoEditable}
                                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Condições de Pagamento
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Boleto 28 DDL, 30/60 dias"
                                    value={activeFornecedor.condicoesPagamento}
                                    onChange={(e) => updateActiveFornecedor({ condicoesPagamento: e.target.value })}
                                    disabled={!isCotacaoEditable}
                                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    E-mail para Envio da Nota Fiscal *
                                </label>
                                <input
                                    type="email"
                                    placeholder="fiscal@fornecedor.com.br"
                                    value={activeFornecedor.emailEnvioNf}
                                    onChange={(e) => updateActiveFornecedor({ emailEnvioNf: e.target.value })}
                                    disabled={!isCotacaoEditable}
                                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Data de Vencimento Pactuada
                                </label>
                                <input
                                    type="date"
                                    value={activeFornecedor.dataVencimentoSugerida}
                                    onChange={(e) => updateActiveFornecedor({ dataVencimentoSugerida: e.target.value })}
                                    disabled={!isCotacaoEditable}
                                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Local / Posto de Entrega
                                </label>
                                <input
                                    type="text"
                                    placeholder="Endereço da filial ou posto"
                                    value={activeFornecedor.enderecoEntrega}
                                    onChange={(e) => updateActiveFornecedor({ enderecoEntrega: e.target.value })}
                                    disabled={!isCotacaoEditable}
                                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* PAINEL DE ANÁLISE E DECISÃO DE COMPRA (AÇÕES RÁPIDAS) */}
                {isCotacaoEditable && (
                    <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-indigo-600" />
                                Assistente de Decisão de Compra
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                                Utilize os atalhos para otimizar o pedido com 1 clique ou escolha manualmente o fornecedor de cada item na tabela.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={handleMelhorPrecoGlobal}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-900 font-bold px-3.5 py-2 rounded-xl text-xs border border-indigo-200 shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Atribui todos os itens ao fornecedor com menor valor total"
                            >
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                🏆 Melhor Preço Global
                            </button>

                            <button
                                type="button"
                                onClick={handleMenorPrecoPorItem}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                                title="Atribui cada item ao fornecedor mais barato daquele produto"
                            >
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-300" />
                                ⚡ Otimizar por Item (Cesta Mista)
                            </button>
                        </div>
                    </div>
                )}

                {/* MAPA COMPARATIVO DE PREÇOS (QUADRO DE COTAÇÃO) */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            Mapa Comparativo de Cotações (Por Item x Fornecedor)
                        </h3>
                        <span className="text-[11px] text-slate-500 font-medium">
                            {fornecedores.length} {fornecedores.length === 1 ? "fornecedor cotado" : "fornecedores cotados"}
                        </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4 w-44">Item / Descrição</th>
                                    <th className="py-3 px-3 text-center w-20">Qtd</th>

                                    {/* COLUNAS PARA CADA FORNECEDOR */}
                                    {fornecedores.map((f, idx) => (
                                        <th key={f.id} className="py-3 px-4 text-right border-l border-slate-200">
                                            <span className="text-xs font-black text-slate-900 block truncate max-w-[160px]">
                                                {f.nome || `Fornecedor ${idx + 1}`}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-normal block">
                                                {f.cnpj || "Sem CNPJ"}
                                            </span>
                                        </th>
                                    ))}

                                    {/* FORNECEDOR VENCEDOR / SPLIT */}
                                    <th className="py-3 px-4 text-center bg-indigo-50/50 border-l-2 border-indigo-200 w-52">
                                        Fornecedor Vencedor (Split)
                                    </th>
                                    <th className="py-3 px-4 text-right bg-indigo-50/70 border-l border-indigo-100 w-32">
                                        Subtotal Final
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                                {pedido.itens.map((item) => {
                                    // Determinar o menor preço unitário para este item
                                    const prices = fornecedores
                                        .map((f) => f.precos[item.id] || 0)
                                        .filter((p) => p > 0)
                                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0

                                    // Vencedor atual deste item
                                    const currentWinnerId = itemWinners[item.id] || fornecedores[0]?.id
                                    const currentWinner =
                                        fornecedores.find((f) => f.id === currentWinnerId) || fornecedores[0]
                                    const winningPrice = currentWinner?.precos[item.id] || 0
                                    const finalSubtotal = winningPrice * item.quantidade

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <p className="font-bold text-slate-900 text-xs">{item.descricao}</p>
                                                {item.especificacao && (
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{item.especificacao}</p>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                                                {item.quantidade} <span className="text-[10px] text-slate-500 font-normal">{item.unidade}</span>
                                            </td>

                                            {/* PREÇO EM CADA FORNECEDOR */}
                                            {fornecedores.map((f) => {
                                                const p = f.precos[item.id] || 0
                                                const isMin = p > 0 && p === minPrice
                                                const isThisWinner = f.id === currentWinnerId

                                                return (
                                                    <td
                                                        key={f.id}
                                                        className={`py-3 px-4 text-right border-l border-slate-100 ${
                                                            isThisWinner ? "bg-indigo-50/20" : ""
                                                        }`}
                                                    >
                                                        {isCotacaoEditable ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0,00"
                                                                    value={p || ""}
                                                                    onChange={(e) =>
                                                                        handleUpdateItemPrice(
                                                                            f.id,
                                                                            item.id,
                                                                            parseFloat(e.target.value) || 0
                                                                        )
                                                                    }
                                                                    className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 text-right focus:outline-none focus:border-indigo-600 shadow-2xs"
                                                                />
                                                                {isMin && (
                                                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                                        <Check className="w-2.5 h-2.5" /> MENOR
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="font-bold text-slate-900">
                                                                    {p.toLocaleString("pt-BR", {
                                                                        style: "currency",
                                                                        currency: "BRL"
                                                                    })}
                                                                </span>
                                                                {isMin && (
                                                                    <span className="block text-[9px] font-black text-emerald-700">
                                                                        ★ Menor Preço
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}

                                            {/* SELETOR DE FORNECEDOR VENCEDOR DESTE ITEM */}
                                            <td className="py-3 px-4 border-l-2 border-indigo-200 bg-indigo-50/30">
                                                {isCotacaoEditable ? (
                                                    <select
                                                        value={currentWinnerId}
                                                        onChange={(e) =>
                                                            setItemWinners({
                                                                ...itemWinners,
                                                                [item.id]: e.target.value
                                                            })
                                                        }
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                                                    >
                                                        {fornecedores.map((f) => {
                                                            const itemPrice = f.precos[item.id] || 0
                                                            const isLowest = itemPrice > 0 && itemPrice === minPrice
                                                            return (
                                                                <option key={f.id} value={f.id}>
                                                                    {f.nome || "Fornecedor"} (R$ {itemPrice.toFixed(2)}){" "}
                                                                    {isLowest ? "★ MENOR" : ""}
                                                                </option>
                                                            )
                                                        })}
                                                    </select>
                                                ) : (
                                                    <span className="font-bold text-indigo-900 text-xs block">
                                                        {currentWinner?.nome || "N/A"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* SUBTOTAL FINAL DO ITEM */}
                                            <td className="py-3.5 px-4 text-right font-black text-slate-900 border-l border-indigo-100 bg-indigo-50/50">
                                                {finalSubtotal.toLocaleString("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL"
                                                })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                <tr>
                                    <td colSpan={2} className="py-3.5 px-4 text-slate-600 uppercase text-xs">
                                        Totais por Fornecedor (100%):
                                    </td>

                                    {/* SOMA GLOBAL DE CADA FORNECEDOR */}
                                    {fornecedores.map((f) => {
                                        const globalSum = pedido.itens.reduce(
                                            (acc, it) => acc + (f.precos[it.id] || 0) * it.quantidade,
                                            0
                                        )
                                        return (
                                            <td key={f.id} className="py-3.5 px-4 text-right border-l border-slate-200">
                                                <span className="text-xs text-slate-500 block font-normal">Total Cotado:</span>
                                                <span className="text-sm font-black text-slate-900">
                                                    {globalSum.toLocaleString("pt-BR", {
                                                        style: "currency",
                                                        currency: "BRL"
                                                    })}
                                                </span>
                                            </td>
                                        )
                                    })}

                                    <td className="py-3.5 px-4 text-right border-l-2 border-indigo-200 bg-indigo-50/70 text-indigo-900 uppercase text-xs font-black">
                                        Total Final Selecionado:
                                    </td>
                                    <td className="py-3.5 px-4 text-right border-l border-indigo-100 bg-indigo-100/70 text-emerald-800 text-base font-black">
                                        {totalFinalCotado.toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL"
                                        })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* CARDS DE RESUMO DA DIVISÃO DE PEDIDO (SPLIT DE FORNECEDORES) */}
                {splitSummary.length > 1 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Split className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                Divisão de Ordens de Compra (Split entre {splitSummary.length} Fornecedores):
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500">
                            Ao aprovar este pedido, ordens de compra exclusivas poderão ser emitidas para cada fornecedor vencedor com seus respectivos itens.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                            {splitSummary.map((s, idx) => (
                                <div
                                    key={s.fornecedor.id}
                                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                            OC #{idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-slate-600">
                                            {s.itemsCount} {s.itemsCount === 1 ? "item" : "itens"}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {s.fornecedor.nome}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Condição: {s.fornecedor.condicoesPagamento || "Boleto 28 DDL"}
                                    </p>
                                    <p className="text-sm font-black text-emerald-700 pt-1 border-t border-slate-100">
                                        {s.subtotal.toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL"
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AÇÕES DE SUPRIMENTOS */}
                {isCotacaoEditable && (
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => handleSalvarCotacao(false)}
                            disabled={submittingCotacao}
                            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                        >
                            Salvar Rascunho
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSalvarCotacao(true)}
                            disabled={submittingCotacao}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {submittingCotacao ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Finalizar Cotação & Enviar para Aprovação
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* BARRA DE APROVAÇÃO DO GESTOR */}
            {isAprovacaoPending && (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="text-xs font-black uppercase tracking-wider text-purple-900 bg-purple-100 px-3 py-1 rounded-full">
                            Aprovação de Gestão Pendente
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-2">
                            Aprovar Compra: {totalFinalCotado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                            Fornecedores: {splitSummary.map((s) => s.fornecedor.nome).join(", ") || pedido.fornecedorNome}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setModalAjusteOpen(true)}
                            className="px-4 py-2.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                        >
                            Solicitar Ajuste
                        </button>
                        <button
                            type="button"
                            onClick={() => setModalReprovarOpen(true)}
                            className="px-4 py-2.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-900 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                        >
                            Reprovar
                        </button>
                        <button
                            type="button"
                            onClick={() => setModalAprovarOpen(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            <Check className="w-4 h-4" />
                            Aprovar Pedido & Liberar Compra
                        </button>
                    </div>
                </div>
            )}

            {/* HISTÓRICO DE AUDITORIA */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    Histórico & Trilha de Auditoria
                </h3>

                <div className="divide-y divide-slate-100">
                    {pedido.historico.map((h) => (
                        <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div>
                                <span className="font-bold text-slate-900">{h.usuario.nome}</span>
                                <span className="text-slate-500"> ({h.usuario.email})</span>
                                <p className="text-slate-600 mt-0.5">{h.observacao}</p>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                {new Date(h.data).toLocaleString("pt-BR")}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL APROVAR */}
            {modalAprovarOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <h3 className="text-base font-black text-slate-900 uppercase">Confirmar Aprovação</h3>
                        <p className="text-xs text-slate-600">
                            Ao aprovar, as Ordens de Compra oficiais serão emitidas para os fornecedores vencedores.
                        </p>
                        <textarea
                            placeholder="Observações da aprovação (opcional)..."
                            value={justificativaAcao}
                            onChange={(e) => setJustificativaAcao(e.target.value)}
                            rows={3}
                            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-600"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAprovarOpen(false)}
                                className="px-4 py-2 text-xs font-bold border rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleAprovar}
                                disabled={processandoAcao}
                                className="px-5 py-2 text-xs font-black bg-emerald-600 text-white rounded-xl"
                            >
                                {processandoAcao ? "Aprovando..." : "Confirmar Aprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL REPROVAR */}
            {modalReprovarOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <h3 className="text-base font-black text-rose-700 uppercase">Reprovar Pedido</h3>
                        <p className="text-xs text-slate-600">
                            Informe o motivo da reprovação para o solicitante e o comprador.
                        </p>
                        <textarea
                            placeholder="Justificativa da reprovação..."
                            value={justificativaAcao}
                            onChange={(e) => setJustificativaAcao(e.target.value)}
                            rows={3}
                            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-600"
                            required
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalReprovarOpen(false)}
                                className="px-4 py-2 text-xs font-bold border rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleReprovar}
                                disabled={processandoAcao}
                                className="px-5 py-2 text-xs font-black bg-rose-600 text-white rounded-xl"
                            >
                                {processandoAcao ? "Reprovando..." : "Confirmar Reprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL AJUSTE */}
            {modalAjusteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <h3 className="text-base font-black text-amber-700 uppercase">Solicitar Ajustes na Cotação</h3>
                        <p className="text-xs text-slate-600">
                            Informe o que precisa ser ajustado (ex: buscar mais cotações, renegociar prazo de entrega, etc).
                        </p>
                        <textarea
                            placeholder="Descreva o que o comprador deve ajustar..."
                            value={justificativaAcao}
                            onChange={(e) => setJustificativaAcao(e.target.value)}
                            rows={3}
                            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-600"
                            required
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAjusteOpen(false)}
                                className="px-4 py-2 text-xs font-bold border rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSolicitarAjuste}
                                disabled={processandoAcao}
                                className="px-5 py-2 text-xs font-black bg-amber-600 text-white rounded-xl"
                            >
                                {processandoAcao ? "Enviando..." : "Devolver para Ajuste"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
