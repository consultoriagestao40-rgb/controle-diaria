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
            toast.info("Lendo orçamento com Inteligência Artificial (Gemini)...")

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

                if (Array.isArray(extracted.itens) && extracted.itens.length > 0 && pedido) {
                    const newPrices = { ...itemPrices }

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

                toast.success("Cotação processada com sucesso pela IA!")
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
                    ? "Cotação finalizada e enviada para aprovação!"
                    : "Rascunho de cotação salvo!"
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

            toast.success("Pedido de compra APROVADO! Ordem de Compra liberada.")
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
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 text-slate-900">
            {/* Header com Navegação e Ações */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/compras")}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Pedidos de Compras
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Pedido {pedido.numeroPedido}
                        </h1>

                        <span className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wide border ${
                            pedido.status === 'APROVADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            pedido.status === 'AGUARDANDO_APROVACAO' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            pedido.status === 'REPROVADO' ? 'bg-red-50 text-red-700 border-red-200' :
                            pedido.status === 'AJUSTE_SOLICITADO' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                            {pedido.status.replace("_", " ")}
                        </span>

                        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold uppercase border border-slate-200">
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
                        Exportar Ordem de Compra
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
                        <Calendar className="w-4 h-4 text-amber-600" />
                        {String(pedido.mesCompetencia).padStart(2, "0")}/{pedido.anoCompetencia}
                    </p>
                </div>
            </div>

            {/* PAINEL DE MONITORAMENTO DE ORÇAMENTO (BUDGETHUB) */}
            {budgetData && (
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                Monitoramento de Orçamento em Tempo Real (BudgetHub)
                            </h3>
                        </div>
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                            {String(pedido.mesCompetencia).padStart(2, "0")}/{pedido.anoCompetencia}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-5">
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

            {/* SEÇÃO DE COTAÇÃO & FORNECEDOR */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-5 h-5 text-indigo-600" />
                            Cotação & Fornecedor Vencedor
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isCotacaoEditable
                                ? "O comprador pode subir o arquivo da cotação para extração automática por IA ou lançar manualmente."
                                : "Dados da cotação homologada para atendimento deste pedido."}
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
                                className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer ${
                                    uploadingAI ? "opacity-50 pointer-events-none" : ""
                                }`}
                            >
                                {uploadingAI ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Lendo Orçamento com IA...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        Subir Anexo & Ler com IA
                                    </>
                                )}
                            </label>
                        </div>
                    )}
                </div>

                {anexoUrl && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <div>
                                <span className="text-xs font-bold text-slate-900 block truncate max-w-sm">
                                    {anexoNome || "Proposta_Comercial.pdf"}
                                </span>
                                <span className="text-[11px] text-slate-500">Documento anexado para auditoria</span>
                            </div>
                        </div>
                        <a
                            href={anexoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                        >
                            Ver Anexo <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}

                {/* Formulário de Fornecedor com Cores Claras e Contrastantes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Fornecedor (Razão Social) *
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Comercial de EPIs Brasil Ltda"
                            value={fornecedorNome}
                            onChange={(e) => setFornecedorNome(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            CNPJ do Fornecedor
                        </label>
                        <input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            value={fornecedorCnpj}
                            onChange={(e) => setFornecedorCnpj(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Condições de Pagamento
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Boleto 28 DDL, 30/60 dias"
                            value={condicoesPagamento}
                            onChange={(e) => setCondicoesPagamento(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            E-mail para Envio da Nota Fiscal *
                        </label>
                        <input
                            type="email"
                            placeholder="fiscal@empresa.com.br"
                            value={emailEnvioNf}
                            onChange={(e) => setEmailEnvioNf(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Data de Vencimento Pactuada
                        </label>
                        <input
                            type="date"
                            value={dataVencimentoSugerida}
                            onChange={(e) => setDataVencimentoSugerida(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Local / Posto de Entrega
                        </label>
                        <input
                            type="text"
                            placeholder="Endereço da filial ou posto"
                            value={enderecoEntrega}
                            onChange={(e) => setEnderecoEntrega(e.target.value)}
                            disabled={!isCotacaoEditable}
                            className="w-full bg-slate-50/60 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-700"
                        />
                    </div>
                </div>

                {/* TABELA CLARA DE ITENS COM PREÇOS COTADOS */}
                <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Itens Cotados & Preços Unitários
                    </h3>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Item / Descrição</th>
                                    <th className="py-3 px-4 text-center">Qtd</th>
                                    <th className="py-3 px-4 text-center">Unid</th>
                                    <th className="py-3 px-4 text-right">Preço Unitário (R$)</th>
                                    <th className="py-3 px-4 text-right">Preço Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                                {pedido.itens.map((item) => {
                                    const currentPrice = itemPrices[item.id]?.precoUnitario || 0
                                    const currentQtd = itemPrices[item.id]?.quantidade || item.quantidade
                                    const subtotal = Number((currentPrice * currentQtd).toFixed(2))

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <p className="font-bold text-slate-900 text-sm">{item.descricao}</p>
                                                {item.especificacao && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{item.especificacao}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-slate-900 text-sm">
                                                {currentQtd}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                                                {item.unidade}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
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
                                                        className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 text-right focus:outline-none focus:border-indigo-600 shadow-2xs"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-900">
                                                        {currentPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                                                {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={4} className="py-4 px-4 text-right font-black text-xs uppercase text-slate-600 tracking-wider">
                                        Valor Total da Compra:
                                    </td>
                                    <td className="py-4 px-4 text-right font-black text-xl text-emerald-700">
                                        {totalCotadoCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

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

            {/* BARRA DE APROVAÇÃO DO GESTOR (MODERNA & CLARA) */}
            {isAprovacaoPending && (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-700" />
                            Aprovação do Pedido de Compras
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                            A cotação foi finalizada pelo setor de suprimentos no valor total de{" "}
                            <span className="font-black text-slate-950">
                                {totalCotadoCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            . Valide o impacto no orçamento antes de aprovar.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("")
                                setModalReprovarOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-300 bg-white text-red-700 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                            <X className="w-4 h-4" /> Reprovar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("")
                                setModalAjusteOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                            <AlertCircle className="w-4 h-4" /> Solicitar Ajuste
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJustificativaAcao("Compra aprovada dentro do orçamento disponível.")
                                setModalAprovarOpen(true)
                            }}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            <Check className="w-4 h-4 stroke-[3]" /> Aprovar Pedido
                        </button>
                    </div>
                </div>
            )}

            {/* TIMELINE DE HISTÓRICO DO PEDIDO */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Histórico & Trilha de Auditoria
                </h3>

                <div className="space-y-3 pt-2">
                    {pedido.historico.map((h) => (
                        <div key={h.id} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-4 py-1">
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{h.usuario.nome}</span>
                                    <span className="text-[11px] text-slate-400">
                                        {new Date(h.data).toLocaleString("pt-BR")}
                                    </span>
                                </div>
                                <p className="text-slate-600 font-medium">{h.observacao}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DE APROVAÇÃO */}
            {modalAprovarOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900">
                        <h3 className="text-base font-black text-slate-900">Confirmar Aprovação da Compra</h3>
                        <p className="text-xs text-slate-600">
                            Ao aprovar, a Ordem de Compra oficial será emitida e disponibilizada para o comprador enviar ao fornecedor.
                        </p>
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Parecer do Gestor</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAprovarOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleAprovar}
                                disabled={processandoAcao}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
                            >
                                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Aprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE REPROVAÇÃO */}
            {modalReprovarOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900">
                        <h3 className="text-base font-black text-slate-900">Reprovar Pedido de Compra</h3>
                        <p className="text-xs text-slate-600">
                            Informe o motivo da reprovação para registrar no histórico da solicitação.
                        </p>
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Motivo da Reprovação *</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                placeholder="Ex: Fora do orçamento ou item não autorizado..."
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-600"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalReprovarOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleReprovar}
                                disabled={processandoAcao}
                                className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
                            >
                                {processandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Reprovação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AJUSTE */}
            {modalAjusteOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900">
                        <h3 className="text-base font-black text-slate-900">Solicitar Ajuste no Pedido / Cotação</h3>
                        <p className="text-xs text-slate-600">
                            O pedido retornará para Suprimentos ou Solicitante com as orientações abaixo:
                        </p>
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Instruções de Ajuste *</label>
                            <textarea
                                value={justificativaAcao}
                                onChange={(e) => setJustificativaAcao(e.target.value)}
                                rows={3}
                                placeholder="Ex: Negociar prazo de pagamento para 30 dias ou cotar fornecedor alternativo..."
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalAjusteOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSolicitarAjuste}
                                disabled={processandoAcao}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
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
