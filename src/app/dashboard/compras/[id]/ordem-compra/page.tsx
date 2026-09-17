"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
    Printer,
    ArrowLeft,
    Building2,
    CheckCircle2,
    Calendar,
    Mail,
    FileText,
    ShieldCheck,
    Loader2,
    Split,
    Layers
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

interface FornecedorCotacao {
    id: string
    nome: string
    cnpj?: string
    email?: string
    telefone?: string
    contato?: string
    condicoesPagamento?: string
    dataVencimentoSugerida?: string
    emailEnvioNf?: string
    enderecoEntrega?: string
}

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
    cotacoesFornecedores?: string
    createdAt: string
    dataAprovacao?: string
    justificativaAprovacao?: string
    solicitante: {
        nome: string
        email: string
        cargo?: string
    }
    comprador?: {
        nome: string
        email: string
    }
    aprovador?: {
        nome: string
        email: string
    }
    itens: Item[]
}

export default function OrdemCompraImpressaoPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [pedido, setPedido] = useState<Pedido | null>(null)
    const [loading, setLoading] = useState(true)
    const [fornecedoresCotados, setFornecedoresCotados] = useState<FornecedorCotacao[]>([])
    const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null) // null = consolidado

    useEffect(() => {
        async function fetchPedido() {
            try {
                setLoading(true)
                const res = await fetch(`/api/compras/${id}`)
                if (res.ok) {
                    const data: Pedido = await res.json()
                    setPedido(data)

                    // Parse fornecedores cotados se houver
                    if (data.cotacoesFornecedores) {
                        try {
                            const parsed = JSON.parse(data.cotacoesFornecedores)
                            if (Array.isArray(parsed)) {
                                setFornecedoresCotados(parsed)
                            }
                        } catch (e) {
                            console.warn("Aviso ao carregar fornecedores cotados:", e)
                        }
                    }

                    if (data?.numeroPedido && data?.centroCustoNome) {
                        document.title = `${data.numeroPedido} - ${data.centroCustoNome}`
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar pedido para impressão:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchPedido()

        return () => {
            document.title = "ReembolsaFácil"
        }
    }, [id])

    // Lista de fornecedores distintos que ganharam itens neste pedido
    const distinctSuppliers = Array.from(
        new Set(pedido?.itens.map((i) => i.fornecedor?.trim()).filter(Boolean))
    ) as string[]

    // Atualizar título do documento quando o usuário seleciona fornecedor para imprimir
    useEffect(() => {
        if (pedido?.numeroPedido && pedido?.centroCustoNome) {
            if (selectedSupplier) {
                document.title = `${pedido.numeroPedido} (${selectedSupplier}) - ${pedido.centroCustoNome}`
            } else {
                document.title = `${pedido.numeroPedido} - ${pedido.centroCustoNome}`
            }
        }
    }, [selectedSupplier, pedido])

    const handlePrint = () => {
        window.print()
    }

    if (loading || !pedido) {
        return (
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Carregando Ordem de Compra...</p>
            </div>
        )
    }

    // Filtrar itens se um fornecedor específico estiver selecionado
    const displayItens = selectedSupplier
        ? pedido.itens.filter((i) => i.fornecedor === selectedSupplier)
        : pedido.itens

    // Dados do fornecedor selecionado
    const matchedForn = fornecedoresCotados.find(
        (f) => f.nome.trim().toLowerCase() === selectedSupplier?.trim().toLowerCase()
    )

    const fornecedorNomeExibicao = selectedSupplier
        ? selectedSupplier
        : pedido.fornecedorNome || "N/A"

    const fornecedorCnpjExibicao = selectedSupplier
        ? matchedForn?.cnpj || displayItens[0]?.fornecedorCnpj || pedido.fornecedorCnpj
        : pedido.fornecedorCnpj

    const fornecedorEmailExibicao = selectedSupplier
        ? matchedForn?.email || pedido.fornecedorEmail
        : pedido.fornecedorEmail

    const fornecedorTelefoneExibicao = selectedSupplier
        ? matchedForn?.telefone || pedido.fornecedorTelefone
        : pedido.fornecedorTelefone

    const condicoesPagamentoExibicao = selectedSupplier
        ? matchedForn?.condicoesPagamento || pedido.condicoesPagamento
        : pedido.condicoesPagamento

    const valorTotalExibicao = displayItens.reduce((acc, it) => {
        const u = Number(it.precoUnitario) || 0
        const q = Number(it.quantidade) || 1
        return acc + (Number(it.precoTotal) || u * q)
    }, 0)

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans print:p-0 print:bg-white print:text-black">
            {/* BARRA DE AÇÕES NO TOPO (NÃO IMPRIME) */}
            <div className="max-w-4xl mx-auto mb-6 space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => router.push(`/dashboard/compras/${pedido.id}`)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm self-start"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao Pedido
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir / Salvar em PDF
                        </button>
                    </div>
                </div>

                {/* SELETOR DE ORDENS DE COMPRA SE HOUVER SPLIT ENTRE FORNECEDORES */}
                {distinctSuppliers.length > 1 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                            <Split className="w-4 h-4 text-indigo-600" />
                            Este pedido foi dividido entre {distinctSuppliers.length} Fornecedores. Selecione a Ordem de Compra para emissão:
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setSelectedSupplier(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    selectedSupplier === null
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                                }`}
                            >
                                Todas as OCs (Consolidado)
                            </button>

                            {distinctSuppliers.map((forn, idx) => {
                                const isSelected = selectedSupplier === forn
                                const count = pedido.itens.filter((i) => i.fornecedor === forn).length

                                return (
                                    <button
                                        key={forn}
                                        type="button"
                                        onClick={() => setSelectedSupplier(forn)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                            isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                                        }`}
                                    >
                                        <span>OC #{idx + 1}: {forn}</span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                isSelected ? "bg-white text-indigo-900 font-black" : "bg-indigo-100 text-indigo-800"
                                            }`}
                                        >
                                            {count} {count === 1 ? "item" : "itens"}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* DOCUMENTO OFICIAL A4 PARA IMPRESSÃO */}
            <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 md:p-12 border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-4 print:max-w-full space-y-8">
                {/* CABEÇALHO DO DOCUMENTO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-2 border-slate-900 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-white font-black text-xs px-3 py-1 rounded">
                                GRUPO FACILITIES
                            </span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Suprimentos & Compras
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950 mt-2 uppercase">
                            Ordem de Compra / Autorização de Fornecimento
                        </h1>
                        {selectedSupplier && (
                            <p className="text-xs font-bold text-indigo-700 mt-1 uppercase tracking-wider">
                                Emissão Exclusiva: {selectedSupplier}
                            </p>
                        )}
                    </div>

                    <div className="text-left sm:text-right bg-slate-100 p-4 rounded-xl border border-slate-300">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Número da Ordem</p>
                        <p className="text-xl font-black text-slate-950 font-mono mt-0.5">
                            {pedido.numeroPedido}
                            {selectedSupplier && distinctSuppliers.length > 1
                                ? `-${String.fromCharCode(65 + distinctSuppliers.indexOf(selectedSupplier))}`
                                : ""}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-600 mt-1">
                            Emissão: {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                    </div>
                </div>

                {/* DADOS DA EMPRESA & FORNECEDOR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Empresa Compradora */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Building2 className="w-4 h-4 text-slate-700" />
                            <h2 className="font-black text-slate-900 uppercase">Empresa Compradora</h2>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{pedido.tenantNome}</p>
                            <p className="text-slate-600 mt-0.5">
                                <span className="font-semibold">Centro de Custo:</span> {pedido.centroCustoNome}
                            </p>
                            <p className="text-slate-600">
                                <span className="font-semibold">Conta Orçamentária:</span> {pedido.categoriaNome}
                            </p>
                            <p className="text-slate-600 mt-1">
                                <span className="font-semibold">Local de Entrega:</span> {pedido.enderecoEntrega || "Conforme cadastro do posto"}
                            </p>
                        </div>
                    </div>

                    {/* Fornecedor Vencedor */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <h2 className="font-black text-slate-900 uppercase">Fornecedor Contratado</h2>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{fornecedorNomeExibicao}</p>
                            {fornecedorCnpjExibicao && (
                                <p className="text-slate-600 mt-0.5">
                                    <span className="font-semibold">CNPJ:</span> {fornecedorCnpjExibicao}
                                </p>
                            )}
                            {fornecedorEmailExibicao && (
                                <p className="text-slate-600">
                                    <span className="font-semibold">E-mail:</span> {fornecedorEmailExibicao}
                                </p>
                            )}
                            {fornecedorTelefoneExibicao && (
                                <p className="text-slate-600">
                                    <span className="font-semibold">Telefone:</span> {fornecedorTelefoneExibicao}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* TABELA DE PRODUTOS/ITENS */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Itens Autorizados para Faturamento & Entrega ({displayItens.length})
                        </h2>
                    </div>

                    <div className="border border-slate-300 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase border-b border-slate-300">
                                <tr>
                                    <th className="py-2.5 px-4 w-12 text-center">Item</th>
                                    <th className="py-2.5 px-4">Descrição do Produto / Material</th>
                                    {!selectedSupplier && distinctSuppliers.length > 1 && (
                                        <th className="py-2.5 px-4">Fornecedor</th>
                                    )}
                                    <th className="py-2.5 px-4 text-center">Qtd</th>
                                    <th className="py-2.5 px-4 text-center">Unid</th>
                                    <th className="py-2.5 px-4 text-right">Valor Unitário</th>
                                    <th className="py-2.5 px-4 text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                                {displayItens.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="py-3 px-4 text-center font-bold text-slate-500">
                                            {String(idx + 1).padStart(2, "0")}
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-slate-950">{item.descricao}</p>
                                            {item.especificacao && (
                                                <p className="text-[11px] text-slate-500 mt-0.5">{item.especificacao}</p>
                                            )}
                                        </td>
                                        {!selectedSupplier && distinctSuppliers.length > 1 && (
                                            <td className="py-3 px-4 font-semibold text-indigo-900">
                                                {item.fornecedor || "N/A"}
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-center font-bold text-slate-950">
                                            {item.quantidade}
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600">
                                            {item.unidade}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            {(Number(item.precoUnitario) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-slate-950">
                                            {(Number(item.precoTotal) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                <tr>
                                    <td
                                        colSpan={!selectedSupplier && distinctSuppliers.length > 1 ? 6 : 5}
                                        className="py-4 px-4 text-right font-black text-sm uppercase text-slate-700"
                                    >
                                        Valor Total da Ordem de Compra:
                                    </td>
                                    <td className="py-4 px-4 text-right font-black text-lg text-slate-950">
                                        {valorTotalExibicao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* CONDIÇÕES COMERCIAIS & FATURAMENTO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <p className="font-black text-slate-900 uppercase">Condições de Pagamento</p>
                        <p className="text-slate-800">
                            <span className="font-bold">Forma:</span> {condicoesPagamentoExibicao || "Boleto 28 DDL"}
                        </p>
                        {pedido.dataVencimentoSugerida && (
                            <p className="text-slate-800">
                                <span className="font-bold">Data de Vencimento:</span>{" "}
                                {new Date(pedido.dataVencimentoSugerida).toLocaleDateString("pt-BR")}
                            </p>
                        )}
                        <p className="text-slate-600 text-[11px] mt-1">
                            * Não serão aceitos boletos com vencimento divergente do acordado nesta ordem.
                        </p>
                    </div>

                    {/* INSTRUÇÕES OBRIGATÓRIAS DE ENVIO DA NF */}
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 text-xs space-y-1.5 text-amber-950">
                        <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-amber-800" />
                            <p className="font-black uppercase">Instruções Obrigatórias para Envio da Nota Fiscal</p>
                        </div>
                        <p>
                            A Nota Fiscal eletrônica (DANFE) e o arquivo XML devem ser enviados obrigatoriamente para o e-mail:
                        </p>
                        <p className="font-mono font-black text-sm bg-amber-100/80 px-2 py-1 rounded border border-amber-200 inline-block">
                            {pedido.emailEnvioNf || "financeiro@grupofacilities.com.br"}
                        </p>
                        <p className="text-[11px] text-amber-900 mt-1">
                            É indispensável citar no corpo do e-mail e nas Informações Complementares da NF:
                            <br />
                            <strong>Ordem de Compra: {pedido.numeroPedido}</strong> | <strong>Centro de Custo: {pedido.centroCustoNome}</strong>
                        </p>
                    </div>
                </div>

                {/* DESTINAÇÃO / JUSTIFICATIVA */}
                <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 uppercase">Destinação / Finalidade da Compra:</span>{" "}
                    {pedido.justificativa}
                </div>

                {/* ÁREA DE ASSINATURAS E APROVAÇÃO */}
                <div className="pt-8 border-t-2 border-slate-300">
                    <div className="grid grid-cols-3 gap-6 text-center text-xs">
                        <div className="space-y-1">
                            <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                                <span className="font-bold text-slate-900">{pedido.solicitante.nome}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Solicitante</p>
                        </div>

                        <div className="space-y-1">
                            <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                                <span className="font-bold text-slate-900">
                                    {pedido.comprador?.nome || "Setor de Suprimentos"}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Comprador / Suprimentos</p>
                        </div>

                        <div className="space-y-1">
                            <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                                <span className="font-bold text-emerald-800 flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {pedido.aprovador?.nome || "Gestor Aprovador"}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-black">
                                Aprovado em {pedido.dataAprovacao ? new Date(pedido.dataAprovacao).toLocaleDateString("pt-BR") : "Data de Aprovação"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
