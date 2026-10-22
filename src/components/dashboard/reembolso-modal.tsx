"use client"

import { useState, useEffect } from "react"
import { Receipt, Plus, Loader2, ArrowRight, FileUp, CheckCircle, Trash2, X, ChevronLeft, Building2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { compressImageIfNeeded } from "@/lib/image-compress"
import { MobileNav } from "./mobile-nav"

export interface ReembolsoModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    user: any
    logoUrl?: string
}

export function ReembolsoModal({ isOpen, onClose, onSuccess, user, logoUrl }: ReembolsoModalProps) {
    const [descricao, setDescricao] = useState("")
    const [anexos, setAnexos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [itens, setItens] = useState<any[]>([])
    const [categorias, setCategorias] = useState<string[]>([])
    const [empresas, setEmpresas] = useState<any[]>([])
    const [empresaId, setEmpresaId] = useState("")
    const [chavePix, setChavePix] = useState(user?.chavePix || "")
    
    // Opções sincronizadas do Conta Azul
    const [categoriasContaAzul, setCategoriasContaAzul] = useState<any[]>([])
    const [centrosCusto, setCentrosCusto] = useState<any[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)

    // Inputs temporários para o novo item
    const [itemCategoriaId, setItemCategoriaId] = useState("")
    const [itemCategoriaNome, setItemCategoriaNome] = useState("")
    const [itemCentroCustoId, setItemCentroCustoId] = useState("")
    const [itemCentroCustoNome, setItemCentroCustoNome] = useState("")
    const [itemDescricao, setItemDescricao] = useState("")
    const [itemData, setItemData] = useState("")
    const [itemQuantidade, setItemQuantidade] = useState("1")
    const [itemValorUnitario, setItemValorUnitario] = useState("")

    useEffect(() => {
        if (!isOpen) return
        setDescricao("")
        setAnexos([])
        setItens([])
        setItemCategoriaId("")
        setItemCategoriaNome("")
        setItemCentroCustoId("")
        setItemCentroCustoNome("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        if (user?.chavePix) {
            setChavePix(user.chavePix)
        } else {
            fetch("/api/user/profile")
                .then(res => res.json())
                .then(data => {
                    if (data?.chavePix) setChavePix(data.chavePix)
                })
                .catch(() => {})
        }
        
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

        fetch("/api/admin/empresas")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const ativas = data.filter((e: any) => e.ativo)
                    setEmpresas(ativas)
                    if (ativas.length > 0) setEmpresaId(ativas[0].id)
                }
            })
            .catch(() => {})
    }, [isOpen, user?.chavePix])

    // Carregar opções do Conta Azul quando a empresa selecionada mudar
    useEffect(() => {
        if (!empresaId) return
        setLoadingOptions(true)
        fetch(`/api/contaazul/options?empresaId=${empresaId}`)
            .then(res => res.json())
            .then(data => {
                if (data.categorias && Array.isArray(data.categorias)) {
                    setCategoriasContaAzul(data.categorias)
                }
                if (data.centrosCusto && Array.isArray(data.centrosCusto)) {
                    setCentrosCusto(data.centrosCusto)
                }
            })
            .catch(err => console.error("Erro ao carregar opções do Conta Azul:", err))
            .finally(() => setLoadingOptions(false))
    }, [empresaId])

    const handleAddItem = () => {
        const catFinal = (itemCategoriaNome || "").trim()
        if (!catFinal || !itemDescricao.trim() || !itemData || !itemQuantidade || !itemValorUnitario) {
            toast.error("Por favor, preencha todos os campos obrigatórios do item (Categoria, Pra que foi gasto, Data, Quantidade e Valor).")
            return
        }

        const qty = parseInt(itemQuantidade)
        const valUnit = parseFloat(itemValorUnitario)

        if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
            toast.error("Quantidade e valor unitário do item devem ser maiores que zero.")
            return
        }

        const newItem = {
            categoria: catFinal,
            categoriaId: itemCategoriaId || null,
            centroCustoId: itemCentroCustoId || null,
            centroCustoNome: itemCentroCustoNome || null,
            descricao: itemDescricao.trim(),
            data: itemData,
            quantidade: qty,
            valorUnitario: valUnit,
            valorTotal: Math.round(qty * valUnit * 100) / 100
        }

        setItens([...itens, newItem])
        
        setItemCategoriaId("")
        setItemCategoriaNome("")
        setItemCentroCustoId("")
        setItemCentroCustoNome("")
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const compressedFile = await compressImageIfNeeded(file)
            const formData = new FormData()
            formData.append("file", compressedFile)

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (!res.ok) {
                throw new Error("Erro ao enviar arquivo")
            }

            const data = await res.json()
            setAnexos([...anexos, {
                url: data.url,
                nomeOriginal: data.nomeOriginal,
                tamanho: data.tamanho,
                tipo: data.tipo,
                valor: 0
            }])
            toast.success("Comprovante anexado com sucesso!")
        } catch (error: any) {
            toast.error(error.message || "Erro no upload do arquivo")
        } finally {
            setUploading(false)
            if (e.target) {
                e.target.value = ""
            }
        }
    }

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!empresaId) {
            toast.error("Por favor, selecione a Empresa do Grupo.")
            return
        }

        if (!chavePix.trim()) {
            toast.error("A Chave PIX é obrigatória para cadastrar o reembolso.")
            return
        }

        if (!descricao) {
            toast.error("Por favor, preencha a finalidade geral da solicitação.")
            return
        }

        if (itens.length === 0) {
            toast.error("É necessário adicionar pelo menos um item à despesa.")
            return
        }

        if (anexos.length === 0) {
            toast.error("Para solicitações de Reembolso, é obrigatório anexar pelo menos um comprovante.")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "REEMBOLSO",
                    descricao,
                    empresaId,
                    chavePix: chavePix.trim(),
                    valorSolicitado: Math.round(totalDespesa * 100) / 100,
                    itens,
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
                    ? "Solicitação de reembolso enviada para aprovação!"
                    : "Rascunho de reembolso salvo com sucesso!"
            )
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent showCloseButton={false} className="fixed inset-0! sm:inset-auto! top-0! left-0! translate-x-0! translate-y-0! sm:top-1/2! sm:left-1/2! sm:-translate-x-1/2! sm:-translate-y-1/2! w-full! max-w-full! sm:max-w-4xl! h-full! sm:h-[80vh]! flex flex-col gap-0 rounded-none! sm:rounded-3xl! p-0 bg-white border-none! sm:border sm:border-slate-200 overflow-hidden shadow-2xl transition-all duration-300">
                <div className="relative p-5 pt-4 sm:p-8 pb-4 bg-slate-950 sm:bg-white text-white sm:text-slate-900 border-b border-emerald-500/20 sm:border-slate-100 flex-none flex flex-col gap-3 overflow-hidden">
                    {/* Glows for App View */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -z-10 sm:hidden" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl -z-10 sm:hidden" />

                    {/* Top control bar on mobile: Back button and Menu button */}
                    <div className="flex sm:hidden items-center justify-between w-full z-10">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-10 w-10 text-white rounded-xl bg-white/10 border border-white/5 hover:bg-white/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                            </Button>
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="h-8 w-auto object-contain rounded-lg ml-1"
                                />
                            )}
                        </div>
                        {user && (
                            <MobileNav 
                                user={user} 
                                logoUrl={logoUrl || undefined}
                            />
                        )}
                    </div>

                    {/* Desktop control bar (hidden on mobile) */}
                    <div className="hidden sm:flex items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-10 w-10 text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active:scale-95 transition-all shrink-0"
                        >
                            <X className="h-5 w-5 stroke-[2.5]" />
                        </Button>
                    </div>
                    
                    <div className="space-y-1 mt-1 sm:mt-0 z-10">
                        <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white sm:text-slate-900">
                            <Receipt className="h-6 w-6 text-emerald-400 sm:text-indigo-500 shrink-0" />
                            Nova Solicitação de Reembolso
                        </DialogTitle>
                        <DialogDescription className="text-emerald-500/60 sm:text-slate-400 text-xs sm:text-sm font-medium">
                            Use essa modalidade se você já efetuou o gasto com recursos próprios e necessita do reembolso da empresa.
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
                    {/* Empresa do Grupo */}
                    <div className="space-y-1.5">
                        <Label htmlFor="empresa-reemb" className="text-xs font-semibold text-slate-500 ml-1 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-sky-600" />
                            Empresa do Grupo *
                        </Label>
                        <select
                            id="empresa-reemb"
                            value={empresaId}
                            onChange={(e) => setEmpresaId(e.target.value)}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-sm focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                        >
                            <option value="">Selecione a empresa...</option>
                            {empresas.map((emp: any) => (
                                <option key={emp.id} value={emp.id}>{emp.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Chave PIX Obrigatória */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="pix-reemb" className="text-xs font-semibold text-slate-500 ml-1 flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                Chave PIX para Recebimento *
                            </Label>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Obrigatório p/ Conta Azul
                            </span>
                        </div>
                        <Input
                            id="pix-reemb"
                            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória..."
                            value={chavePix}
                            onChange={(e) => setChavePix(e.target.value)}
                            className="h-11 rounded-xl bg-white border-slate-200 text-sm font-semibold focus:border-indigo-500 focus:ring-indigo-500/10"
                        />
                        <p className="text-[10px] text-slate-400 ml-1">
                            A chave PIX é obrigatória e constará na observação do contas a pagar gerado no ERP Conta Azul.
                        </p>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="desc-reemb" className="text-xs font-semibold text-slate-500 ml-1">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="desc-reemb"
                            placeholder="Descreva o propósito geral da despesa (ex: Viagem corporativa para Londrina - Visita técnica...)"
                            rows={2}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors text-sm"
                        />
                    </div>

                    {/* Detalhamento dos Itens */}
                    <div className="pt-4 border-t border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-indigo-500 rounded-full" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Itens / Lançamentos da Despesa</h3>
                                    <p className="text-[11px] text-slate-400">Classifique cada lançamento por categoria e centro de custo do Conta Azul</p>
                                </div>
                            </div>
                            {loadingOptions && (
                                <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Atualizando opções...
                                </span>
                            )}
                        </div>

                        {/* Form para adicionar item */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Adicionar Novo Lançamento</p>
                                <span className="text-[10px] text-slate-400 font-medium">Rateio detalhado no Conta Azul</span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                {/* Categoria / Conta Conta Azul */}
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Conta / Categoria Conta Azul *</Label>
                                    <select
                                        value={itemCategoriaId}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setItemCategoriaId(val)
                                            const found = categoriasContaAzul.find(c => c.id === val)
                                            setItemCategoriaNome(found ? found.nome : val)
                                        }}
                                        className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-indigo-500 focus:border-indigo-500 truncate"
                                    >
                                        <option value="">Selecione a categoria (Ex: Combustível, Diária, EPI...)</option>
                                        {categoriasContaAzul.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Centro de Custo */}
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Centro de Custo</Label>
                                    <select
                                        value={itemCentroCustoId}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setItemCentroCustoId(val)
                                            const found = centrosCusto.find(cc => cc.id === val)
                                            setItemCentroCustoNome(found ? found.nome : "")
                                        }}
                                        className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-indigo-500 focus:border-indigo-500 truncate"
                                    >
                                        <option value="">Selecione o centro de custo (opcional)...</option>
                                        {centrosCusto.map(cc => (
                                            <option key={cc.id} value={cc.id}>
                                                {cc.codigo ? `${cc.codigo} - ${cc.nome}` : cc.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Descrição do Item / Pra que foi gasto */}
                                <div className="col-span-1 sm:col-span-2 md:col-span-2 space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Pra que foi gasto / Justificativa *</Label>
                                    <Input
                                        placeholder="Ex: Abastecimento caminhão, compra de luvas e botas EPI..."
                                        value={itemDescricao}
                                        onChange={(e) => setItemDescricao(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs font-medium"
                                    />
                                </div>

                                {/* Data */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Data do Evento *</Label>
                                    <Input
                                        type="date"
                                        value={itemData}
                                        onChange={(e) => setItemData(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                                    />
                                </div>

                                {/* Quantidade */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Quantidade *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={itemQuantidade}
                                        onChange={(e) => setItemQuantidade(e.target.value)}
                                        className="h-11 rounded-xl bg-white border-slate-200 text-xs font-semibold"
                                    />
                                </div>

                                {/* Valor Unitario */}
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700 ml-1">Valor Unitário (R$) *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            value={itemValorUnitario}
                                            onChange={(e) => setItemValorUnitario(e.target.value)}
                                            className="pl-9 h-11 rounded-xl bg-white border-slate-200 text-xs font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="h-11 px-6 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
                                >
                                    <Plus className="h-4 w-4" /> Adicionar Lançamento
                                </Button>
                            </div>
                        </div>

                        {/* Lista de itens inseridos */}
                        {itens.length > 0 ? (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                <th className="py-2.5 px-3">Conta / Categoria</th>
                                                <th className="py-2.5 px-3">Centro de Custo</th>
                                                <th className="py-2.5 px-3">Pra que foi gasto</th>
                                                <th className="py-2.5 px-3">Data</th>
                                                <th className="py-2.5 px-3 text-center">Qtd.</th>
                                                <th className="py-2.5 px-3 text-right">Unitário</th>
                                                <th className="py-2.5 px-3 text-right">Total</th>
                                                <th className="py-2.5 px-3 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itens.map((item, idx) => (
                                                <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50 text-xs font-semibold text-slate-600">
                                                    <td className="py-3 px-3 font-bold text-slate-900">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 max-w-[180px] truncate" title={item.categoria}>
                                                            {item.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {item.centroCustoNome ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 max-w-[150px] truncate" title={item.centroCustoNome}>
                                                                {item.centroCustoNome}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 italic">Padrão</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 max-w-[160px] truncate font-medium text-slate-700" title={item.descricao}>{item.descricao}</td>
                                                    <td className="py-3 px-3 whitespace-nowrap">{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                                                    <td className="py-3 px-3 text-center font-bold">{item.quantidade}</td>
                                                    <td className="py-3 px-3 text-right font-medium">{formatCurrency(item.valorUnitario)}</td>
                                                    <td className="py-3 px-3 text-right font-black text-slate-900">{formatCurrency(item.valorTotal)}</td>
                                                    <td className="py-3 px-3 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg active:scale-95 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="bg-slate-50 p-3.5 border-t flex justify-between items-center text-xs font-black text-slate-800 uppercase tracking-wider">
                                    <span>Total da Solicitação ({itens.length} lançamento{itens.length > 1 ? 's' : ''}):</span>
                                    <span className="text-base text-indigo-600 font-black">{formatCurrency(totalDespesa)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="border-dashed border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/30 text-center">
                                <Receipt className="h-9 w-9 text-slate-300 mb-2 animate-pulse" />
                                <p className="text-xs font-bold text-slate-500">Nenhum lançamento adicionado ainda.</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Preencha os campos acima e clique em 'Adicionar Lançamento'.</p>
                            </div>
                        )}
                    </div>

                    {/* Comprovantes */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                                <Label className="font-bold text-slate-700 text-xs sm:text-sm">
                                    Comprovantes & Notas Fiscais *
                                </Label>
                                <p className="text-[11px] text-slate-400">Anexe PDFs ou Imagens legíveis comprovando os gastos.</p>
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <input
                                    type="file"
                                    id="reembolso-file-upload"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploading}
                                    onClick={() => document.getElementById("reembolso-file-upload")?.click()}
                                    className="w-full sm:w-auto h-12 px-5 rounded-xl font-bold text-xs gap-2 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border-slate-200"
                                >
                                    {uploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileUp className="h-4 w-4 text-indigo-500" />
                                    )}
                                    Anexar Nota/Recibo
                                </Button>
                            </div>
                        </div>

                         {anexos.length > 0 ? (
                            <div className="grid gap-2.5 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-100">
                                {anexos.map((file, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-xl shadow-sm border border-slate-100 font-semibold text-slate-600">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                                                <CheckCircle className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{file.nomeOriginal}</p>
                                                <p className="text-[10px] text-slate-400">{(file.tamanho / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:flex-none sm:w-32">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    placeholder="Valor do Recibo"
                                                    value={file.valor || ""}
                                                    onChange={(e) => {
                                                        const updated = [...anexos]
                                                        updated[idx].valor = parseFloat(e.target.value) || 0
                                                        setAnexos(updated)
                                                    }}
                                                    className="pl-7 h-9 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white border-slate-200"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[11px]"
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t border-slate-200/60 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px]">
                                    <div className="font-bold text-slate-700 uppercase tracking-wider">
                                        Soma dos Comprovantes: <span className="text-slate-900 font-black text-xs ml-1">{formatCurrency(anexos.reduce((acc, f) => acc + (f.valor || 0), 0))}</span>
                                    </div>
                                    
                                    {(() => {
                                        const totalEvid = anexos.reduce((acc, f) => acc + (f.valor || 0), 0)
                                        const diff = Math.abs(totalEvid - totalDespesa)
                                        if (diff < 0.01) {
                                            return (
                                                <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-lg border border-green-200 text-[9px] uppercase tracking-wider">
                                                    ✅ Bate com itens!
                                                </span>
                                            )
                                        } else {
                                            return (
                                                <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200 text-[9px] uppercase tracking-wider">
                                                    ⚠️ Divergência: {formatCurrency(diff)}
                                                </span>
                                            )
                                        }
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="border-dashed border-2 border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50">
                                <FileUp className="h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-[11px] font-medium text-slate-400">É obrigatório anexar os comprovantes fiscais dos itens lançados.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-5 sm:p-8 pt-4 border-t border-slate-100 gap-3 bg-slate-50/50 flex-none flex flex-col sm:flex-row">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-sm border-slate-200 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Salvar Rascunho
                    </Button>
                    <Button
                        type="button"
                        disabled={loading || uploading}
                        onClick={() => handleSubmit(true)}
                        className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-bold text-sm gap-2 active:scale-95 transition-all group cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                            <>
                                <span>Enviar para Aprovação</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
