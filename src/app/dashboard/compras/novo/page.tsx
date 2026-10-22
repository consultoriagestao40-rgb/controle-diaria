"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    ShoppingCart,
    Building2,
    Landmark,
    Calendar,
    Plus,
    Trash2,
    Copy,
    ArrowLeft,
    CheckCircle2,
    Upload,
    FileSpreadsheet,
    FileText,
    Loader2,
    HelpCircle,
    Download
} from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"

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
    grupo: string
    contaPaiCodigo: string
    contaPaiNome: string
}

interface ItemRow {
    categoriaPai: string
    categoriaFilho: string
    categoriaId?: string
    descricao: string
    especificacao: string
    marca: string
    tamanho: string
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

const UNIDADES = ["UN", "PAR", "CX", "PCT", "L", "KG", "KIT", "MT", "ROLO", "GL", "M²", "FRASCO"]

export default function NovoPedidoCompraPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [tenants, setTenants] = useState<Tenant[]>([])
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    const [loadingTenants, setLoadingTenants] = useState(true)
    const [loadingCCs, setLoadingCCs] = useState(false)
    const [loadingCats, setLoadingCats] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [importingFile, setImportingFile] = useState(false)

    // Form fields de Cabeçalho (Topo)
    const [selectedTenantId, setSelectedTenantId] = useState("")
    const [selectedCostCenterId, setSelectedCostCenterId] = useState("")
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [justificativa, setJustificativa] = useState("")

