"use client"

import { useState, useEffect } from "react"
import { Wallet, Plus, Loader2, AlertCircle, Calendar, Receipt, DollarSign, FileUp, CheckCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"

interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    createdAt: string
    anexos: any[]
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

    useEffect(() => {
        fetchDespesas()
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
            'APROVADO': 'bg-green-100 text-green-800',
            'REPROVADO': 'bg-red-100 text-red-800',
            'PAGO': 'bg-teal-100 text-teal-800',
            'AGUARDANDO_PRESTACAO': 'bg-orange-100 text-orange-800',
            'CONCLUIDO': 'bg-blue-100 text-blue-800',
        }
        
        const labels: any = {
            'RASCUNHO': 'Rascunho',
            'AGUARDANDO_APROVACAO': 'Aguardando Aprovação',
            'APROVADO': 'Aprovado',
            'REPROVADO': 'Reprovado',
            'PAGO': 'Pago',
            'AGUARDANDO_PRESTACAO': 'Aguardando Prestação',
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
        setAnexosPrestacao([])
        setPrestacaoModalOpen(true)
    }

    const handlePrestarContasSubmit = async () => {
        if (!selectedDespesa) return
        if (!valorComprovado) {
            toast.error("Por favor, informe o valor real comprovado.")
            return
        }

        const valor = parseFloat(valorComprovado)
        if (isNaN(valor) || valor < 0) {
            toast.error("Valor comprovado inválido.")
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
                    valorComprovado: valor,
                    anexos: anexosPrestacao
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
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        Minhas <span className="text-primary italic">Despesas</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                        Acompanhe seus reembolsos e adiantamentos
                    </p>
                </div>
                {!loading && (
                    <Link href="/dashboard/despesas/nova" className="w-full lg:w-auto">
                        <Button className="w-full lg:w-auto h-14 px-8 bg-slate-900 hover:bg-primary shadow-xl hover:shadow-primary/20 text-white transition-all duration-500 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] group">
                            <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
                            Nova Solicitação
                        </Button>
                    </Link>
                )}
            </div>

            {/* Abas */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl max-w-md">
                {(["TODAS", "REEMBOLSO", "ADIANTAMENTO"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
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
                                <CardContent className="p-8">
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
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {item.id.slice(0, 6)}</span>
                                                </div>
                                                <p className="text-slate-600 text-sm font-semibold pt-1">{item.descricao}</p>
                                                
                                                {/* Valores adicionais de prestação */}
                                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-2">
                                                    <span className="text-slate-700">Solicitado: <span className="text-slate-900">R$ {Number(item.valorSolicitado).toFixed(2)}</span></span>
                                                    {item.valorComprovado !== null && (
                                                        <>
                                                            <div className="h-3 w-[1px] bg-slate-200" />
                                                            <span className="text-indigo-600">Gasto Real: <span>R$ {Number(item.valorComprovado).toFixed(2)}</span></span>
                                                        </>
                                                    )}
                                                    {item.saldoFinal !== null && (
                                                        <>
                                                            <div className="h-3 w-[1px] bg-slate-200" />
                                                            <span className={item.saldoFinal === 0 ? "text-green-600" : item.saldoFinal > 0 ? "text-amber-600" : "text-rose-600"}>
                                                                Saldo: {item.saldoFinal === 0 ? "Zerado" : item.saldoFinal > 0 ? `Devolver R$ ${Number(item.saldoFinal).toFixed(2)}` : `Receber R$ ${Math.abs(Number(item.saldoFinal)).toFixed(2)}`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">
                                            {getStatusBadge(item.status)}
                                            
                                            {item.status === 'RASCUNHO' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeletarDespesa(item.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold uppercase tracking-widest text-[10px] h-10 px-3 rounded-xl active:scale-95 transition-all"
                                                    >
                                                        Excluir
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEnviarParaAprovacao(item.id)}
                                                        className="bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl shadow-md active:scale-95 transition-all"
                                                    >
                                                        Enviar para Aprovação
                                                    </Button>
                                                </div>
                                            )}

                                            {item.status === 'AGUARDANDO_PRESTACAO' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openPrestacaoModal(item)}
                                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl shadow-md active:scale-95 transition-all"
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

            {/* Modal de Prestação de Contas (Simples, Customizado com Overlay) */}
            {prestacaoModalOpen && selectedDespesa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Prestação de Contas</h3>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider pt-0.5">Adiantamento ID: {selectedDespesa.id.slice(0, 6)}</p>
                            </div>
                            <button
                                onClick={() => setPrestacaoModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-black text-lg p-2 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-xs font-semibold text-orange-800 space-y-1">
                                <p>⚠️ **Valor Recebido Adiantado: R$ {Number(selectedDespesa.valorSolicitado).toFixed(2)}**</p>
                                <p>Por favor, informe a soma exata de todas as notas fiscais anexadas. O sistema calculará o reembolso complementar ou a devolução necessária automaticamente.</p>
                            </div>

                            {/* Valor Comprovado */}
                            <div className="space-y-2">
                                <Label htmlFor="valorComprovado" className="font-bold text-slate-700">Valor Real Gasto (R$) *</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                                    <Input
                                        id="valorComprovado"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={valorComprovado}
                                        onChange={(e) => setValorComprovado(e.target.value)}
                                        className="pl-12 h-12 rounded-xl border-slate-200 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Comprovantes */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="font-bold text-slate-700">Comprovantes & Recibos *</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploadingComprovante}
                                        onClick={handleFileSimulate}
                                        className="h-10 px-4 rounded-lg font-bold uppercase tracking-wider text-[9px] gap-1.5"
                                    >
                                        {uploadingComprovante ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <FileUp className="h-3 w-3 text-primary" />
                                        )}
                                        Anexar Recibo
                                    </Button>
                                </div>

                                {anexosPrestacao.length > 0 ? (
                                    <div className="grid gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {anexosPrestacao.map((file, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-emerald-500" />
                                                    <span className="font-bold text-slate-800 truncate max-w-[200px]">{file.nomeOriginal}</span>
                                                </div>
                                                <button
                                                    onClick={() => setAnexosPrestacao(anexosPrestacao.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 font-bold"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="border-dashed border-2 border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50">
                                        <FileUp className="h-8 w-8 text-slate-300 mb-2" />
                                        <p className="text-xs font-semibold text-slate-400">Pelo menos um recibo fiscal é obrigatório.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPrestacaoModalOpen(false)}
                                className="h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={submittingPrestacao || uploadingComprovante}
                                onClick={handlePrestarContasSubmit}
                                className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-wider text-[10px] gap-1.5"
                            >
                                {submittingPrestacao ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Enviar Prestação</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
