"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    ShoppingCart,
    Building2,
    Landmark,
    FolderTree,
    Calendar,
    Plus,
    Trash2,
    ArrowLeft,
    CheckCircle2,
    Sparkles,
    Loader2
} from "lucide-react"

interface Tenant {
    id: string
    name: string
    cnpj: string
}

interface CostCenter {
    id: string
    name: string
    tenantId: string
}

interface Category {
    id: string
    name: string
    tenantId: string
    type: string
    isMateriais036: boolean
    isEpiUniforme035: boolean
    grupo: string
    contaPaiCodigo: string
    contaPaiNome: string
}

interface ItemRow {
    descricao: string
    especificacao: string
    quantidade: number
    unidade: string
}

const MESES = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
]

const UNIDADES = ["UN", "PAR", "CX", "PCT", "L", "KG", "KIT", "MT", "ROLO", "GL"]

const TIPOS_COMPRA = [
    { id: "EPI", label: "EPI (Proteção Individual)" },
    { id: "UNIFORME", label: "Uniformes & Vestuário" },
    { id: "LIMPEZA", label: "Materiais de Limpeza & Higiene" },
    { id: "ESCRITORIO", label: "Materiais de Escritório" },
    { id: "MANUTENCAO", label: "Manutenção & Equipamentos" },
    { id: "TI", label: "Informática & Tecnologia" },
    { id: "OUTROS", label: "Outros Insumos" },
]