    // Tabela de Itens (Multi-categoria por item)
    const [itens, setItens] = useState<ItemRow[]>([
        {
            categoriaPai: "03.6 - Materiais de Limpeza & Higiene",
            categoriaFilho: "",
            categoriaId: "",
            descricao: "",
            especificacao: "",
            marca: "",
            tamanho: "",
            quantidade: 1,
            unidade: "UN"
        }
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

                const [resCC, resCats] = await Promise.all([
                    fetch(`/api/budgethub/cost-centers?tenantId=${selectedTenantId}`),
                    fetch(`/api/budgethub/categories?tenantId=${selectedTenantId}`)
                ])

                if (resCC.ok) {
                    const ccData: CostCenter[] = await resCC.json()
                    setCostCenters(ccData)
                    const penhaCC = ccData.find(c => c.name.toLowerCase().includes("penha")) || ccData[0]
                    if (penhaCC) {
                        setSelectedCostCenterId(penhaCC.id)
                    }
                }

                if (resCats.ok) {
                    const catsData: Category[] = await resCats.json()
                    setCategories(catsData)

                    // Se a primeira linha ainda não tem subconta preenchida, preenche com a primeira categoria
                    if (catsData.length > 0 && itens.length === 1 && !itens[0].descricao) {
                        setItens([{
                            categoriaPai: catsData[0].contaPaiNome || catsData[0].grupo || "03.6 - Materiais",
                            categoriaFilho: catsData[0].name,
                            categoriaId: catsData[0].id,
                            descricao: "",
                            especificacao: "",
                            marca: "",
                            tamanho: "",
                            quantidade: 1,
                            unidade: "UN"
                        }])
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

    // Lista única de Contas Pais disponíveis da empresa
    const contasPaisDisponiveis = Array.from(
        new Map(categories.map(c => [c.contaPaiCodigo || c.grupo, {
            codigo: c.contaPaiCodigo || c.grupo,
            nome: c.contaPaiNome || c.grupo || c.name
        }])).values()
    ).sort((a, b) => a.codigo.localeCompare(b.codigo))

    // Fallback de categorias padrão se a API do BudgetHub não trouxer lista
    const categoriasPaiPadrao = contasPaisDisponiveis.length > 0
        ? contasPaisDisponiveis
        : [
            { codigo: "03.5", nome: "03.5 - EPIs e Uniformes" },
            { codigo: "03.6", nome: "03.6 - Materiais de Limpeza & Higiene" },
            { codigo: "03.7", nome: "03.7 - Manutenção e Equipamentos" },
            { codigo: "03.8", nome: "03.8 - Materiais de Escritório / TI" },
            { codigo: "03.9", nome: "03.9 - Outros Suprimentos e Insumos" }
        ]

    // Obter subcontas filtradas para uma dada categoria pai
    const getSubcontasParaContaPai = (catPaiNomeOuCodigo: string) => {
        if (!catPaiNomeOuCodigo) return categories
        const search = catPaiNomeOuCodigo.toLowerCase()
        return categories.filter(c =>
            (c.contaPaiCodigo && search.includes(c.contaPaiCodigo.toLowerCase())) ||
            (c.contaPaiNome && search.includes(c.contaPaiNome.toLowerCase())) ||
            (c.grupo && search.includes(c.grupo.toLowerCase()))
        )
    }

    // Manipulação de Itens da Tabela
    const handleAddItem = () => {
        const lastItem = itens[itens.length - 1]
        setItens([
            ...itens,
            {
                categoriaPai: lastItem ? lastItem.categoriaPai : (categoriasPaiPadrao[0]?.nome || "03.6 - Materiais de Limpeza"),
                categoriaFilho: lastItem ? lastItem.categoriaFilho : "",
                categoriaId: lastItem ? lastItem.categoriaId : "",
                descricao: "",
                especificacao: "",
                marca: "",
                tamanho: "",
                quantidade: 1,
                unidade: "UN"
            }
        ])
    }

    const handleDuplicateItem = (index: number) => {
        const itemToClone = itens[index]
        const updated = [...itens]
        updated.splice(index + 1, 0, { ...itemToClone })
        setItens(updated)
        toast.info("Linha duplicada.")
    }

    const handleRemoveItem = (index: number) => {
        if (itens.length === 1) {
            toast.warning("O pedido deve conter pelo menos 1 item.")
            return
        }
        setItens(itens.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
        const updated = [...itens]
        updated[index] = { ...updated[index], [field]: value }

        // Se alterou a Categoria Pai, reseta a Subconta
        if (field === "categoriaPai") {
            const subcontas = getSubcontasParaContaPai(value)
            if (subcontas.length > 0) {
                updated[index].categoriaFilho = subcontas[0].name
                updated[index].categoriaId = subcontas[0].id
            } else {
                updated[index].categoriaFilho = ""
                updated[index].categoriaId = ""
            }
        }

        // Se alterou a Subconta diretamente, atualiza o categoriaId
        if (field === "categoriaFilho") {
            const matched = categories.find(c => c.name === value)
            if (matched) {
                updated[index].categoriaId = matched.id
                if (!updated[index].categoriaPai) {
                    updated[index].categoriaPai = matched.contaPaiNome || matched.grupo
                }
            }
        }

        setItens(updated)
    }

    // Importar itens via arquivo Excel ou PDF
    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setImportingFile(true)
            toast.loading("Lendo e importando arquivo...", { id: "import-toast" })

            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/compras/importar-itens", {
                method: "POST",
                body: formData
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Falha ao processar arquivo.")
            }

            const novosItens: ItemRow[] = (data.itens || []).map((it: any) => ({
                categoriaPai: it.categoriaPai || categoriasPaiPadrao[0]?.nome || "03.6 - Materiais",
                categoriaFilho: it.categoriaFilho || "",
                categoriaId: it.categoriaId || "",
                descricao: it.descricao || "",
                especificacao: it.especificacao || "",
                marca: it.marca || "",
                tamanho: it.tamanho || "",
                quantidade: Number(it.quantidade) || 1,
                unidade: it.unidade || "UN"
            }))

            if (novosItens.length > 0) {
                // Se a lista atual só tem 1 item vazio, substitui; caso contrário, concatena
                if (itens.length === 1 && !itens[0].descricao.trim()) {
                    setItens(novosItens)
                } else {
                    setItens(prev => [...prev, ...novosItens])
                }
                toast.success(`${novosItens.length} itens importados com sucesso!`, { id: "import-toast" })
            } else {
                toast.info("Nenhum item encontrado no arquivo.", { id: "import-toast" })
            }
        } catch (err: any) {
            console.error("Erro na importação de arquivo:", err)
            toast.error(err.message || "Erro ao importar arquivo.", { id: "import-toast" })
        } finally {
            setImportingFile(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    // Submissão do pedido completo
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const currentTenant = tenants.find(t => t.id === selectedTenantId)
        const currentCC = costCenters.find(cc => cc.id === selectedCostCenterId)

        if (!currentTenant || !currentCC) {
            toast.error("Por favor, selecione a Empresa e o Centro de Custo.")
            return
        }

        if (!justificativa.trim()) {
            toast.error("Informe a justificativa / destinação da compra.")
            return
        }

        const validItens = itens.filter(it => it.descricao.trim().length > 0)
        if (validItens.length === 0) {
            toast.error("Preencha a descrição de pelo menos um item na tabela.")
            return
        }

        try {
            setSubmitting(true)

            const payload = {
                tenantId: currentTenant.id,
                tenantNome: currentTenant.name,
                centroCustoId: currentCC.id,
                centroCustoNome: currentCC.name,
                mesCompetencia: selectedMonth,
                anoCompetencia: selectedYear,
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
            toast.success(`Pedido ${novoPedido.numeroPedido} criado com ${validItens.length} itens!`)
            router.push(`/dashboard/compras/${novoPedido.id}`)
        } catch (err: any) {
            toast.error(err.message || "Falha ao enviar pedido.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-300 text-slate-900">
            {/* Header com Navegação */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar para Pedidos
                    </button>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                        Novo Pedido de Compras & Suprimentos
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                        Faça pedidos multi-categoria (EPI, Limpeza, Uniformes e Equipamentos) no mesmo contrato sem necessidade de abrir chamados separados.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. CABEÇALHO SUPERIOR: EMPRESA, CENTRO DE CUSTO, COMPETÊNCIA E JUSTIFICATIVA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            1. Informações do Contrato & Competência
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Empresa / Tenant */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                                <span>Empresa do Grupo *</span>
                                <span className="text-[10px] text-indigo-600 font-bold">BudgetHub</span>
                            </label>
                            <SearchableSelect
                                options={tenants.map(t => ({
                                    value: t.id,
                                    label: t.name,
                                    sublabel: t.cnpj ? `CNPJ: ${t.cnpj}` : undefined
                                }))}
                                value={selectedTenantId}
                                onChange={(val) => setSelectedTenantId(val)}
                                placeholder="Selecione a Empresa..."
                                searchPlaceholder="Buscar empresa..."
                                loading={loadingTenants}
                                required
                            />
                        </div>

                        {/* Centro de Custo / Posto */}
                        <div className="md:col-span-5 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                                <span>Centro de Custo / Contrato / Posto *</span>
                                <span className="text-[10px] text-slate-500 font-semibold">{costCenters.length} postos</span>
                            </label>
                            <SearchableSelect
                                options={costCenters.map(cc => ({
                                    value: cc.id,
                                    label: cc.name
                                }))}
                                value={selectedCostCenterId}
                                onChange={(val) => setSelectedCostCenterId(val)}
                                placeholder={!selectedTenantId ? "Selecione primeiro a Empresa..." : "Selecione o Centro de Custo..."}
                                searchPlaceholder="Buscar posto ou contrato..."
                                loading={loadingCCs}
                                disabled={!selectedTenantId}
                                required
                            />
                        </div>

                        {/* Competência (Mês / Ano) */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Competência da Compra *</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                                >
                                    {MESES.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                                >
                                    {[2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Justificativa / Destinação */}
                        <div className="md:col-span-12 space-y-1.5 pt-1">
                            <label className="text-xs font-bold text-slate-700 uppercase">
                                Justificativa / Destinação do Pedido *
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Reposição mensal de produtos de limpeza, uniformes e EPIs para a equipe do contrato"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* 2. TABELA DE ITENS COM MULTI-CATEGORIA, ESPECIFICAÇÃO/CA, MARCA, TAMANHO E IMPORTAÇÃO */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span>2. Tabela de Lançamento de Itens ({itens.length})</span>
                                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Multi-Categoria Habilitada
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Lance EPIs, materiais, químicos, uniformes e equipamentos no mesmo pedido com sua respectiva conta de orçamento.
                            </p>
                        </div>

                        {/* Ações da Tabela: Importar Excel/PDF & Adicionar Item */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Input Oculto de Arquivo */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf"
                                onChange={handleFileImport}
                                className="hidden"
                            />

                            <button
                                type="button"
                                disabled={importingFile}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                title="Importar lista de produtos de arquivo Excel (.xlsx) ou PDF"
                            >
                                {importingFile ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Lendo arquivo...
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        Subir Excel / PDF
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Linha
                            </button>
                        </div>
                    </div>

                    {/* Tabela Responsiva de Linhas */}
                    <div className="space-y-3">
                        {itens.map((item, index) => {
                            const subcontasDaLinha = getSubcontasParaContaPai(item.categoriaPai)

                            return (
                                <div
                                    key={index}
                                    className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-4 space-y-3 transition-colors shadow-xs"
                                >
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                                                {index + 1}
                                            </span>
                                            Item #{index + 1}
                                        </span>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleDuplicateItem(index)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                title="Duplicar esta linha"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Excluir este item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        {/* 1. Categoria Pai */}
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                                                <span>Categoria Pai *</span>
                                            </label>
                                            <select
                                                value={item.categoriaPai}
                                                onChange={(e) => handleItemChange(index, "categoriaPai", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                                                required
                                            >
                                                {categoriasPaiPadrao.map(cp => (
                                                    <option key={cp.codigo} value={cp.nome}>
                                                        {cp.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Categoria Filho / Subconta */}
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Subconta / Classificação
                                            </label>
                                            <select
                                                value={item.categoriaFilho}
                                                onChange={(e) => handleItemChange(index, "categoriaFilho", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                                            >
                                                <option value="">Selecione ou deixe padrão...</option>
                                                {subcontasDaLinha.map(sc => (
                                                    <option key={sc.id} value={sc.name}>
                                                        {sc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Descrição do Item */}
                                        <div className="md:col-span-6 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Descrição do Produto / Item *
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Luva nitrílica cano longo / Detergente alcalino 5L"
                                                value={item.descricao}
                                                onChange={(e) => handleItemChange(index, "descricao", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
                                                required
                                            />
                                        </div>

                                        {/* 4. Especificação / CA */}
                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Especificação Técnica / CA (EPI)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: CA 12345 / 5 Litros / Reforçado"
                                                value={item.especificacao}
                                                onChange={(e) => handleItemChange(index, "especificacao", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                                            />
                                        </div>

                                        {/* 5. Marca */}
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Marca Sugerida
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Danny / Spartan / Brascamp"
                                                value={item.marca}
                                                onChange={(e) => handleItemChange(index, "marca", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                                            />
                                        </div>

                                        {/* 6. Tamanho / Dimensão */}
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Tamanho / Dimensão
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: G / M / 42 / 5L"
                                                value={item.tamanho}
                                                onChange={(e) => handleItemChange(index, "tamanho", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs text-center"
                                            />
                                        </div>

                                        {/* 7. Quantidade */}
                                        <div className="md:col-span-1 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Qtd *
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.quantidade}
                                                onChange={(e) => handleItemChange(index, "quantidade", Number(e.target.value))}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-900 font-black text-center focus:outline-none focus:border-indigo-600 shadow-2xs"
                                                required
                                            />
                                        </div>

                                        {/* 8. Unidade */}
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                Unidade *
                                            </label>
                                            <select
                                                value={item.unidade}
                                                onChange={(e) => handleItemChange(index, "unidade", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs text-center"
                                            >
                                                {UNIDADES.map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Total de linhas de compra: <strong>{itens.length}</strong></span>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            + Adicionar outro item
                        </button>
                    </div>
                </div>

                {/* BOTÕES DE ENVIO */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs md:text-sm transition-all cursor-pointer shadow-sm"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 py-2.5 rounded-xl text-xs md:text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enviando Pedido...
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
