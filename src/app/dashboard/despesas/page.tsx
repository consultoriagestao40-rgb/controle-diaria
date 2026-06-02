"use client"

import { useState, useEffect } from "react"
import { Wallet, Plus, Loader2, AlertCircle, Calendar, Receipt, DollarSign, FileUp, CheckCircle, FileText, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { ReembolsoModal } from "@/components/dashboard/reembolso-modal"
import { AdiantamentoModal } from "@/components/dashboard/adiantamento-modal"
import { formatCurrency } from "@/lib/utils"

function formatDate(dateInput: any) {
    if (!dateInput) return ""
    try {
        let dateStr = String(dateInput)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            dateStr += "T00:00:00"
        }
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ""
        return d.toLocaleDateString('pt-BR')
    } catch {
        return ""
    }
}


interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    justificativaReprovacao?: string | null
    observacao?: string | null
    createdAt: string
    anexos: any[]
    itens?: any[]
}

export default function MinhasDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"TODAS" | "REEMBOLSO" | "ADIANTAMENTO">("TODAS")
    
    // Estados para o Modal de Prestação de Contas
    const [prestacaoModalOpen, setPrestacaoModalOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [valorComprovado, setValorComprovado] = useState("")
    const [anexosPrestacao, setAnexosPrestacao] = useState<any[]>([])
    const [submittingPrestacao, setSubmittingPrestacao] = useState(false)
    const [uploadingComprovante, setUploadingComprovante] = useState(false)

    // Estados para Modais de Lançamento
    const [isReembolsoOpen, setIsReembolsoOpen] = useState(false)
    const [isAdiantamentoOpen, setIsAdiantamentoOpen] = useState(false)
    const [user, setUser] = useState<any>(null)

    // Itemização da prestação de contas
    const [itensPrestacao, setItensPrestacao] = useState<any[]>([])
    const [categorias, setCategorias] = useState<string[]>([])
    const [userRole, setUserRole] = useState("")
    
    // Form temporário do item
    const [itemCategoria, setItemCategoria] = useState("")
    const [itemDescricao, setItemDescricao] = useState("")
    const [itemData, setItemData] = useState("")
    const [itemQuantidade, setItemQuantidade] = useState("1")
    const [itemValorUnitario, setItemValorUnitario] = useState("")

    useEffect(() => {
        fetchDespesas()
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

        fetch("/api/auth/session")
            .then(res => res.json())
            .then(session => {
                if (session?.user) {
                    setUser(session.user)
                    setUserRole(session.user.role)
                }
            })
            .catch(() => {})
    }, [])

    const fetchDespesas = async () => {
        try {
            const res = await fetch("/api/despesas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setDespesas(data)
        } catch {
            toast.error("Erro ao carregar despesas")
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const map: any = {
            'RASCUNHO': 'bg-slate-100 text-slate-700',
            'AGUARDANDO_APROVACAO': 'bg-yellow-100 text-yellow-800',
            'AGUARDANDO_APROVACAO_N1': 'bg-yellow-100 text-yellow-800',
            'AGUARDANDO_APROVACAO_N2': 'bg-yellow-100 text-yellow-800',
            'APROVADO': 'bg-green-100 text-green-800',
            'REPROVADO': 'bg-red-100 text-red-800',
            'PAGO': 'bg-teal-100 text-teal-800',
            'AGUARDANDO_PRESTACAO': 'bg-orange-100 text-orange-800',
            'AGUARDANDO_CONCILIACAO': 'bg-purple-100 text-purple-800',
            'CONCLUIDO': 'bg-blue-100 text-blue-800',
        }
        
        const labels: any = {
            'RASCUNHO': 'Rascunho',
            'AGUARDANDO_APROVACAO': 'Aguardando Aprovação',
            'AGUARDANDO_APROVACAO_N1': 'Aguardando Aprov. N1',
            'AGUARDANDO_APROVACAO_N2': 'Aguardando Aprov. N2',
            'APROVADO': 'Aprovado',
            'REPROVADO': 'Reprovado',
            'PAGO': 'Pago',
            'AGUARDANDO_PRESTACAO': 'Aguardando Prestação',
            'AGUARDANDO_CONCILIACAO': 'Aguardando Conciliação',
            'CONCLUIDO': 'Concluído',
        }

        return <Badge variant="outline" className={`${map[status] || 'bg-gray-100'} border-0 px-3 py-1 font-bold rounded-lg`}>{labels[status] || status}</Badge>
    }

    // Simulador de upload na prestação de contas
    const handleFileSimulate = () => {
        setUploadingComprovante(true)
        setTimeout(() => {
            const mockFile = {
                url: `/mock/comprovante_${Math.floor(Math.random() * 1000)}.pdf`,
                nomeOriginal: `recibo_prestacao_${Date.now().toString().slice(-4)}.pdf`,
                tamanho: 1024 * Math.floor(Math.random() * 400 + 100),
                tipo: "application/pdf"
            }
            setAnexosPrestacao([...anexosPrestacao, mockFile])
            setUploadingComprovante(false)
            toast.success("Comprovante fiscal anexado!")
        }, 1200)
    }

    const openPrestacaoModal = (despesa: Despesa) => {
        setSelectedDespesa(despesa)
        setValorComprovado("")
        
        // Carrega os itens e anexos já existentes na despesa, se houver
        const existingItens = despesa.itens ? despesa.itens.map((item: any) => {
            let itemDateStr = ""
            if (item.data) {
                const d = new Date(item.data)
                if (!isNaN(d.getTime())) {
                    itemDateStr = d.toISOString().split('T')[0]
                }
            }
            return {
                categoria: item.categoria,
                descricao: item.descricao,
                data: itemDateStr,
                quantidade: item.quantidade,
                valorUnitario: Number(item.valorUnitario),
                valorTotal: Number(item.valorTotal)
            }
        }) : []
        setItensPrestacao(existingItens)
        
        const existingAnexos = despesa.anexos ? despesa.anexos.map((anexo: any) => ({
            url: anexo.url,
            nomeOriginal: anexo.nomeOriginal,
            tamanho: anexo.tamanho,
            tipo: anexo.tipo,
            valor: Number(anexo.valor || 0)
        })) : []
        setAnexosPrestacao(existingAnexos)
        
        // Reset item fields
        setItemCategoria("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        
        setPrestacaoModalOpen(true)
    }

    const handleAddPrestacaoItem = () => {
        if (!itemCategoria || !itemDescricao || !itemData || !itemQuantidade || !itemValorUnitario) {
            toast.error("Por favor, preencha todos os campos do item.")
            return
        }

        const qty = parseInt(itemQuantidade)
        const valUnit = parseFloat(itemValorUnitario)

        if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
            toast.error("Quantidade e valor unitário inválidos.")
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

        setItensPrestacao([...itensPrestacao, newItem])
        
        // Reset item fields
        setItemCategoria("")
        setItemDescricao("")
        setItemData("")
        setItemQuantidade("1")
        setItemValorUnitario("")
        
        toast.success("Item adicionado!")
    }

    const handleRemovePrestacaoItem = (idx: number) => {
        setItensPrestacao(itensPrestacao.filter((_, i) => i !== idx))
        toast.success("Item removido.")
    }

    const totalComprovadoItens = itensPrestacao.reduce((acc, item) => acc + item.valorTotal, 0)

    const handlePrestarContasSubmit = async () => {
        if (!selectedDespesa) return

        if (itensPrestacao.length === 0) {
            toast.error("É necessário adicionar pelo menos um item comprovado.")
            return
        }

        if (anexosPrestacao.length === 0) {
            toast.error("É obrigatório anexar pelo menos um recibo/comprovante fiscal.")
            return
        }

        setSubmittingPrestacao(true)

        try {
            const res = await fetch(`/api/despesas/${selectedDespesa.id}/prestar-contas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    valorComprovado: totalComprovadoItens,
                    anexos: anexosPrestacao,
                    itens: itensPrestacao,
                    observacao: `Prestação de contas detalhada por item. Total comprovado: R$ ${totalComprovadoItens.toFixed(2)}`
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao prestar contas")
            }

            toast.success("Prestação de contas realizada com sucesso!")
            setPrestacaoModalOpen(false)
            fetchDespesas()
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar prestação de contas")
        } finally {
            setSubmittingPrestacao(false)
        }
    }

    const handleEnviarParaAprovacao = async (id: string) => {
        try {
            const res = await fetch(`/api/despesas/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enviarParaAprovacao: true })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao enviar solicitação")
            }

            toast.success("Solicitação enviada para aprovação!")
            fetchDespesas()
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar solicitação")
        }
    }

    const handleDeletarDespesa = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta solicitação em rascunho?")) return

        try {
            const res = await fetch(`/api/despesas/${id}`, {
                method: "DELETE"
            })

            if (!res.ok) {
                throw new Error("Erro ao excluir rascunho")
            }

            toast.success("Rascunho excluído com sucesso.")
            fetchDespesas()
        } catch (error: any) {
            toast.error(error.message || "Erro ao deletar")
        }
    }

    const filteredDespesas = despesas.filter((d) => {
        if (activeTab === "TODAS") return true
        return d.tipo === activeTab
    })

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto pt-4 relative">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                        Minhas <span className="text-primary italic">Despesas</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                        Acompanhe seus reembolsos e adiantamentos
                    </p>
                </div>
                {!loading && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <Link href="/dashboard/despesas/politicas" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto h-14 px-6 border-slate-200 hover:bg-slate-50 text-slate-700 transition-all rounded-2xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2">
                                <Settings className="h-4 w-4 text-slate-500" />
                                {userRole === "ADMIN" ? "Gerenciar Políticas" : "Ver Políticas"}
                            </Button>
                        </Link>
                        <Button 
                            onClick={() => setIsReembolsoOpen(true)}
                            className="w-full sm:w-auto h-14 px-6 bg-white hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 shadow-md transition-all rounded-2xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Receipt className="h-4 w-4 text-indigo-500" />
                            Novo Reembolso
                        </Button>
                        <Button 
                            onClick={() => setIsAdiantamentoOpen(true)}
                            className="w-full sm:w-auto h-14 px-6 bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white transition-all duration-300 rounded-2xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <DollarSign className="h-4 w-4 text-cyan-400" />
                            Novo Adiantamento
                        </Button>
                    </div>
                )}
            </div>

            {/* Abas com rolagem horizontal no mobile para evitar quebra/corte */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:max-w-md overflow-x-auto scrollbar-none flex-nowrap">
                {(["TODAS", "REEMBOLSO", "ADIANTAMENTO"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest whitespace-nowrap transition-all duration-300 ${
                            activeTab === tab
                                ? "bg-white text-slate-900 shadow-sm font-black"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/30"
                        }`}
                    >
                        {tab === "TODAS" ? "Todas" : tab === "REEMBOLSO" ? "Reembolsos" : "Adiantamentos"}
                    </button>
                ))}
            </div>

            {/* Listagem */}
            <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-6">
                        <div className="relative h-16 w-16">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Sincronizando despesas...</p>
                    </div>
                ) : filteredDespesas.length === 0 ? (
                    <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-80">
                        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <AlertCircle className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                            Nenhuma despesa localizada nesta categoria.
                        </div>
                        <Link href="/dashboard/despesas/nova" className="mt-6">
                            <Button variant="ghost" className="text-primary font-bold uppercase tracking-widest text-[10px]">Efetuar primeira solicitação</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {filteredDespesas.map((item) => (
                            <Card key={item.id} className="glass-card hover:scale-[1.005] transition-all duration-300 shadow-lg border-none bg-white">
                                <CardContent className="p-5 sm:p-8">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                        <div className="flex items-start sm:items-center gap-6">
                                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 border ${
                                                item.tipo === "REEMBOLSO"
                                                    ? "bg-rose-50 text-rose-500 border-rose-100"
                                                    : "bg-emerald-50 text-emerald-500 border-emerald-100"
                                            }`}>
                                                {item.tipo === "REEMBOLSO" ? (
                                                    <Receipt className="h-8 w-8" />
                                                ) : (
                                                    <DollarSign className="h-8 w-8" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                                        {item.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}
                                                    </span>
                                                    <div className="hidden sm:block h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        <span>{formatDate(item.createdAt)}</span>
                                                        <span>•</span>
                                                        <span>ID: {item.id.slice(0, 6)}</span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 text-sm font-semibold pt-1">{item.descricao}</p>
                                                
                                                {/* Valores adicionais de prestação */}
                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold pt-2">
                                                    <span className="text-slate-700">Solicitado: <span className="text-slate-900">{formatCurrency(item.valorSolicitado)}</span></span>
                                                    {item.valorComprovado !== null && (
                                                        <>
                                                            <div className="hidden sm:block h-3 w-[1px] bg-slate-200" />
                                                            <span className="text-indigo-600">Gasto Real: <span>{formatCurrency(item.valorComprovado)}</span></span>
                                                        </>
                                                    )}
                                                    {item.saldoFinal !== null && (
                                                        <>
                                                            <div className="hidden sm:block h-3 w-[1px] bg-slate-200" />
                                                            <span className={item.saldoFinal === 0 ? "text-green-600" : item.saldoFinal > 0 ? "text-amber-600" : "text-rose-600"}>
                                                                Saldo: {item.saldoFinal === 0 ? "Zerado" : item.saldoFinal > 0 ? `Devolver ${formatCurrency(item.saldoFinal)}` : `Receber ${formatCurrency(Math.abs(item.saldoFinal))}`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {item.justificativaReprovacao && (item.status === 'AGUARDANDO_PRESTACAO' || item.status === 'REPROVADO') && (
                                                    <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs font-bold mt-4 flex items-start gap-2 max-w-xl">
                                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                                        <div>
                                                            <p className="uppercase tracking-wider text-[9px] font-black text-red-500">Motivo da Devolução/Rejeição:</p>
                                                            <p className="font-semibold pt-0.5">{item.justificativaReprovacao}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">
                                            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:hidden">Status:</span>
                                                {getStatusBadge(item.status)}
                                            </div>
                                            
                                            {(item.status === 'RASCUNHO' || item.status === 'REPROVADO') && (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeletarDespesa(item.id)}
                                                        className="flex-1 sm:flex-none text-red-500 hover:text-red-700 hover:bg-red-50 font-bold uppercase tracking-widest text-[10px] h-10 px-3 rounded-xl active:scale-95 transition-all"
                                                    >
                                                        Excluir
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEnviarParaAprovacao(item.id)}
                                                        className="flex-1 sm:flex-none bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl shadow-md active:scale-95 transition-all"
                                                    >
                                                        Enviar
                                                    </Button>
                                                </div>
                                            )}

                                            {(item.status === 'AGUARDANDO_PRESTACAO' || (item.tipo === 'ADIANTAMENTO' && item.status === 'APROVADO')) && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openPrestacaoModal(item)}
                                                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl shadow-md active:scale-95 transition-all"
                                                >
                                                    Prestar Contas
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Prestação de Contas (Radix Dialog com Responsividade Extrema) */}
            <Dialog open={prestacaoModalOpen} onOpenChange={(val) => !val && setPrestacaoModalOpen(false)}>
                <DialogContent className="fixed bottom-0 sm:bottom-auto top-auto sm:top-1/2 left-0 sm:left-1/2 translate-x-0 sm:-translate-x-1/2 translate-y-0 sm:-translate-y-1/2 w-full sm:max-w-xl h-[92dvh] sm:h-auto sm:max-h-[90vh] flex flex-col gap-0 rounded-t-[2rem] rounded-b-none sm:rounded-3xl p-0 bg-white border border-slate-200 overflow-hidden shadow-2xl transition-all duration-300">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-1 sm:hidden flex-none" />
                    <DialogHeader className="p-5 pt-2 sm:p-8 pb-4 border-b border-slate-100 flex-none">
                        <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                            <FileText className="h-6 w-6 text-orange-500" />
                            Prestação de Contas
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs sm:text-sm font-medium pt-0.5">
                            Adiantamento ID: {selectedDespesa?.id.slice(0, 6)}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
                        {selectedDespesa && (
                            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-xs font-semibold text-orange-800 space-y-1">
                                <p>💵 **Valor Recebido Adiantado: {formatCurrency(selectedDespesa.valorSolicitado)}**</p>
                                <p>Preencha os itens realmente gastos e anexe as notas fiscais correspondentes. O sistema calculará o saldo credor ou devedor automaticamente.</p>
                            </div>
                        )}

                        {/* Itemização da Prestação */}
                        <div className="space-y-4">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-800">Lançamento de Gastos Reais</p>
                            
                            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    {/* Categoria */}
                                    <div className="col-span-2 sm:col-span-1 space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Categoria *</Label>
                                        <select
                                            value={itemCategoria}
                                            onChange={(e) => setItemCategoria(e.target.value)}
                                            className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Selecione...</option>
                                            {categorias.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Data */}
                                    <div className="col-span-2 sm:col-span-1 space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data do Evento *</Label>
                                        <Input
                                            type="date"
                                            value={itemData}
                                            onChange={(e) => setItemData(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs"
                                        />
                                    </div>

                                    {/* Quantidade */}
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qtd. *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={itemQuantidade}
                                            onChange={(e) => setItemQuantidade(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                        />
                                    </div>

                                    {/* Valor Unitario */}
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Valor Unit. *</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0,00"
                                                value={itemValorUnitario}
                                                onChange={(e) => setItemValorUnitario(e.target.value)}
                                                className="pl-8 h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Descrição do Item */}
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Descrição/Justificativa *</Label>
                                        <Input
                                            placeholder="Ex: Almoço com cliente ou Hotel"
                                            value={itemDescricao}
                                            onChange={(e) => setItemDescricao(e.target.value)}
                                            className="h-11 rounded-xl bg-white border-slate-200 text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="button"
                                        onClick={handleAddPrestacaoItem}
                                        className="h-10 px-4 bg-slate-900 hover:bg-indigo-600 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4" /> Adicionar Gasto
                                    </Button>
                                </div>
                            </div>

                            {/* Lista de gastos inseridos */}
                            {itensPrestacao.length > 0 ? (
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm text-xs">
                                    {/* Desktop View Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="py-2.5 px-3">Categoria</th>
                                                    <th className="py-2.5 px-3">Data</th>
                                                    <th className="py-2.5 px-3">Justificativa</th>
                                                    <th className="py-2.5 px-3 text-center">Qtd.</th>
                                                    <th className="py-2.5 px-3 text-right">Total</th>
                                                    <th className="py-2.5 px-3 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itensPrestacao.map((item, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50 font-semibold text-slate-600">
                                                        <td className="py-3 px-3 font-bold text-slate-900">{item.categoria}</td>
                                                        <td className="py-3 px-3">{formatDate(item.data)}</td>
                                                        <td className="py-3 px-3 max-w-[120px] truncate">{item.descricao}</td>
                                                        <td className="py-3 px-3 text-center">{item.quantidade}</td>
                                                        <td className="py-3 px-3 text-right font-bold text-slate-800">{formatCurrency(item.valorTotal)}</td>
                                                        <td className="py-3 px-3 text-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemovePrestacaoItem(idx)}
                                                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg active:scale-95"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile View Cards */}
                                    <div className="block md:hidden divide-y divide-slate-100">
                                        {itensPrestacao.map((item, idx) => (
                                            <div key={idx} className="p-4 flex items-center justify-between gap-3 bg-white">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{item.categoria}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{formatDate(item.data)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{item.descricao}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qtd: {item.quantidade} • Unit: {formatCurrency(item.valorUnitario)}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-xs font-black text-slate-800">{formatCurrency(item.valorTotal)}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemovePrestacaoItem(idx)}
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg active:scale-95 shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 border-t flex flex-col gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                        <div className="flex justify-between items-center">
                                            <span>Total Comprovado:</span>
                                            <span className="text-sm text-slate-900 font-black">{formatCurrency(totalComprovadoItens)}</span>
                                        </div>
                                        {selectedDespesa && (
                                            <div className="flex justify-between items-center pt-1 border-t border-dashed">
                                                <span>Saldo Restante:</span>
                                                {Number(selectedDespesa.valorSolicitado) - totalComprovadoItens === 0 ? (
                                                    <span className="text-green-600 font-black">Zerado</span>
                                                ) : Number(selectedDespesa.valorSolicitado) - totalComprovadoItens > 0 ? (
                                                    <span className="text-amber-600 font-black">Devolver {formatCurrency(Number(selectedDespesa.valorSolicitado) - totalComprovadoItens)}</span>
                                                ) : (
                                                    <span className="text-rose-600 font-black">Reembolsar {formatCurrency(Math.abs(Number(selectedDespesa.valorSolicitado) - totalComprovadoItens))}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="border-dashed border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/30">
                                    <Receipt className="h-8 w-8 text-slate-300 mb-2 animate-pulse" />
                                    <p className="text-xs font-bold text-slate-400 text-center">Nenhum gasto comprovado adicionado.</p>
                                </div>
                            )}
                        </div>

                        {/* Comprovantes */}
                        <div className="space-y-3 pt-2 border-t border-dashed">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="space-y-0.5">
                                    <Label className="font-bold text-slate-700 text-xs">Comprovantes & Notas Fiscais *</Label>
                                    <p className="text-[10px] text-slate-400">Anexe fotos/PDFs das notas e recibos correspondentes.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingComprovante}
                                    onClick={handleFileSimulate}
                                    className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[10px] gap-1.5 cursor-pointer"
                                >
                                    {uploadingComprovante ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <FileUp className="h-3.5 w-3.5 text-indigo-500" />
                                    )}
                                    Anexar Recibo
                                </Button>
                            </div>

                            {anexosPrestacao.length > 0 ? (
                                <div className="grid gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    {anexosPrestacao.map((file, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-emerald-500" />
                                                <span className="font-bold text-slate-800 truncate max-w-[200px]">{file.nomeOriginal}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
                                                <div className="relative w-32 shrink-0">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Valor"
                                                        value={file.valor || ""}
                                                        onChange={(e) => {
                                                            const updated = [...anexosPrestacao]
                                                            updated[idx].valor = parseFloat(e.target.value) || 0
                                                            setAnexosPrestacao(updated)
                                                        }}
                                                        className="pl-6 h-8 text-[11px] font-bold rounded-lg bg-slate-50 focus:bg-white"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setAnexosPrestacao(anexosPrestacao.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Remover
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="border-t border-slate-200/60 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-[11px]">
                                        <div className="font-bold text-slate-700 uppercase tracking-wider">
                                            Soma das Evidências Anexadas: <span className="text-slate-900 font-black text-xs ml-1">{formatCurrency(anexosPrestacao.reduce((acc, f) => acc + (f.valor || 0), 0))}</span>
                                        </div>
                                        
                                        {(() => {
                                            const totalEvid = anexosPrestacao.reduce((acc, f) => acc + (f.valor || 0), 0)
                                            const diff = Math.abs(totalEvid - totalComprovadoItens)
                                            if (diff < 0.01) {
                                                return (
                                                    <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-md border border-green-200 text-[9px] uppercase tracking-wider">
                                                        ✅ Bate com os itens!
                                                    </span>
                                                )
                                            } else {
                                                return (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-md border border-amber-200 text-[9px] uppercase tracking-wider">
                                                        ⚠️ Divergência: {formatCurrency(diff)}
                                                    </span>
                                                )
                                            }
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="border-dashed border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50">
                                    <FileUp className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-semibold text-slate-400">Pelo menos um recibo fiscal é obrigatório.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-5 sm:p-8 pt-4 border-t border-slate-100 gap-3 bg-slate-50/50 flex-none flex flex-col sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPrestacaoModalOpen(false)}
                            className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={submittingPrestacao || uploadingComprovante}
                            onClick={handlePrestarContasSubmit}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 cursor-pointer"
                        >
                            {submittingPrestacao ? (
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="h-4.5 w-4.5" />
                                    <span>Enviar Prestação</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <ReembolsoModal
                isOpen={isReembolsoOpen}
                onClose={() => setIsReembolsoOpen(false)}
                onSuccess={fetchDespesas}
                user={user}
            />

            <AdiantamentoModal
                isOpen={isAdiantamentoOpen}
                onClose={() => setIsAdiantamentoOpen(false)}
                onSuccess={fetchDespesas}
                user={user}
            />
        </div>
    )
}
