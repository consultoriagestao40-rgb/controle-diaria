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
    Upload,
    Sparkles,
    FileText,
    Receipt,
    Printer,
    Check,
    X,
    Loader2,
    DollarSign,
    ExternalLink,
    Tag,
    User as UserIcon
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

    // Cotação Form States
    const [fornecedorNome, setFornecedorNome] = useState("")
    const [fornecedorCnpj, setFornecedorCnpj] = useState("")
    const [fornecedorEmail, setFornecedorEmail] = useState("")
    const [fornecedorTelefone, setFornecedorTelefone] = useState("")
    const [condicoesPagamento, setCondicoesPagamento] = useState("")
    const [dataVencimentoSugerida, setDataVencimentoSugerida] = useState("")
    const [emailEnvioNf, setEmailEnvioNf] = useState("")
    const [enderecoEntrega, setEnderecoEntrega] = useState("")
    const [observacoesFiscais, setObservacoesFiscais] = useState("")
    const [anexoUrl, setAnexoUrl] = useState("")
    const [anexoNome, setAnexoNome] = useState("")

    // Editable item prices
    const [itemPrices, setItemPrices] = useState<Record<string, { precoUnitario: number; quantidade: number }>>({})

    // AI & Upload state
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

                // Inicializar formulário de cotação
                setFornecedorNome(data.fornecedorNome || "")
                setFornecedorCnpj(data.fornecedorCnpj || "")
                setFornecedorEmail(data.fornecedorEmail || "")
                setFornecedorTelefone(data.fornecedorTelefone || "")
                setCondicoesPagamento(data.condicoesPagamento || "Boleto 28 DDL")
                setDataVencimentoSugerida(
                    data.dataVencimentoSugerida ? data.dataVencimentoSugerida.split("T")[0] : ""
                )
                setEmailEnvioNf(data.emailEnvioNf || "financeiro@grupofacilities.com.br")
                setEnderecoEntrega(data.enderecoEntrega || data.centroCustoNome)
                setObservacoesFiscais(data.observacoesFiscais || "")
                setAnexoUrl(data.anexoCotacaoUrl || "")
                setAnexoNome(data.anexoCotacaoNome || "")

                const initialPrices: Record<string, { precoUnitario: number; quantidade: number }> = {}
                data.itens.forEach((it) => {
                    initialPrices[it.id] = {
                        precoUnitario: it.precoUnitario ? Number(it.precoUnitario) : 0,
                        quantidade: it.quantidade
                    }
                })
                setItemPrices(initialPrices)

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
            const url = `/api/budgethub/availability?tenantId=${p.tenantId}&costCenterId=${encodeURIComponent(p.centroCustoId)}&categoryId=${encodeURIComponent(p.categoriaId)}&mes=${p.mesCompetencia}&ano=${p.anoCompetencia}`
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

    // Upload de arquivo e extração com IA Gemini
    const handleFileUploadAndExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingAI(true)
            toast.info("Fazendo upload e lendo orçamento com Inteligência Artificial (Gemini)...")

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
            setAnexoUrl(data.fileUrl)
            setAnexoNome(data.fileName)

            const extracted = data.extractedData
            if (extracted) {
                if (extracted.fornecedor?.nome) setFornecedorNome(extracted.fornecedor.nome)
                if (extracted.fornecedor?.cnpj) setFornecedorCnpj(extracted.fornecedor.cnpj)
                if (extracted.fornecedor?.email) setFornecedorEmail(extracted.fornecedor.email)
                if (extracted.fornecedor?.telefone) setFornecedorTelefone(extracted.fornecedor.telefone)
                if (extracted.condicoesPagamento) setCondicoesPagamento(extracted.condicoesPagamento)
                if (extracted.dataVencimento) setDataVencimentoSugerida(extracted.dataVencimento)
                if (extracted.emailEnvioNf) setEmailEnvioNf(extracted.emailEnvioNf)

                // Mapear preços nos itens
                if (Array.isArray(extracted.itens) && extracted.itens.length > 0 && pedido) {
                    const newPrices = { ...itemPrices }

                    // Tenta mapear por aproximação ou sequência
                    pedido.itens.forEach((pedidoItem, idx) => {
                        const matched =
                            extracted.itens.find((ext: any) =>
                                ext.descricao.toLowerCase().includes(pedidoItem.descricao.toLowerCase().slice(0, 5))
                            ) || extracted.itens[idx]

                        if (matched && matched.precoUnitario) {
                            newPrices[pedidoItem.id] = {
                                precoUnitario: Number(matched.precoUnitario),
                                quantidade: pedidoItem.quantidade
                            }
                        }
                    })

                    setItemPrices(newPrices)
                }

                toast.success("Cotação processada com sucesso pela IA! Dados preenchidos.")
            }
        } catch (err: any) {
            console.error("Erro no processamento com IA:", err)
            toast.error(err.message || "Falha ao extrair dados do orçamento.")
        } finally {
            setUploadingAI(false)
            e.target.value = ""
        }
    }

    // Calcular Total Cotado em tempo real
    const totalCotadoCalculado = Object.values(itemPrices).reduce((acc, curr) => {
        return acc + (Number(curr.precoUnitario) || 0) * (Number(curr.quantidade) || 1)
    }, 0)

    // Salvar cotação
    const handleSalvarCotacao = async (enviarParaAprovacao: boolean) => {
        if (!fornecedorNome.trim()) {
            toast.error("Informe a Razão Social ou Nome do Fornecedor cotado.")
            return
        }

        if (totalCotadoCalculado <= 0) {
            toast.error("Lance o preço unitário dos itens cotados.")
            return
        }

        try {
            setSubmittingCotacao(true)

            const itensPayload = pedido?.itens.map((it) => ({
                id: it.id,
                precoUnitario: itemPrices[it.id]?.precoUnitario || 0,
                quantidade: itemPrices[it.id]?.quantidade || it.quantidade,
                fornecedor: fornecedorNome
            }))

            const payload = {
                fornecedorNome,
                fornecedorCnpj,
                fornecedorEmail,
                fornecedorTelefone,
                condicoesPagamento,
                dataVencimentoSugerida,
                emailEnvioNf,
                enderecoEntrega,
                observacoesFiscais,
                anexoCotacaoUrl: anexoUrl,
                anexoCotacaoNome: anexoNome,
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
                    ? "Cotação registrada e enviada para aprovação do gestor!"
                    : "Rascunho de cotação salvo com sucesso!"
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

            toast.success("Pedido de compra APROVADO com sucesso! Ordem de Compra liberada.")
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
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-sm font-medium">Carregando detalhes do pedido de compras...</p>
            </div>
        )
    }

    const isCotacaoEditable = ["AGUARDANDO_COTACAO", "COTADO", "AJUSTE_SOLICITADO"].includes(pedido.status)
    const isAprovacaoPending = pedido.status === "AGUARDANDO_APROVACAO"
    const isAprovado = pedido.status === "APROVADO" || pedido.status === "CONCLUIDO"

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header com Navegação e Botão de Ordem de Compra */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/compras")}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Pedidos de Compras
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
                            Pedido {pedido.numeroPedido}
                        </h1>
                        <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                            {pedido.status.replace("_", " ")}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                            {pedido.tipoCompra}
                        </span>
                    </div>
                </div>

                {isAprovado && (
                    <Link
                        href={`/dashboard/compras/${pedido.id}/ordem-compra`}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-6 py-3 rounded-xl text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        <Printer className="w-4 h-4" />
                        Exportar Ordem de Compra
                    </Link>
                )}
            </div>

            {/* Aviso de Ajuste se houver */}
            {pedido.status === "AJUSTE_SOLICITADO" && pedido.ajusteSolicitado && (
                <div className="bg-orange-500/15 border border-orange-500/40 rounded-2xl p-5 flex items-start gap-3 text-orange-200 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                            Ajuste Solicitado pelo Aprovador:
                        </p>
                        <p className="text-sm mt-1">{pedido.ajusteSolicitado}</p>
                    </div>
                </div>
            )}

            {/* Banner de Dados Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Empresa (Tenant)</p>
                    <p className="text-base font-black text-white mt-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        {pedido.tenantNome}
                    </p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Centro de Custo</p>
                    <p className="text-base font-black text-white mt-1 flex items-center gap-2 truncate">
                        <Landmark className="w-4 h-4 text-cyan-400" />
                        {pedido.centroCustoNome}
                    </p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Conta Orçamentária</p>
                    <p className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-2 truncate">
                        <FolderTree className="w-4 h-4 text-indigo-400" />
                        {pedido.categoriaNome}
                    </p>
                </div>
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Competência</p>
                    <p className="text-base font-black text-white mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        {String(pedido.mesCompetencia).padStart(2, "0")}/{pedido.anoCompetencia}
                    </p>
                </div>
            </div>

            {/* Snapshot de Orçamento (BudgetHub) */}
            {budgetData && (
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">
                            Monitoramento de Orçamento em Tempo Real (BudgetHub)
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase">Orçado no Mês</p>
                            <p className="text-lg font-black text-white mt-0.5">
                                {budgetData.orcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase">Realizado</p>
                            <p className="text-lg font-black text-slate-300 mt-0.5">
                                {budgetData.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase">Comprometido</p>
                            <p className="text-lg font-black text-amber-400 mt-0.5">
                                {budgetData.comprometidoPedidos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase">Saldo Disponível</p>
                            <p className={`text-xl font-black mt-0.5 ${budgetData.saldoDisponivel >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {budgetData.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO DE COTAÇÃO & FORNECEDOR */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-5 h-5 text-amber-400" />
                            Cotação & Fornecedor Vencedor
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isCotacaoEditable
                                ? "Suprimentos pode subir o arquivo do orçamento para a IA ler ou preencher manualmente."
                                : "Dados da cotação homologada para esta compra."}
                        </p>
                    </div>

                    {/* BOTÃO IA LEITURA DE COTAÇÃO */}
                    {isCotacaoEditable && (
                        <div className="relative">
                            <input
                                type="file"
                                id="ai-upload-file"
                                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                                onChange={handleFileUploadAndExtract}
                                disabled={uploadingAI}
                                className="hidden"
                            />
                            <label
                                htmlFor="ai-upload-file"
                                className={`flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer ${
                                    uploadingAI ? "opacity-50 pointer-events-none" : ""
                                }`}
                            >
                                {uploadingAI ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Lendo com Gemini IA...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Subir Anexo & Ler com IA
                                    </>
                                )}
                            </label>
                        </div>
                    )}
                </div>

                {anexoUrl && (
                    <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold text-white truncate max-w-xs">
                                {anexoNome || "Orçamento_Cotacao.pdf"}
                            </span>
                        </div>
                        <a
                            href={anexoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                        >
                            Visualizar Anexo <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}

                {/* Formulário de Dados do Fornecedor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Fornecedor (Razão Social) *</label>
                        <input
                            type="text"
                            placeholder="Ex: Comercial de EPIs Brasil Ltda"
                            value={fornecedorNome}
                            onChange={(e) => setFornecedorNome(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">CNPJ do Fornecedor</label>
                        <input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            value={fornecedorCnpj}
                            onChange={(e) => setFornecedorCnpj(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Condições de Pagamento</label>
                        <input
                            type="text"
                            placeholder="Ex: Boleto 28 DDL, 30/60 dias"
                            value={condicoesPagamento}
                            onChange={(e) => setCondicoesPagamento(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">E-mail para Envio da NF *</label>
                        <input
                            type="email"
                            placeholder="fiscal@empresa.com.br"
                            value={emailEnvioNf}
                            onChange={(e) => setEmailEnvioNf(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Data de Vencimento Sugerida</label>
                        <input
                            type="date"
                            value={dataVencimentoSugerida}
                            onChange={(e) => setDataVencimentoSugerida(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Local / Endereço de Entrega</label>
                        <input
                            type="text"
                            placeholder="Endereço da filial ou posto de serviço"
                            value={enderecoEntrega}
                            onChange={(e) => setEnderecoEntrega(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                    </div>
                </div>

                {/* TABELA DE ITENS COM PREÇOS COTADOS */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Itens Cotados & Preços Unitários
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase">
                                    <th className="py-2 px-3">Item / Descrição</th>
                                    <th className="py-2 px-3 text-center">Qtd</th>
                                    <th className="py-2 px-3 text-center">Unid</th>
                                    <th className="py-2 px-3 text-right">Preço Unitário (R$)</th>
                                    <th className="py-2 px-3 text-right">Preço Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {pedido.itens.map((item) => {
                                    const currentPrice = itemPrices[item.id]?.precoUnitario || 0
                                    const currentQtd = itemPrices[item.id]?.quantidade || item.quantidade
                                    const subtotal = Number((currentPrice * currentQtd).toFixed(2))

                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02]">
                                            <td className="py-3 px-3">
                                                <p className="font-bold text-white">{item.descricao}</p>
                                                {item.especificacao && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{item.especificacao}</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-slate-200">
                                                {currentQtd}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-400">
                                                {item.unidade}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                {isCotacaoEditable ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0,00"
                                                        value={currentPrice || ""}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0
                                                            setItemPrices({
                                                                ...itemPrices,
                                                                [item.id]: { precoUnitario: val, quantidade: currentQtd }
                                                            })
                                                        }}
                                                        className="w-28 bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-amber-400"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-white">
                                                        {currentPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-black text-white">
                                                {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-white/10 text-sm">
                                    <td colSpan={4} className="py-3 px-3 text-right font-black text-slate-300 uppercase">
                                        Valor Total da Compra:
                                    </td>
                                    <td className="py-3 px-3 text-right font-black text-xl text-amber-400">
                                        {totalCotadoCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* AÇÕES DE SUPRIMENTOS */}
                {isCotacaoEditable && (
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => handleSalvarCotacao(false)}
                            disabled={submittingCotacao}
                            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-bold text-xs transition-all cursor-pointer"
                        >
                            Salvar Rascunho
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSalvarCotacao(true)}
                            disabled={submittingCotacao}
                            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
                <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-purple-950/40 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            Aprovação do Pedido de Compras
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            A cotação foi finalizada pelo setor de suprimentos no valor de{" "}
                            <span className="font-bold text-white">
                                {totalCotadoCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            . Valide o impacto no orçamento do centro de custo.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("")
                                setModalReprovarOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" /> Reprovar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("")
                                setModalAjusteOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 text-xs font-bold transition-all cursor-pointer"
                        >
                            <AlertCircle className="w-4 h-4" /> Solicitar Ajuste
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("Compra aprovada dentro do orçamento disponível.")
                                setModalAprovarOpen(true)
                            }}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                            <Check className="w-4 h-4 stroke-[3]" /> Aprovar Pedido
                        </button>
                    </div>
                </div>
            )}

            {/* TIMELINE DE HISTÓRICO DO PEDIDO */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Histórico & Trilha de Auditoria
                </h3>

                <div className="space-y-3 pt-2">
                    {pedido.historico.map((h) => (
                        <div key={h.id} className="flex items-start gap-3 text-xs border-l-2 border-white/10 pl-4 py-1">
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{h.usuario.nome}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(h.data).toLocaleString("pt-BR")}
                                    </span>
                                </div>
                                <p className="text-slate-300">{h.observacao}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DE APROVAÇÃO */}
            {modalAprovarOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                        <h3 className="text-base font-bold text-white">Confirmar Aprovação da Compra</h3>
                        <p className="text-xs text-slate-400">
                            Ao aprovar, a Ordem de Compra oficial será emitida e disponibilizada para o comprador enviar ao fornecedor.
                        </p>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Parecer do Gestor</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAprovarOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleAprovar}
                                disabled={processandoAcao}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2"
                            >
                                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Aprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE REPROVAÇÃO */}
            {modalReprovarOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                        <h3 className="text-base font-bold text-white">Reprovar Pedido de Compra</h3>
                        <p className="text-xs text-slate-400">
                            Informe o motivo da reprovação para registrar no histórico da solicitação.
                        </p>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Motivo da Reprovação *</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                placeholder="Ex: Fora do orçamento ou item não autorizado..."
                                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-400"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalReprovarOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleReprovar}
                                disabled={processandoAcao}
                                className="bg-red-500 hover:bg-red-400 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2"
                            >
                                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Reprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AJUSTE */}
            {modalAjusteOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                        <h3 className="text-base font-bold text-white">Solicitar Ajuste no Pedido / Cotação</h3>
                        <p className="text-xs text-slate-400">
                            O pedido retornará para Suprimentos ou Solicitante com as orientações abaixo:
                        </p>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Instruções de Ajuste *</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                placeholder="Ex: Negociar prazo de pagamento para 30 dias ou cotar fornecedor alternativo..."
                                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAjusteOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSolicitarAjuste}
                                disabled={processandoAcao}
                                className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2"
                            >
                                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Devolver para Ajuste"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