export default function NovoPedidoCompraPage() {
    const router = useRouter()

    const [tenants, setTenants] = useState<Tenant[]>([])
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    const [loadingTenants, setLoadingTenants] = useState(true)
    const [loadingCCs, setLoadingCCs] = useState(false)
    const [loadingCats, setLoadingCats] = useState(false)
    const [checkingBudget, setCheckingBudget] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form fields - Dropdowns / Listas Suspensas
    const [selectedTenantId, setSelectedTenantId] = useState("")
    const [selectedCostCenterId, setSelectedCostCenterId] = useState("")
    const [selectedContaPai, setSelectedContaPai] = useState("03.6") // Padrão: 03.6 Materiais
    const [selectedCategoryId, setSelectedCategoryId] = useState("")
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [tipoCompra, setTipoCompra] = useState("EPI")
    const [justificativa, setJustificativa] = useState("")

    // Budget Availability Snapshot
    const [budgetData, setBudgetData] = useState<{
        orcado: number
        realizado: number
        comprometidoPedidos: number
        saldoDisponivel: number
        isNegative: boolean
    } | null>(null)

    // Items list
    const [itens, setItens] = useState<ItemRow[]>([
        { descricao: "", especificacao: "", quantidade: 1, unidade: "UN" }
    ])

    // 1. Carregar Lista de Empresas (Tenants) do BudgetHub
    useEffect(() => {
        async function loadTenants() {
            try {
                setLoadingTenants(true)
                const res = await fetch("/api/budgethub/tenants")
                if (res.ok) {
                    const data: Tenant[] = await res.json()
                    setTenants(data)
                    // Se houver JVS FACILITIES, seleciona como padrão
                    const defaultTenant = data.find(t => t.name.includes("JVS FACILITIES")) || data[0]
                    if (defaultTenant) {
                        setSelectedTenantId(defaultTenant.id)
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar empresas do BudgetHub:", error)
                toast.error("Falha ao carregar empresas do BudgetHub.")
            } finally {
                setLoadingTenants(false)
            }
        }
        loadTenants()
    }, [])

    // 2. Carregar Centros de Custo e Categorias da Empresa Selecionada
    useEffect(() => {
        if (!selectedTenantId) return

        async function loadCCsAndCats() {
            try {
                setLoadingCCs(true)
                setLoadingCats(true)
                setSelectedCostCenterId("")
                setSelectedCategoryId("")
                setBudgetData(null)

                const [resCC, resCats] = await Promise.all([
                    fetch(`/api/budgethub/cost-centers?tenantId=${selectedTenantId}`),
                    fetch(`/api/budgethub/categories?tenantId=${selectedTenantId}`)
                ])

                if (resCC.ok) {
                    const ccData: CostCenter[] = await resCC.json()
                    setCostCenters(ccData)
                    // Se houver Penha, pode selecionar ou deixar o primeiro
                    const penhaCC = ccData.find(c => c.name.toLowerCase().includes("penha")) || ccData[0]
                    if (penhaCC) {
                        setSelectedCostCenterId(penhaCC.id)
                    }
                }

                if (resCats.ok) {
                    const catsData: Category[] = await resCats.json()
                    setCategories(catsData)

                    // Filtrar subcontas da conta pai ativa (03.6 por padrão)
                    const subcontas036 = catsData.filter(c => c.contaPaiCodigo === "03.6")
                    if (subcontas036.length > 0) {
                        setSelectedCategoryId(subcontas036[0].id)
                    } else if (catsData.length > 0) {
                        setSelectedContaPai(catsData[0].contaPaiCodigo)
                        setSelectedCategoryId(catsData[0].id)
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar dados da empresa selecionada:", err)
            } finally {
                setLoadingCCs(false)
                setLoadingCats(false)
            }
        }

        loadCCsAndCats()
    }, [selectedTenantId])

    // 3. Obter lista única de Contas Pais disponíveis nas categorias da empresa
    const contasPaisDisponiveis = Array.from(
        new Map(categories.map(c => [c.contaPaiCodigo, { codigo: c.contaPaiCodigo, nome: c.contaPaiNome }])).values()
    ).sort((a, b) => a.codigo.localeCompare(b.codigo))

    // 4. Filtrar Subcontas pertencentes estritamente à Conta Pai Selecionada
    const subcontasHabilitadas = categories.filter(c => c.contaPaiCodigo === selectedContaPai)

    // 5. Quando o usuário troca a Conta Pai, atualiza automaticamente a Categoria/Subconta selecionada
    const handleContaPaiChange = (novaContaPai: string) => {
        setSelectedContaPai(novaContaPai)
        const subcontas = categories.filter(c => c.contaPaiCodigo === novaContaPai)
        if (subcontas.length > 0) {
            setSelectedCategoryId(subcontas[0].id)
        } else {
            setSelectedCategoryId("")
        }
    }

    // 6. Consultar Saldo Orçamentário em Tempo Real
    useEffect(() => {
        if (!selectedTenantId || !selectedCostCenterId || !selectedCategoryId) {
            setBudgetData(null)
            return
        }

        async function checkBudget() {
            try {
                setCheckingBudget(true)
                const url = `/api/budgethub/availability?tenantId=${selectedTenantId}&costCenterId=${encodeURIComponent(selectedCostCenterId)}&categoryId=${encodeURIComponent(selectedCategoryId)}&mes=${selectedMonth}&ano=${selectedYear}`
                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    setBudgetData(data)
                }
            } catch (err) {
                console.error("Erro ao checar saldo de budget:", err)
            } finally {
                setCheckingBudget(false)
            }
        }

        checkBudget()
    }, [selectedTenantId, selectedCostCenterId, selectedCategoryId, selectedMonth, selectedYear])

    // Adicionar item
    const handleAddItem = () => {
        setItens([...itens, { descricao: "", especificacao: "", quantidade: 1, unidade: "UN" }])
    }

    // Remover item
    const handleRemoveItem = (index: number) => {
        if (itens.length === 1) {
            toast.warning("O pedido deve conter no mínimo 1 item.")
            return
        }
        setItens(itens.filter((_, i) => i !== index))
    }

    // Alterar campo de item
    const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
        const updated = [...itens]
        updated[index] = { ...updated[index], [field]: value }
        setItens(updated)
    }

    // Submissão do pedido
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const currentTenant = tenants.find(t => t.id === selectedTenantId)
        const currentCC = costCenters.find(cc => cc.id === selectedCostCenterId)
        const currentCat = categories.find(c => c.id === selectedCategoryId)

        if (!currentTenant || !currentCC || !currentCat) {
            toast.error("Por favor, selecione Empresa, Centro de Custo, Conta Pai e Subconta.")
            return
        }

        if (!justificativa.trim()) {
            toast.error("Informe a justificativa/destinação da compra.")
            return
        }

        const validItens = itens.filter(it => it.descricao.trim().length > 0)
        if (validItens.length === 0) {
            toast.error("Preencha a descrição de pelo menos um item.")
            return
        }

        try {
            setSubmitting(true)

            const payload = {
                tenantId: currentTenant.id,
                tenantNome: currentTenant.name,
                centroCustoId: currentCC.id,
                centroCustoNome: currentCC.name,
                categoriaId: currentCat.id,
                categoriaNome: currentCat.name,
                mesCompetencia: selectedMonth,
                anoCompetencia: selectedYear,
                tipoCompra,
                justificativa,
                itens: validItens
            }

            const res = await fetch("/api/compras", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Erro ao criar pedido.")
            }

            const novoPedido = await res.json()
            toast.success(`Pedido ${novoPedido.numeroPedido} criado e enviado para cotação!`)
            router.push(`/dashboard/compras/${novoPedido.id}`)
        } catch (err: any) {
            toast.error(err.message || "Falha ao enviar pedido.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 text-slate-900">
            {/* Header com Navegação */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Pedidos
                    </button>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                        Novo Pedido de Compras
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Solicitação de suprimentos, EPIs, uniformes e materiais com validação de orçamento no BudgetHub.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. SELEÇÃO DE EMPRESA & CENTRO DE CUSTO VIA LISTA SUSPENSA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            1. Empresa & Alocação de Custo
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Lista Suspensa de Empresa */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                                <span>Empresa / Tenant do Grupo *</span>
                                <span className="text-[11px] text-indigo-600 font-bold">BudgetHub</span>
                            </label>
                            {loadingTenants ? (
                                <div className="flex items-center gap-2 py-3 text-slate-500 text-xs font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    Carregando empresas...
                                </div>
                            ) : (
                                <select
                                    value={selectedTenantId}
                                    onChange={(e) => setSelectedTenantId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors"
                                    required
                                >
                                    <option value="" disabled>Selecione a Empresa...</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} (CNPJ: {t.cnpj})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Lista Suspensa de Centro de Custo */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                                <span>Centro de Custo / Posto de Serviço *</span>
                                <span className="text-[11px] text-slate-500 font-semibold">
                                    {costCenters.length} disponíveis
                                </span>
                            </label>
                            {loadingCCs ? (
                                <div className="flex items-center gap-2 py-3 text-slate-500 text-xs font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    Carregando centros de custo...
                                </div>
                            ) : (
                                <select
                                    value={selectedCostCenterId}
                                    onChange={(e) => setSelectedCostCenterId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors"
                                    required
                                >
                                    <option value="" disabled>Selecione o Centro de Custo...</option>
                                    {costCenters.map(cc => (
                                        <option key={cc.id} value={cc.id}>
                                            {cc.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. CONTA PAI, SUBCONTA E COMPETÊNCIA (CASCATA DE LISTAS SUSPENSAS) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <FolderTree className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            2. Classificação Orçamentária & Competência
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* LISTA SUSPENSA 1: CONTA PAI */}
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase">
                                Conta Pai (Grupo Orçamentário) *
                            </label>
                            {loadingCats ? (
                                <div className="flex items-center gap-2 py-3 text-slate-500 text-xs font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    Carregando contas pai...
                                </div>
                            ) : (
                                <select
                                    value={selectedContaPai}
                                    onChange={(e) => handleContaPaiChange(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors"
                                    required
                                >
                                    <option value="" disabled>Selecione a Conta Pai...</option>
                                    {contasPaisDisponiveis.map(g => (
                                        <option key={g.codigo} value={g.codigo}>
                                            {g.nome}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="text-[11px] text-slate-500">
                                Filtra estritamente as contas de orçamento permitidas.
                            </p>
                        </div>

                        {/* LISTA SUSPENSA 2: SUBCONTA (HABILITADA APENAS PELA CONTA PAI) */}
                        <div className="md:col-span-5 space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                                <span>Subconta / Conta de Orçamento *</span>
                                <span className="text-[11px] text-indigo-600 font-bold">
                                    {subcontasHabilitadas.length} subconta(s)
                                </span>
                            </label>
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                disabled={subcontasHabilitadas.length === 0}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors disabled:opacity-50"
                                required
                            >
                                <option value="" disabled>
                                    {subcontasHabilitadas.length === 0
                                        ? "Nenhuma subconta nesta conta pai"
                                        : "Selecione a Subconta / Categoria..."}
                                </option>
                                {subcontasHabilitadas.map(sc => (
                                    <option key={sc.id} value={sc.id}>
                                        {sc.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-500">
                                Conta onde a despesa do pedido será provisionada no BudgetHub.
                            </p>
                        </div>

                        {/* LISTA SUSPENSA 3: MÊS E ANO */}
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase">
                                Mês de Competência *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors"
                                >
                                    {MESES.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm transition-colors"
                                >
                                    <option value={2025}>2025</option>
                                    <option value={2026}>2026</option>
                                    <option value={2027}>2027</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. PAINEL DE SALDO ORÇAMENTÁRIO (BUDGET EM TEMPO REAL) */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                Monitoramento de Orçamento em Tempo Real (BudgetHub)
                            </h3>
                        </div>
                        {checkingBudget && (
                            <span className="flex items-center gap-2 text-xs text-amber-300 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Consultando orçamento na matriz...
                            </span>
                        )}
                    </div>

                    {budgetData ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                                <p className="text-[11px] font-bold text-slate-400 uppercase">Orçado no Mês</p>
                                <p className="text-xl font-black text-white mt-1">
                                    {budgetData.orcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>
                            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                                <p className="text-[11px] font-bold text-slate-400 uppercase">Já Realizado (Gasto)</p>
                                <p className="text-xl font-black text-slate-300 mt-1">
                                    {budgetData.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>
                            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                                <p className="text-[11px] font-bold text-slate-400 uppercase">Pedidos em Aberto</p>
                                <p className="text-xl font-black text-amber-400 mt-1">
                                    {budgetData.comprometidoPedidos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl border ${
                                budgetData.saldoDisponivel >= 0
                                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                                    : "bg-rose-950/80 border-rose-500/50 text-rose-400"
                            }`}>
                                <p className="text-[11px] font-bold uppercase tracking-wider">Saldo Disponível</p>
                                <p className="text-2xl font-black mt-1">
                                    {budgetData.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                            Selecione a Empresa, Centro de Custo, Conta Pai e Subconta para calcular o saldo disponível.
                        </div>
                    )}
                </div>

                {/* 4. DETALHES DO PEDIDO: TIPO & JUSTIFICATIVA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        3. Detalhes da Solicitação
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Tipo de Compra</label>
                            <select
                                value={tipoCompra}
                                onChange={(e) => setTipoCompra(e.target.value)}
                                className="w-full mt-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                            >
                                {TIPOS_COMPRA.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-700 uppercase">
                                Justificativa / Destinação da Compra *
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Reposição mensal de EPIs e uniformes para equipe do posto Balneário Shopping"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                className="w-full mt-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* 5. ITENS DO PEDIDO */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                4. Itens a Serem Cotados
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Informe os produtos, especificações e quantidades necessárias. Os preços unitários serão cotados pelo setor de suprimentos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {itens.map((item, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200"
                            >
                                <div className="col-span-12 md:col-span-5">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                                        Item / Descrição *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Luva nitrílica cano longo tam G"
                                        value={item.descricao}
                                        onChange={(e) => handleItemChange(index, "descricao", e.target.value)}
                                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                        required
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                                        Especificação / Marca / Tamanho
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Danny, CA 12345, cor verde"
                                        value={item.especificacao}
                                        onChange={(e) => handleItemChange(index, "especificacao", e.target.value)}
                                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                    />
                                </div>

                                <div className="col-span-6 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                                        Qtd *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={item.quantidade}
                                        onChange={(e) => handleItemChange(index, "quantidade", Number(e.target.value))}
                                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                        required
                                    />
                                </div>

                                <div className="col-span-4 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                                        Unid.
                                    </label>
                                    <select
                                        value={item.unidade}
                                        onChange={(e) => handleItemChange(index, "unidade", e.target.value)}
                                        className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-1.5 py-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                    >
                                        {UNIDADES.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1 flex justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                                        title="Remover item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer shadow-sm"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Registrando Pedido...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Enviar Pedido para Cotação
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
