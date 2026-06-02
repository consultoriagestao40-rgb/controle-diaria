"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Receipt, DollarSign, ArrowRight, Loader2, FileUp, Sparkles, CheckCircle, Plus, Trash2, Calendar, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function NovaDespesaPage() {
    const router = useRouter()
    const [tipo, setTipo] = useState<"REEMBOLSO" | "ADIANTAMENTO">("REEMBOLSO")
    const [descricao, setDescricao] = useState("")
    const [anexos, setAnexos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Itemized list states
    const [itens, setItens] = useState<any[]>([])
    const [categorias, setCategorias] = useState<string[]>([])
    
    // Temporary inputs for new item
    const [itemCategoria, setItemCategoria] = useState("")
    const [itemDescricao, setItemDescricao] = useState("")
    const [itemData, setItemData] = useState("")
    const [itemQuantidade, setItemQuantidade] = useState("1")
    const [itemValorUnitario, setItemValorUnitario] = useState("")

    // Temporary inputs for Adiantamento
    const [valorAdiantamento, setValorAdiantamento] = useState("")
    const [dataAdiantamento, setDataAdiantamento] = useState("")

    useEffect(() => {
        fetch("/api/politicas")
            .then(res => res.json())
            .then(data => {
                if (data.politicas && Array.isArray(data.politicas)) {
                    setCategorias(data.politicas.map((p: any) => p.categoria))
                } else {
                    setCategorias(["REFEICAO", "HOSPEDAGEM", "TRANSPORTE", "OUTROS"])
                }
            })
            .catch(() => {
                setCategorias(["REFEICAO", "HOSPEDAGEM", "TRANSPORTE", "OUTROS"])
            })
    }, [])

    const handleAddItem = () => {
        if (!itemCategoria || !itemDescricao || !itemData || !itemQuantidade || !itemValorUnitario) {
            toast.error("Por favor, preencha todos os campos do item.")
            return
        }

        const qty = parseInt(itemQuantidade)
        const valUnit = parseFloat(itemValorUnitario)

        if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
            toast.error("Quantidade e valor unitário do item devem ser maiores que zero.")
            return
        }

        const newItem = {
            categoria: itemCategoria,
            descricao: itemDescricao,
            data: itemData,
            quantidade: qty,
            valorUnitario: valUnit,
            valorTotal: qty * valUnit
        }

        setItens([...itens, newItem])
        
        // Reset item temporary fields
        setItemCategoria("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        
        toast.success("Item adicionado com sucesso!")
    }

    const handleRemoveItem = (idx: number) => {
        setItens(itens.filter((_, i) => i !== idx))
        toast.success("Item removido.")
    }

    const totalDespesa = itens.reduce((acc, item) => acc + item.valorTotal, 0)

    // Simulador de Upload de Comprovantes
    const handleFileSimulate = () => {
        setUploading(true)
        setTimeout(() => {
            const mockFile = {
                url: `/mock/comprovante_${Math.floor(Math.random() * 1000)}.pdf`,
                nomeOriginal: `nota_fiscal_${Date.now().toString().slice(-4)}.pdf`,
                tamanho: 1024 * Math.floor(Math.random() * 500 + 100),
                tipo: "application/pdf"
            }
            setAnexos([...anexos, mockFile])
            setUploading(false)
            toast.success("Comprovante anexado com sucesso!")
        }, 1500)
    }

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!descricao) {
            toast.error("Por favor, preencha a finalidade geral da solicitação.")
            return
        }

        if (tipo === "REEMBOLSO" && itens.length === 0) {
            toast.error("É necessário adicionar pelo menos um item à despesa.")
            return
        }

        if (tipo === "REEMBOLSO" && anexos.length === 0) {
            toast.error("Para solicitações de Reembolso, é obrigatório anexar pelo menos um comprovante.")
            return
        }

        if (tipo === "ADIANTAMENTO") {
            if (!dataAdiantamento) {
                toast.error("Por favor, selecione a data prevista da viagem/operação.")
                return
            }
            const val = parseFloat(valorAdiantamento)
            if (isNaN(val) || val <= 0) {
                toast.error("Por favor, insira um valor total previsto maior que zero.")
                return
            }
        }

        setLoading(true)

        try {
            const roundedValorAdiantamento = Math.round(parseFloat(valorAdiantamento) * 100) / 100
            const finalItens = tipo === "ADIANTAMENTO" ? [{
                categoria: "VIAGEM",
                descricao: descricao,
                data: dataAdiantamento,
                quantidade: 1,
                valorUnitario: roundedValorAdiantamento,
                valorTotal: roundedValorAdiantamento
            }] : itens

            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo,
                    descricao,
                    valorSolicitado: tipo === "ADIANTAMENTO" ? roundedValorAdiantamento : Math.round(totalDespesa * 100) / 100,
                    itens: finalItens,
                    anexos,
                    enviarParaAprovacao
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao criar solicitação")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Solicitação enviada para aprovação!"
                    : "Rascunho salvo com sucesso!"
            )
            router.push("/dashboard/despesas")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10 pb-32 max-w-4xl mx-auto pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                        Solicitar <span className="text-primary italic">Reembolso ou Adiantamento</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                        Preencha os dados e anexe os comprovantes necessários
                    </p>
                </div>
                <Link
                    href="/dashboard/despesas/politicas"
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-primary transition-colors bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl border border-slate-200"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Ver Políticas Corporativas
                </Link>
            </div>

            {/* Toggle Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => {
                        setTipo("REEMBOLSO")
                        setAnexos([])
                    }}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                        tipo === "REEMBOLSO"
                            ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.01]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                    <div className={`p-3 rounded-xl transition-colors ${
                        tipo === "REEMBOLSO" ? "bg-white/10 text-primary" : "bg-slate-100 text-slate-600"
                    }`}>
                        <Receipt className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-sm sm:text-base uppercase tracking-wide">Reembolso</p>
                        <p className={`text-xs leading-relaxed ${tipo === "REEMBOLSO" ? "text-slate-400" : "text-slate-500"}`}>
                            Para despesas já pagas com seu próprio dinheiro. Requer anexo de cupom ou nota fiscal.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setTipo("ADIANTAMENTO")
                        setAnexos([])
                    }}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                        tipo === "ADIANTAMENTO"
                            ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.01]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                    <div className={`p-3 rounded-xl transition-colors ${
                        tipo === "ADIANTAMENTO" ? "bg-white/10 text-primary" : "bg-slate-100 text-slate-600"
                    }`}>
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-sm sm:text-base uppercase tracking-wide">Adiantamento</p>
                        <p className={`text-xs leading-relaxed ${tipo === "ADIANTAMENTO" ? "text-slate-400" : "text-slate-500"}`}>
                            Solicitação de fundos antes de realizar a despesa. Exige prestação de contas depois.
                        </p>
                    </div>
                </button>
            </div>

            <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 sm:p-8">
                    <CardTitle className="text-xl font-black text-slate-900">
                        {tipo === "REEMBOLSO" ? "Dados do Reembolso" : "Dados do Adiantamento"}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm">
                        {tipo === "REEMBOLSO"
                            ? "Use essa modalidade se você já efetuou o gasto com recursos próprios e necessita do reembolso da empresa."
                            : "Use essa modalidade para prever um gasto corporativo e receber o valor adiantado (sujeito a prestação de contas posterior)."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="descricao" className="font-bold text-slate-700">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="descricao"
                            placeholder="Descreva o propósito geral da despesa (ex: Viagem corporativa para Londrina - Visita técnica a postos de combustível...)"
                            rows={2}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/10 transition-colors"
                        />
                    </div>

                    {/* Detalhamento dos Itens (Apenas para Reembolso) */}
                    {tipo === "REEMBOLSO" && (
                        <div className="pt-6 border-t border-slate-100 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-primary rounded-full" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Itens / Lançamentos da Despesa</h3>
                            </div>

                            {/* Form para adicionar item */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adicionar Novo Lançamento</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {/* Categoria */}
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-600">Categoria *</Label>
                                        <select
                                            value={itemCategoria}
                                            onChange={(e) => setItemCategoria(e.target.value)}
                                            className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">Selecione...</option>
                                            {categorias.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Data */}
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-600">Data do Evento *</Label>
                                        <Input
                                            type="date"
                                            value={itemData}
                                            onChange={(e) => setItemData(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                                        />
                                    </div>

                                    {/* Quantidade */}
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-600">Quantidade *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={itemQuantidade}
                                            onChange={(e) => setItemQuantidade(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                        />
                                    </div>

                                    {/* Valor Unitario */}
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-600">Valor Unitário (R$) *</Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0,00"
                                                value={itemValorUnitario}
                                                onChange={(e) => setItemValorUnitario(e.target.value)}
                                                className="pl-9 h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Descrição do Item */}
                                    <div className="col-span-1 sm:col-span-2 md:col-span-2 space-y-1">
                                        <Label className="text-xs font-bold text-slate-600">Descrição / Justificativa *</Label>
                                        <Input
                                            placeholder="Ex: Hospedagem Hotel Londrina ou Almoço com cliente"
                                            value={itemDescricao}
                                            onChange={(e) => setItemDescricao(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="h-11 px-5 bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <Plus className="h-4 w-4" /> Adicionar Item
                                    </Button>
                                </div>
                            </div>

                            {/* Lista de itens inseridos */}
                            {itens.length > 0 ? (
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="py-3 px-4">Categoria</th>
                                                    <th className="py-3 px-4">Data</th>
                                                    <th className="py-3 px-4">Descrição</th>
                                                    <th className="py-3 px-4 text-center">Qtd.</th>
                                                    <th className="py-3 px-4 text-right">Unitário</th>
                                                    <th className="py-3 px-4 text-right">Total</th>
                                                    <th className="py-3 px-4 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itens.map((item, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50 text-xs font-semibold text-slate-600">
                                                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.categoria}</td>
                                                        <td className="py-3.5 px-4">{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                                                        <td className="py-3.5 px-4 max-w-[200px] truncate">{item.descricao}</td>
                                                        <td className="py-3.5 px-4 text-center font-bold">{item.quantidade}</td>
                                                        <td className="py-3.5 px-4 text-right font-medium">R$ {Number(item.valorUnitario).toFixed(2)}</td>
                                                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">R$ {Number(item.valorTotal).toFixed(2)}</td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveItem(idx)}
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg active:scale-95"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 border-t flex justify-between items-center text-sm font-black text-slate-800 uppercase tracking-wider">
                                        <span>Total da Solicitação:</span>
                                        <span className="text-lg text-primary font-black">R$ {totalDespesa.toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-dashed border-2 border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/30">
                                    <Receipt className="h-10 w-10 text-slate-300 mb-3 animate-pulse" />
                                    <p className="text-sm font-bold text-slate-400">Nenhum item adicionado à despesa ainda.</p>
                                    <p className="text-xs text-slate-400 mt-1">Preencha os dados e clique em 'Adicionar Item' para compor a solicitação.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Campos Simplificados (Apenas para Adiantamento) */}
                    {tipo === "ADIANTAMENTO" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                            {/* Data Prevista */}
                            <div className="space-y-2">
                                <Label htmlFor="dataAdiantamento" className="font-bold text-slate-700">Data Prevista da Viagem / Operação *</Label>
                                <Input
                                    id="dataAdiantamento"
                                    type="date"
                                    value={dataAdiantamento}
                                    onChange={(e) => setDataAdiantamento(e.target.value)}
                                    className="rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/10 transition-colors h-14 font-semibold text-slate-700 p-4"
                                />
                            </div>

                            {/* Valor Solicitado */}
                            <div className="space-y-2">
                                <Label htmlFor="valorAdiantamento" className="font-bold text-slate-700">Valor Total Previsto (R$) *</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
                                    <Input
                                        id="valorAdiantamento"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={valorAdiantamento}
                                        onChange={(e) => setValorAdiantamento(e.target.value)}
                                        className="pl-10 rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/10 transition-colors h-14 font-black text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comprovantes (Apenas para Reembolso na criação) */}
                    {tipo === "REEMBOLSO" && (
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1">
                                    <Label className="font-bold text-slate-700">
                                        Comprovantes & Notas Fiscais *
                                    </Label>
                                    <p className="text-xs text-slate-400">Anexe PDFs ou Imagens legíveis comprovando os gastos.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploading}
                                    onClick={handleFileSimulate}
                                    className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    {uploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileUp className="h-4 w-4 text-primary" />
                                    )}
                                    Anexar Nota/Recibo
                                </Button>
                            </div>

                             {anexos.length > 0 ? (
                                <div className="grid gap-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    {anexos.map((file, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                                                    <CheckCircle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{file.nomeOriginal}</p>
                                                    <p className="text-xs text-slate-400">{(file.tamanho / 1024).toFixed(0)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="relative flex-1 sm:flex-none sm:w-36">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Valor do Recibo"
                                                        value={file.valor || ""}
                                                        onChange={(e) => {
                                                            const updated = [...anexos]
                                                            updated[idx].valor = parseFloat(e.target.value) || 0
                                                            setAnexos(updated)
                                                        }}
                                                        className="pl-7 h-10 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    Remover
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="border-t border-slate-200/60 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                                        <div className="font-bold text-slate-700 uppercase tracking-wider">
                                            Soma das Evidências Anexadas: <span className="text-slate-900 font-black text-sm ml-1">R$ {anexos.reduce((acc, f) => acc + (f.valor || 0), 0).toFixed(2)}</span>
                                        </div>
                                        
                                        {(() => {
                                            const totalEvid = anexos.reduce((acc, f) => acc + (f.valor || 0), 0)
                                            const diff = Math.abs(totalEvid - totalDespesa)
                                            if (diff < 0.01) {
                                                return (
                                                    <span className="bg-green-100 text-green-800 font-bold px-3 py-1.5 rounded-lg border border-green-200 text-[10px] uppercase tracking-wider">
                                                        ✅ A soma dos comprovantes bate com os itens!
                                                    </span>
                                                )
                                            } else {
                                                return (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-lg border border-amber-200 text-[10px] uppercase tracking-wider">
                                                        ⚠️ Divergência: R$ {diff.toFixed(2)}
                                                    </span>
                                                )
                                            }
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="border-dashed border-2 border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/50">
                                    <FileUp className="h-10 w-10 text-slate-300 mb-3" />
                                    <p className="text-sm font-medium text-slate-400">É obrigatório anexar os comprovantes fiscais dos itens lançados.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ações de envio */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSubmit(false)}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    Salvar Rascunho
                </Button>
                <Button
                    type="button"
                    disabled={loading || uploading}
                    onClick={() => handleSubmit(true)}
                    className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-primary shadow-xl hover:shadow-primary/20 text-white font-black uppercase tracking-[0.2em] text-[11px] gap-2 active:scale-95 transition-all group"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <span>Enviar para Aprovação</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
